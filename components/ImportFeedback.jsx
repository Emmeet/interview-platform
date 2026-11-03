export default function ImportFeedback({ feedback, onDismiss }) {
  if (!feedback) return null;

  const details = Array.isArray(feedback.details) ? feedback.details : [];
  return (
    <section
      className={`msg show import-feedback ${feedback.type || 'error'}`}
      role={feedback.type === 'error' ? 'alert' : 'status'}
      aria-label="导入结果"
    >
      <div className="import-feedback-heading">
        <strong>{feedback.title || '导入结果'}</strong>
        {onDismiss ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss} aria-label="关闭导入结果">
            关闭
          </button>
        ) : null}
      </div>
      {feedback.fileName || feedback.sheetName ? (
        <p className="import-feedback-meta">
          {feedback.fileName ? `文件：${feedback.fileName}` : ''}
          {feedback.sheetName ? ` · 工作表：${feedback.sheetName}` : ''}
        </p>
      ) : null}
      <p>{feedback.message}</p>
      {details.length ? (
        <details open>
          <summary>详细原因（{details.length} 项）</summary>
          <pre>{details.map((detail) => {
            if (typeof detail === 'string') return detail;
            const message = detail.message || '';
            const prefix = detail.row && !/^Excel\s*第\s*\d+\s*行/.test(message) ? `Excel 第 ${detail.row} 行：` : '';
            return prefix + message;
          }).join('\n')}</pre>
        </details>
      ) : null}
    </section>
  );
}
