import asyncio
import base64
import io
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import unquote
from uuid import uuid4
from unittest.mock import patch

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.testclient import TestClient
from starlette.datastructures import Headers

from app.api import uploads
from app.core.deps import get_current_user
from app.main import PublicUploadFiles


PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
MP4 = b'\x00\x00\x00\x18ftypisom\x00\x00\x02\x00isomiso2'
WEBM = b'\x1aE\xdf\xa3\x87\x42\x82\x84webm'


class UploadTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        for name, value in {
            'UPLOAD_DIR': self.temp.name,
            'MAX_IMAGE_UPLOAD_SIZE': 128,
            'MAX_FILE_UPLOAD_SIZE': 32,
            'MAX_VIDEO_UPLOAD_SIZE': 64,
        }.items():
            self.addCleanup(setattr, uploads.settings, name, getattr(uploads.settings, name))
            setattr(uploads.settings, name, value)
        self.app = FastAPI()
        self.app.include_router(uploads.router)
        self.client = TestClient(self.app)
        self.addCleanup(self.client.close)

    def send(self, kind='file', name='notes.pdf', data=b'attachment', mime=None):
        return self.client.post(f'/upload/{kind}', files={'file': (name, data, mime)})

    def login(self, admin=True):
        self.app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(is_admin=admin)

    def test_permissions_and_limits(self):
        for kind, name, content in [('file', 'a.pdf', b'x'), ('image', 'a.png', PNG), ('video', 'a.mp4', MP4)]:
            self.assertEqual(self.send(kind, name, content).status_code, 403)
        self.assertEqual(self.client.get('/upload/limits').status_code, 403)
        self.login(admin=False)
        self.assertEqual(self.send().status_code, 403)
        self.assertEqual(self.send('video', 'a.mp4', MP4).status_code, 403)
        self.assertEqual(self.send('image', 'a.png', PNG).status_code, 200)
        self.assertEqual(self.client.get('/upload/limits').json(), {
            'image': 128, 'file': 32, 'video': 64, 'avatar': 10 * 1024 * 1024,
        })

    def test_media_validation_and_file_download_compatibility(self):
        self.login()
        invalid = [
            ('file', 'script.html', b'x', None, 400),
            ('file', 'script.svg', b'x', None, 400),
            ('file', 'run.exe', b'x', None, 400),
            ('file', 'empty.pdf', b'', None, 400),
            ('file', 'large.pdf', b'x' * 33, None, 413),
            ('image', 'script.svg', b'<svg/>', 'image/svg+xml', 400),
            ('image', 'script.png', b'<html/>', 'image/png', 400),
            ('image', 'photo.jpg', PNG, 'image/jpeg', 400),
            ('image', 'photo.png', PNG, 'text/html', 400),
            ('image', 'empty.png', b'', 'image/png', 400),
            ('image', 'large.png', PNG + b'x' * 128, 'image/png', 413),
            ('video', 'clip.mp4', b'not a video', 'video/mp4', 400),
            ('video', 'clip.webm', MP4, 'video/webm', 400),
            ('video', 'clip.mp4', MP4, 'text/html', 400),
            ('video', 'clip.mp4', MP4 + b'x' * 65, 'video/mp4', 413),
        ]
        for kind, name, data, mime, code in invalid:
            with self.subTest(name=name, mime=mime, data=data[:12]):
                self.assertEqual(self.send(kind, name, data, mime).status_code, code)
        self.assertFalse(any(path.is_file() for path in Path(self.temp.name).rglob('*')))

        for kind, name, data, mime in [
            ('image', '../中文图片.PNG', PNG, 'image/png'),
            ('video', 'clip.mp4', MP4, 'video/mp4'),
            ('video', 'clip.webm', WEBM, 'video/webm'),
        ]:
            result = self.send(kind, name, data, mime)
            self.assertEqual(result.status_code, 200, result.text)
            payload = result.json()
            self.assertEqual(set(payload), {'url', 'name', 'size', 'type'})
            self.assertEqual(payload['type'], mime)
            self.assertEqual(payload['size'], len(data))
            self.assertEqual((Path(self.temp.name) / payload['url'].split('/')[-1]).read_bytes(), data)

        responses = [self.send(name='../中文资料 [1].PDF', data=b'x' * 32), self.send(name='中文资料 [1].PDF')]
        for response in responses:
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['name'], '中文资料 [1].PDF')
        self.assertNotEqual(responses[0].json()['url'], responses[1].json()['url'])
        self.app.dependency_overrides.clear()
        download = self.client.get(responses[0].json()['url'].removeprefix('/api'))
        self.assertEqual(download.status_code, 200)
        self.assertEqual(download.content, b'x' * 32)
        self.assertEqual(download.headers['content-type'], 'application/octet-stream')
        self.assertEqual(download.headers['x-content-type-options'], 'nosniff')
        self.assertIn('attachment;', download.headers['content-disposition'])
        self.assertIn('中文资料 [1].PDF', unquote(download.headers['content-disposition']))
        self.assertEqual(self.client.get(f'/upload/files/{uuid4()}/missing.pdf').status_code, 404)
        self.assertEqual(self.client.get('/upload/files/not-a-uuid/notes.pdf').status_code, 422)

    def test_bounded_copy_and_cleanup_on_limit_disconnect_and_cancel(self):
        class Connection:
            def __init__(self, failure=None):
                self.calls = 0
                self.failure = failure

            async def is_disconnected(self):
                self.calls += 1
                if self.calls == 2 and self.failure == 'cancel':
                    raise asyncio.CancelledError()
                return self.calls == 2 and self.failure == 'disconnect'

        class BoundedFile(UploadFile):
            async def read(self, size=-1):
                self.asserted_sizes.append(size)
                if size <= 0 or size > 8:
                    raise AssertionError('Unbounded upload read')
                return await super().read(size)

        def run(data, connection):
            file = BoundedFile(io.BytesIO(data), filename='notes.pdf', headers=Headers({'content-type': 'application/pdf'}))
            file.asserted_sizes = []
            try:
                return asyncio.run(uploads.save_upload(file, connection, 'file'))
            finally:
                self.assertTrue(file.file.closed)
                self.assertGreater(len(file.asserted_sizes), 1)

        with patch.object(uploads, 'CHUNK_SIZE', 8):
            for reason, data, expected in [
                (None, b'x' * 33, 413), ('disconnect', b'x' * 24, 499), ('cancel', b'x' * 24, None),
            ]:
                with self.subTest(reason=reason):
                    if expected:
                        with self.assertRaises(HTTPException) as error:
                            run(data, Connection(reason))
                        self.assertEqual(error.exception.status_code, expected)
                    else:
                        with self.assertRaises(asyncio.CancelledError):
                            run(data, Connection(reason))
                    self.assertFalse(any(path.is_file() for path in Path(self.temp.name).rglob('*')))
            payload = run(b'x' * 32, Connection())
            self.assertEqual(payload['size'], 32)
            self.assertEqual(len(list((Path(self.temp.name) / 'attachments').iterdir())), 1)

    def test_public_media_ranges_and_attachment_static_bypass_are_blocked(self):
        directory = Path(self.temp.name)
        (directory / 'attachments').mkdir()
        (directory / 'attachments' / str(uuid4())).write_bytes(b'private download body')
        (directory / '.clip.mp4.part').write_bytes(b'incomplete')
        (directory / 'photo.png').write_bytes(PNG)
        (directory / 'clip.mp4').write_bytes(b'0123456789abcdef')
        self.app.mount('/uploads', PublicUploadFiles(directory=directory), name='uploads')
        proxy = FastAPI()
        proxy.mount('/api', self.app)
        with TestClient(proxy) as proxied_client:
            # Both a direct backend URL and the /api proxy prefix reach the same mount.
            for prefix, client in [('', self.client), ('/api', proxied_client)]:
                attachment = next((directory / 'attachments').iterdir())
                self.assertEqual(client.get(f'{prefix}/uploads/attachments/{attachment.name}').status_code, 404)
                self.assertEqual(client.get(f'{prefix}/uploads/.clip.mp4.part').status_code, 404)
                photo = client.get(f'{prefix}/uploads/photo.png')
                self.assertEqual(photo.status_code, 200)
                self.assertEqual(photo.content, PNG)
                video = client.get(f'{prefix}/uploads/clip.mp4', headers={'Range': 'bytes=0-7'})
                self.assertEqual(video.status_code, 206)
                self.assertEqual(video.content, b'01234567')
                self.assertEqual(video.headers['content-range'], 'bytes 0-7/16')
                self.assertEqual(video.headers['x-content-type-options'], 'nosniff')


if __name__ == '__main__':
    unittest.main()
