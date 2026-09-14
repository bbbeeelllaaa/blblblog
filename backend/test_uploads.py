import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import unquote
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import uploads
from app.core.deps import get_current_user


class AttachmentTests(unittest.TestCase):
    def test_upload_permissions_validation_and_public_download(self):
        app = FastAPI()
        app.include_router(uploads.router)
        original_dir = uploads.settings.UPLOAD_DIR
        original_limit = uploads.settings.MAX_UPLOAD_SIZE
        with tempfile.TemporaryDirectory() as directory, TestClient(app) as client:
            uploads.settings.UPLOAD_DIR = directory
            uploads.settings.MAX_UPLOAD_SIZE = 32
            self.addCleanup(setattr, uploads.settings, 'UPLOAD_DIR', original_dir)
            self.addCleanup(setattr, uploads.settings, 'MAX_UPLOAD_SIZE', original_limit)

            def send(name='notes.pdf', data=b'attachment'):
                return client.post('/upload/file', files={'file': (name, data)})

            self.assertEqual(send().status_code, 403)
            app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(is_admin=False)
            self.assertEqual(send().status_code, 403)
            app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(is_admin=True)

            for name, data in [('script.html', b'x'), ('script.svg', b'x'), ('run.exe', b'x'),
                               ('empty.pdf', b''), ('large.pdf', b'x' * 33)]:
                with self.subTest(name=name):
                    self.assertEqual(send(name, data).status_code, 400)
            self.assertEqual(list(Path(directory).iterdir()), [])

            responses = [send('../中文资料 [1].PDF', b'x' * 32), send('中文资料 [1].PDF')]
            for response in responses:
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()['name'], '中文资料 [1].PDF')
            self.assertNotEqual(responses[0].json()['url'], responses[1].json()['url'])

            app.dependency_overrides.clear()
            download = client.get(responses[0].json()['url'].removeprefix('/api'))
            self.assertEqual(download.status_code, 200)
            self.assertEqual(download.content, b'x' * 32)
            self.assertEqual(download.headers['content-type'], 'application/octet-stream')
            self.assertEqual(download.headers['x-content-type-options'], 'nosniff')
            self.assertIn('attachment;', download.headers['content-disposition'])
            self.assertIn('中文资料 [1].PDF', unquote(download.headers['content-disposition']))
            self.assertEqual(client.get(f'/upload/files/{uuid4()}/missing.pdf').status_code, 404)
            self.assertEqual(client.get('/upload/files/not-a-uuid/notes.pdf').status_code, 422)


if __name__ == '__main__':
    unittest.main()
