import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api, { getErrorDetail } from '../services/api.js';

export const DEFAULT_UPLOAD_LIMITS = { image: 20 * 1024 ** 2, video: 200 * 1024 ** 2, file: 50 * 1024 ** 2 };
const pendingStatuses = new Set(['queued', 'preparing', 'uploading']);
const maxPhotoSourceSize = 60 * 1024 ** 2;
const maxPhotoPixels = 80 * 1000 ** 2;
const imageTypes = {
  '.jpg': ['image/jpeg', 'image/jpg', 'image/pjpeg'], '.jpeg': ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  '.png': ['image/png'], '.gif': ['image/gif'], '.webp': ['image/webp'], '.bmp': ['image/bmp', 'image/x-ms-bmp'],
};
const videoTypes = { '.mp4': ['video/mp4'], '.webm': ['video/webm'] };
const attachmentTypes = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.csv', '.json', '.zip', '.rar', '.7z', '.tar', '.gz']);
const extensionOf = (file) => /\.[^.\\/]+$/.exec(file.name)?.[0].toLowerCase() || '';
const canOptimizePhoto = (file) => ['.jpg', '.jpeg', '.webp'].includes(extensionOf(file));

// Keep file requests bounded even when a video occupies one of the slots.
export function nextUploadTasks(tasks, active = []) {
  const activeIds = new Set(active.map((task) => task.id));
  let available = Math.max(0, 3 - active.length);
  let videoActive = active.some((task) => task.type === 'video');
  return tasks.filter((task) => {
    if (!available || task.status !== 'queued' || activeIds.has(task.id)) return false;
    if (task.type === 'video' && videoActive) return false;
    available -= 1;
    if (task.type === 'video') videoActive = true;
    return true;
  });
}

export function uploadKind(file) {
  if (file.type?.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|bmp|heic|heif)$/i.test(file.name)) return 'image';
  if (file.type?.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi)$/i.test(file.name)) return 'video';
  return 'file';
}

export function uploadValidationError(file, limits = DEFAULT_UPLOAD_LIMITS, preserveOriginal = false, chinese = false) {
  const kind = uploadKind(file);
  const extension = extensionOf(file);
  const allowed = kind === 'image' ? imageTypes : videoTypes;
  const supported = kind === 'file' ? attachmentTypes.has(extension) : Object.hasOwn(allowed, extension);
  if (!supported) {
    if (kind === 'image') return chinese ? '不支持此图片格式，请使用 JPG、PNG、GIF、WebP 或 BMP。' : 'Unsupported image format. Use JPG, PNG, GIF, WebP or BMP.';
    if (kind === 'video') return chinese ? '不支持此视频格式，请先转换为 MP4 或 WebM。' : 'Unsupported video format. Convert it to MP4 or WebM first.';
    return chinese ? '不支持此附件格式，请选择文档或压缩文件。' : 'Unsupported attachment format. Choose a document or archive.';
  }
  const mime = (file.type || '').split(';', 1)[0].trim().toLowerCase();
  if (kind !== 'file' && !['', 'application/octet-stream'].includes(mime) && !allowed[extension].includes(mime)) {
    return chinese ? '文件类型与扩展名不一致，请重新导出文件。' : 'The file type does not match its extension. Export the file again.';
  }
  if (!file.size) return chinese ? '不能上传空文件。' : 'Empty files cannot be uploaded.';
  const optimize = kind === 'image' && !preserveOriginal && canOptimizePhoto(file);
  const limit = optimize ? maxPhotoSourceSize : limits[kind];
  if (file.size > limit) {
    if (optimize) return chinese ? '待优化图片原文件不能超过 60 MB，请先缩小图片。' : 'Photos to optimize must be 60 MB or smaller. Resize the original first.';
    return chinese ? `文件超过 ${Math.round(limit / 1024 ** 2)} MB 上限。` : `File exceeds the ${Math.round(limit / 1024 ** 2)} MB limit.`;
  }
  return '';
}

