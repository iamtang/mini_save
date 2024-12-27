import { SendIcon, UploadIcon } from './Icons'

const InputSection = ({ 
  text, 
  setText, 
  onSubmit, 
  onFileUpload, 
  adjustTextareaHeight,
  uploadTasks
}) => {
  const maxConcurrentUploads = 3
  const isUploading = uploadTasks.size > 0

  return (
    <div className="input-section">
      <div className="input-container">
        <label 
          className={`upload-button ${isUploading ? 'disabled' : ''}`} 
          title={isUploading 
            ? `正在上传${uploadTasks.size}个文件...` 
            : '上传文件'}
        >
          <input
            type="file"
            multiple
            accept="*/*"
            onChange={onFileUpload}
            style={{ display: 'none' }}
            disabled={isUploading}
          />
          <UploadIcon />
        </label>
        
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            adjustTextareaHeight(e)
          }}
          placeholder="Ctrl/Command + Enter 发送"
          onKeyDown={(e) => {
            // 如果是在输入法编辑状态，不处理任何快捷键
            if (e.isComposing) {
              return
            }
            
            if (e.key === 'Enter') {
              if (e.metaKey || e.ctrlKey) {
                // Command/Ctrl + Enter 发送
                e.preventDefault()
                if (text.trim()) {
                  onSubmit()
                }
              }
            }
          }}
        />
        
        <button 
          onClick={onSubmit} 
          className="send-button"
          title="发送文本"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  )
}

export default InputSection 