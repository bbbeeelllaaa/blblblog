import { useTranslation } from 'react-i18next';
import './editor-uploads.css';

const messages = {
  zh: {
    title: '上传任务', original: '保留图片原图', optimize: '关闭时自动缩小较大的 JPEG/WebP；PNG 和 GIF 保留原图。',
    queued: '排队中', preparing: '准备文件', uploading: '上传中', succeeded: '已完成', failed: '上传失败', cancelled: '已取消',
    cancel: '取消', retry: '重试', remove: '移除', waiting: '文件上传时可以继续编辑。失败或取消的文件需重试或移除后才能发布。',
    smaller: '已优化',
  },
  en: {
    title: 'Uploads', original: 'Keep original images', optimize: 'Otherwise, large JPEG/WebP photos are resized. PNG and GIF files stay unchanged.',
    queued: 'Queued', preparing: 'Preparing', uploading: 'Uploading', succeeded: 'Complete', failed: 'Failed', cancelled: 'Cancelled',
    cancel: 'Cancel', retry: 'Retry', remove: 'Remove', waiting: 'Keep writing during uploads. Retry or remove failed and cancelled files before publishing.',
    smaller: 'Optimized',
  },
};

function fileSize(bytes) {
  return bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function EditorUploads({ tasks = [], retry, cancel, remove, preserveOriginal, setPreserveOriginal }) {
  const { i18n } = useTranslation();
  const text = messages[(i18n.resolvedLanguage || i18n.language)?.startsWith('zh') ? 'zh' : 'en'];
  return (
    <div className="editor-uploads">
      <label className="editor-uploads-original" title={text.optimize}>
        <input type="checkbox" checked={Boolean(preserveOriginal)} onChange={(event) => setPreserveOriginal?.(event.target.checked)} />
        <span>{text.original}</span>
      </label>
      {tasks.length > 0 && (
        <section aria-label={text.title} className="editor-uploads-list">
          <p className="editor-uploads-hint">{text.waiting}</p>
          {tasks.map((task) => {
            const pending = ['queued', 'preparing', 'uploading'].includes(task.status);
            const unresolved = ['failed', 'cancelled'].includes(task.status);
            return (
              <div key={task.id} className={`editor-upload-row editor-upload-${task.status}`}>
                <div className="editor-upload-preview" aria-hidden="true">
                  {task.type === 'image' && task.previewUrl ? <img src={task.previewUrl} alt="" /> : <span>{task.type === 'video' ? '▶' : '↗'}</span>}
                </div>
                <div className="editor-upload-info">
                  <div className="editor-upload-name" title={task.name}>{task.name}</div>
                  <div className="editor-upload-meta" role="status">
                    {text[task.status]}{task.status === 'uploading' ? ` ${task.progress}%` : ''} · {fileSize(task.uploadSize || task.size)}
                    {task.uploadSize < task.size ? ` · ${text.smaller}` : ''}
                  </div>
                  {task.status === 'uploading' && <progress max="100" value={task.progress} aria-label={`${task.name} ${text.uploading}`} />}
                  {task.error && <p className="editor-upload-error" role="alert">{task.error}</p>}
                </div>
                <div className="editor-upload-actions">
                  {pending && <button type="button" onClick={() => cancel(task.id)} aria-label={`${text.cancel} ${task.name}`}>{text.cancel}</button>}
                  {unresolved && <>
                    <button type="button" onClick={() => retry(task.id)} aria-label={`${text.retry} ${task.name}`}>{text.retry}</button>
                    <button type="button" onClick={() => remove(task.id)} aria-label={`${text.remove} ${task.name}`}>{text.remove}</button>
                  </>}
                  {task.status === 'succeeded' && <span aria-label={text.succeeded}>✓</span>}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