// Read dimensions before decoding so a small compressed file cannot allocate an enormous bitmap.
export function photoDimensions(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let position = 2;
    while (position + 3 < bytes.length) {
      if (bytes[position++] !== 0xff) return null;
      while (bytes[position] === 0xff) position += 1;
      const marker = bytes[position++];
      if (marker === 0xd9 || marker === 0xda) return null;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
      if (position + 2 > bytes.length) return null;
      const length = view.getUint16(position);
      if (length < 2 || position + length > bytes.length) return null;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (length < 7) return null;
        return { width: view.getUint16(position + 5), height: view.getUint16(position + 3), animated: false };
      }
      position += length;
    }
  }
  if (bytes.length >= 30 && view.getUint32(0) === 0x52494646 && view.getUint32(8) === 0x57454250) {
    const chunk = view.getUint32(12);
    if (chunk === 0x56503858) {
      const uint24 = (offset) => bytes[offset] | bytes[offset + 1] << 8 | bytes[offset + 2] << 16;
      return { width: uint24(24) + 1, height: uint24(27) + 1, animated: Boolean(bytes[20] & 2) };
    }
    if (chunk === 0x5650384c && bytes[20] === 0x2f) {
      return { width: 1 + (bytes[21] | (bytes[22] & 0x3f) << 8), height: 1 + ((bytes[22] >> 6) | bytes[23] << 2 | (bytes[24] & 0xf) << 10), animated: false };
    }
    if (chunk === 0x56503820 && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) {
      return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff, animated: false };
    }
  }
  return null;
}

export async function preparePhoto(file, preserveOriginal, signal, chinese) {
  if (preserveOriginal || !canOptimizePhoto(file)) return file;
  const pixelError = () => new Error(chinese ? '图片超过 8000 万像素，请先缩小原图。' : 'This photo exceeds 80 megapixels. Resize the original first.');
  const dimensions = photoDimensions(await file.arrayBuffer());
  if (signal.aborted) return file;
  if (dimensions && dimensions.width * dimensions.height > maxPhotoPixels) throw pixelError();
  if (dimensions?.animated || typeof createImageBitmap !== 'function') return file;
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { return file; }
  try {
    if (signal.aborted) return file;
    if (bitmap.width * bitmap.height > maxPhotoPixels) throw pixelError();
    const ratio = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    if (ratio === 1 && file.size <= 2 * 1024 ** 2) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const outputType = extensionOf(file) === '.webp' ? 'image/webp' : 'image/jpeg';
    let blob;
    try { blob = await new Promise((resolve) => canvas.toBlob(resolve, outputType, 0.86)); } catch { return file; }
    if (!blob || blob.type !== outputType || blob.size >= file.size || signal.aborted) return file;
    return new File([blob], file.name, { type: outputType, lastModified: file.lastModified });
  } finally {
    bitmap?.close();
  }
}

