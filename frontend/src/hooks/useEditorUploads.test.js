import assert from 'node:assert/strict';
import test from 'node:test';
import { nextUploadTasks, photoDimensions, preparePhoto, uploadKind, uploadValidationError } from './useEditorUploads.js';

const task = (id, type = 'image', status = 'queued') => ({ id, type, status });

test('queue starts at most three files and one video without starving later images', () => {
  const tasks = [task('video-1', 'video'), task('video-2', 'video'), task('image-1'), task('file-1', 'file')];
  assert.deepEqual(nextUploadTasks(tasks).map(({ id }) => id), ['video-1', 'image-1', 'file-1']);
  assert.deepEqual(nextUploadTasks(tasks, [task('video-active', 'video'), task('image-active')]).map(({ id }) => id), ['image-1']);
  assert.equal(nextUploadTasks(tasks, [task('a'), task('b'), task('c')]).length, 0);
});

test('failed, cancelled and complete tasks never occupy or restart a queue slot', () => {
  const tasks = [task('failed', 'video', 'failed'), task('cancelled', 'image', 'cancelled'), task('done', 'file', 'succeeded'), task('ready', 'video')];
  assert.deepEqual(nextUploadTasks(tasks).map(({ id }) => id), ['ready']);
  assert.deepEqual(nextUploadTasks([task('a'), task('b')], [task('a')]).map(({ id }) => id), ['b']);
});

test('queue preserves input order when it selects independent upload work', () => {
  const tasks = [task('a'), task('b'), task('c'), task('d')];
  assert.deepEqual(nextUploadTasks(tasks).map(({ id }) => id), ['a', 'b', 'c']);
  assert.deepEqual(tasks.map(({ id }) => id), ['a', 'b', 'c', 'd']);
});

test('file classification handles browser MIME values and missing MIME metadata', () => {
  assert.equal(uploadKind({ name: 'photo.JPG', type: '' }), 'image');
  assert.equal(uploadKind({ name: 'movie.mp4', type: '' }), 'video');
  assert.equal(uploadKind({ name: 'notes.pdf', type: 'application/pdf' }), 'file');
  assert.equal(uploadKind({ name: 'capture', type: 'image/png' }), 'image');
});

test('large JPEG/WebP sources can be optimized while originals and PNG/GIF keep the upload cap', () => {
  const file = { name: 'photo.jpg', type: 'image/jpeg', size: 30 * 1024 ** 2 };
  assert.equal(uploadValidationError(file), '');
  assert.match(uploadValidationError(file, undefined, true), /20 MB/);
  assert.match(uploadValidationError({ ...file, size: 61 * 1024 ** 2 }), /60 MB/);
  assert.match(uploadValidationError({ ...file, name: 'transparent.png', type: 'image/png' }), /20 MB/);
  assert.match(uploadValidationError({ ...file, name: 'animated.gif', type: 'image/gif' }), /20 MB/);
  assert.equal(uploadValidationError({ ...file, name: 'photo.webp', type: 'image/webp' }), '');
});

test('formats and MIME values match the backend allowlist before a request is sent', () => {
  for (const [name, type] of [['x.jpg', 'image/pjpeg'], ['x.png', 'image/png'], ['x.gif', 'image/gif'], ['x.webp', 'image/webp'], ['x.bmp', 'image/x-ms-bmp'], ['x.mp4', 'video/mp4'], ['x.webm', 'video/webm'], ['x.pdf', 'application/pdf']]) {
    assert.equal(uploadValidationError({ name, type, size: 100 }), '', name);
  }
  for (const [name, type] of [['x.avif', 'image/avif'], ['x.heic', 'image/heic'], ['x.mov', 'video/quicktime'], ['x.svg', 'image/svg+xml'], ['x.exe', 'application/octet-stream']]) {
    assert.match(uploadValidationError({ name, type, size: 100 }), /Unsupported/, name);
  }
  assert.match(uploadValidationError({ name: 'x.jpg', type: 'image/png', size: 100 }), /does not match/);
  assert.match(uploadValidationError({ name: 'x.pdf', type: '', size: 0 }), /Empty/);
});

test('JPEG frame dimensions are found after metadata, before decoding the image', () => {
  const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc2, 0, 8, 8, 0x27, 0x10, 0x23, 0x28, 1]);
  assert.deepEqual(photoDimensions(bytes.buffer), { width: 9000, height: 10000, animated: false });
  assert.equal(photoDimensions(bytes.slice(0, 12).buffer), null);
  assert.equal(photoDimensions(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 1]).buffer), null);
});

test('oversized image dimensions fail before browser bitmap decoding', async () => {
  const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xc0, 0, 8, 8, 0x27, 0x10, 0x23, 0x28, 1]);
  const file = new File([bytes], 'large.jpg', { type: 'image/jpeg' });
  await assert.rejects(preparePhoto(file, false, new AbortController().signal, false), /80 megapixels/);
});

test('WebP dimensions retain the animated flag and handle lossless and lossy frames', () => {
  const bytes = new Uint8Array(30);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x52494646);
  view.setUint32(8, 0x57454250);
  view.setUint32(12, 0x56503858);
  bytes[20] = 2;
  bytes[24] = 255;
  bytes[27] = 127;
  assert.deepEqual(photoDimensions(bytes.buffer), { width: 256, height: 128, animated: true });
  view.setUint32(12, 0x5650384c);
  bytes.fill(0, 20);
  bytes[20] = 0x2f;
  bytes[21] = 255;
  bytes[23] = 32;
  assert.deepEqual(photoDimensions(bytes.buffer), { width: 256, height: 129, animated: false });
  view.setUint32(12, 0x56503820);
  bytes[23] = 0x9d;
  bytes[24] = 1;
  bytes[25] = 0x2a;
  view.setUint16(26, 640, true);
  view.setUint16(28, 480, true);
  assert.deepEqual(photoDimensions(bytes.buffer), { width: 640, height: 480, animated: false });
});
