import { DeleteIcon } from './Icons'

const ContentItem = ({ item, onCopy, onDelete, onDownload, escapeHtml, formatFileSize }) => {
  if ('content' in item) {
    // 文本记录
    return (
      <div 
        key={item.id} 
        className="content-item"
        onClick={() => onCopy(item.content)}
      >
        <div className="content-item-text">
          <p dangerouslySetInnerHTML={{ __html: escapeHtml(item.content) }}></p>
          <small>{new Date(item.timestamp).toLocaleString()}</small>
        </div>
        <button 
          className="delete-button" 
          onClick={(e) => {
            e.stopPropagation()
            onDelete(item.id)
          }}
          title="删除"
        >
          <DeleteIcon />
        </button>
      </div>
    )
  }

  // 文件记录
  return (
    <div 
      key={item.id} 
      className="content-item"
      onClick={() => {
        if (!item.uploading) {
          onDownload(item.id)
        }
      }}
    >
      <div className="content-item-file">
        <div className="file-info">
          <span className="filename">{item.filename}</span>
          <span className="file-size">
            {item.uploading ? '上传中...' : formatFileSize(item.size)}
          </span>
        </div>
        {item.uploading && (
          <div className="progress-bar">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
        <small>{new Date(item.timestamp).toLocaleString()}</small>
      </div>
      {!item.uploading && (
        <button 
          className="delete-button" 
          onClick={(e) => {
            e.stopPropagation()
            onDelete(item.id)
          }}
          title="删除"
        >
          <DeleteIcon />
        </button>
      )}
    </div>
  )
}

export default ContentItem 