export default function useEditorUploads({ onInsert, onUploaded, onRemoved, onUploadingChange } = {}) {
  const { i18n } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [limits, setLimits] = useState(DEFAULT_UPLOAD_LIMITS);
  const [preserveOriginal, setPreserveOriginal] = useState(false);
  const tasksRef = useRef([]);
  const limitsRef = useRef(limits);
  const activeRef = useRef(new Map());
  const mountedRef = useRef(true);
  const callbacksRef = useRef({});
  const languageRef = useRef(i18n.resolvedLanguage || i18n.language);
  callbacksRef.current = { onInsert, onUploaded, onRemoved, onUploadingChange };
  languageRef.current = i18n.resolvedLanguage || i18n.language;

  const syncTasks = useCallback((update) => {
    const next = update(tasksRef.current);
    tasksRef.current = next;
    if (mountedRef.current) {
      setTasks(next);
      callbacksRef.current.onUploadingChange?.(next.some((task) => task.status !== 'succeeded'));
    }
    return next;
  }, []);

  const updateTask = useCallback((id, changes) => {
    syncTasks((current) => current.map((task) => task.id === id ? { ...task, ...changes } : task));
  }, [syncTasks]);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    api.get('/upload/limits', { signal: controller.signal }).then(({ data }) => {
      if (!mountedRef.current || controller.signal.aborted) return;
      const next = { ...DEFAULT_UPLOAD_LIMITS };
      for (const type of Object.keys(next)) {
        if (Number.isFinite(data[type]) && data[type] > 0) next[type] = data[type];
      }
      limitsRef.current = next;
      setLimits(next);
    }).catch(() => { /* Local defaults remain usable if limits cannot be fetched. */ });
    return () => {
      mountedRef.current = false;
      controller.abort();
      activeRef.current.forEach(({ controller: uploadController }) => uploadController.abort());
      activeRef.current.clear();
      tasksRef.current.forEach((task) => {
        if (task.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(task.previewUrl);
      });
    };
  }, []);

  useEffect(() => {
    onUploadingChange?.(tasks.some((task) => task.status !== 'succeeded'));
  }, [tasks, onUploadingChange]);

  const runUpload = useCallback(async (task, controller) => {
    const isCurrent = () => mountedRef.current && !controller.signal.aborted && tasksRef.current.some((item) => item.id === task.id);
    const chinese = languageRef.current?.startsWith('zh');
    try {
      updateTask(task.id, { status: 'preparing', progress: 0, error: '' });
      const limit = limitsRef.current[task.type];
      const validationError = uploadValidationError(task.file, limitsRef.current, task.preserveOriginal, chinese);
      if (validationError) throw new Error(validationError);
      const file = task.type === 'image' ? await preparePhoto(task.file, task.preserveOriginal, controller.signal, chinese) : task.file;
      if (!isCurrent()) return;
      if (file.size > limit) throw new Error(chinese ? `图片处理后仍超过 ${Math.round(limit / 1024 ** 2)} MB，请先缩小原图后重新选择。` : `The prepared image still exceeds ${Math.round(limit / 1024 ** 2)} MB. Resize the original and select it again.`);
      updateTask(task.id, { status: 'uploading', uploadSize: file.size });
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post(`/upload/${task.type}`, form, {
        timeout: 600000,
        signal: controller.signal,
        onUploadProgress: ({ loaded, total }) => {
          if (isCurrent()) updateTask(task.id, { progress: Math.min(99, Math.round(loaded / (total || file.size) * 100)) });
        },
      });
      if (!isCurrent()) return;
      if (!data.url || /^(blob:|data:|javascript:)/i.test(data.url)) throw new Error(chinese ? '服务器没有返回有效文件地址。' : 'The server did not return a valid file URL.');
      const current = tasksRef.current.find((item) => item.id === task.id);
      callbacksRef.current.onUploaded?.(current, data);
      updateTask(task.id, { status: 'succeeded', progress: 100, result: data, file: null, previewUrl: task.type === 'file' ? '' : data.url });
      if (current.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(current.previewUrl);
    } catch (error) {
      if (!isCurrent()) return;
      const fallback = ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code)
        ? (chinese ? '上传超时，请重试。重试将重新上传此文件。' : 'Upload timed out. Retry to upload this file again.')
        : error.message || (chinese ? '上传失败，请重试。' : 'Upload failed. Please retry.');
      updateTask(task.id, { status: 'failed', error: getErrorDetail(error, fallback) });
    } finally {
      if (activeRef.current.get(task.id)?.controller === controller) activeRef.current.delete(task.id);
      if (mountedRef.current) syncTasks((current) => [...current]);
    }
  }, [syncTasks, updateTask]);

  useEffect(() => {
    const next = nextUploadTasks(tasksRef.current, [...activeRef.current.values()]);
    next.forEach((task) => {
      const controller = new AbortController();
      activeRef.current.set(task.id, { id: task.id, type: task.type, controller });
      void runUpload(task, controller);
    });
  }, [tasks, runUpload]);

  const enqueue = useCallback((files, position) => {
    const added = Array.from(files || []).map((file) => {
      const type = uploadKind(file);
      const error = uploadValidationError(file, limitsRef.current, preserveOriginal, languageRef.current?.startsWith('zh'));
      return {
        id: globalThis.crypto?.randomUUID?.() || `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name, type, file,
        previewUrl: type === 'file' || error ? '' : URL.createObjectURL(file),
        size: file.size, progress: 0, status: error ? 'failed' : 'queued', error, preserveOriginal,
      };
    });
    if (!added.length) return [];
    try {
      callbacksRef.current.onInsert?.(added, position);
    } catch (error) {
      added.forEach((task) => { if (task.previewUrl) URL.revokeObjectURL(task.previewUrl); });
      throw error;
    }
    syncTasks((current) => [...current, ...added]);
    return added;
  }, [preserveOriginal, syncTasks]);

  const retry = useCallback((id) => {
    const task = tasksRef.current.find((item) => item.id === id);
    if (!task || !['failed', 'cancelled'].includes(task.status)) return;
    const error = uploadValidationError(task.file, limitsRef.current, preserveOriginal, languageRef.current?.startsWith('zh'));
    updateTask(id, { status: error ? 'failed' : 'queued', progress: 0, error, preserveOriginal });
  }, [preserveOriginal, updateTask]);

  const cancel = useCallback((id) => {
    const task = tasksRef.current.find((item) => item.id === id);
    if (!task || !pendingStatuses.has(task.status)) return;
    activeRef.current.get(id)?.controller.abort();
    updateTask(id, { status: 'cancelled', error: '' });
  }, [updateTask]);

  const remove = useCallback((id) => {
    const task = tasksRef.current.find((item) => item.id === id);
    if (!task) return;
    activeRef.current.get(id)?.controller.abort();
    callbacksRef.current.onRemoved?.(task);
    syncTasks((current) => current.filter((item) => item.id !== id));
    if (task.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(task.previewUrl);
  }, [syncTasks]);

  return {
    tasks, enqueue, retry, cancel, remove, preserveOriginal, setPreserveOriginal, limits,
    hasPendingUploads: tasks.some((task) => pendingStatuses.has(task.status)),
    hasUnresolvedUploads: tasks.some((task) => ['failed', 'cancelled'].includes(task.status)),
  };
}
