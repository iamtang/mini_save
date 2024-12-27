import { SendIcon, UploadIcon } from './Icons'

const InputSection = ({ text, setText, onSubmit, onFileUpload, adjustTextareaHeight }) => {
  return (
    <div className="input-section">
      <div className="input-container">
        <label className="upload-button" title="上传文件">
          <input
            type="file"
            onChange={onFileUpload}
            style={{ display: 'none' }}
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