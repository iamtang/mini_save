import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import './App.css'
import Login from './components/Login'
import Header from './components/Header'
import ContentSection from './components/ContentSection'
import InputSection from './components/InputSection'

function App() {
  const [credential, setCredential] = useState(localStorage.getItem('credential') || '')
  const [isAuth, setIsAuth] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [text, setText] = useState('')
  const [contents, setContents] = useState({ texts: [], files: [] })
  const [copyStatus, setCopyStatus] = useState('')
  const [uploadProgress, setUploadProgress] = useState(null)
  const contentRef = useRef(null)

  useEffect(() => {
    if (credential) {
      checkAuth()
    } else {
      setIsLoading(false)
    }
  }, [])

  const checkAuth = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      })
      localStorage.setItem('credential', credential)
      setIsAuth(true)
      fetchContents()
    } catch (error) {
      console.error('Auth error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchContents = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/content/${credential}`)
      const data = await response.json()
      setContents(data)
    } catch (error) {
      console.error('Fetch error:', error)
    }
  }

  const handleSubmitText = async () => {
    if (!text.trim()) return
    
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/text/${credential}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      setText('')
      // 重置 textarea 高度
      const textarea = document.querySelector('textarea')
      if (textarea) {
        textarea.style.height = '42px'
      }
      await fetchContents()
      // 滚动到顶部
      if (contentRef.current) {
        contentRef.current.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      }
    } catch (error) {
      console.error('Submit error:', error)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const xhr = new XMLHttpRequest()
      
      // 创建一个临时的文件记录
      const tempFileId = Date.now()
      setContents(prev => ({
        ...prev,
        files: [{
          id: tempFileId,
          filename: file.name,
          timestamp: new Date().toISOString(),
          uploading: true,
          progress: 0
        }, ...prev.files]
      }))
      // 滚动到顶部
      if (contentRef.current) {
        contentRef.current.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      }
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setContents(prev => ({
            ...prev,
            files: prev.files.map(f => 
              f.id === tempFileId 
                ? { ...f, progress }
                : f
            )
          }))
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          fetchContents()
        } else {
          console.error('Upload failed')
          // 移除临时文件记录
          setContents(prev => ({
            ...prev,
            files: prev.files.filter(f => f.id !== tempFileId)
          }))
        }
      }

      xhr.onerror = () => {
        console.error('Upload error')
        // 移除临时文件记录
        setContents(prev => ({
          ...prev,
          files: prev.files.filter(f => f.id !== tempFileId)
        }))
      }

      xhr.open('POST', `${import.meta.env.VITE_API_URL}/api/upload/${credential}`)
      xhr.send(formData)
      
      // 清空文件输入框
      event.target.value = ''
    } catch (error) {
      console.error('Upload error:', error)
    }
  }

  const handleDeleteText = async (id) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/text/${credential}/${id}`, {
        method: 'DELETE'
      })
      fetchContents()
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const handleDeleteFile = async (id) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/file/${credential}/${id}`, {
        method: 'DELETE'
      })
      fetchContents()
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const handleCopyText = async (text) => {
    try {
      // 尝试使用新的 Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        // 回退方案：创建临时文本区域
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          document.execCommand('copy')
          textArea.remove()
        } catch (err) {
          console.error('复制失败:', err)
          textArea.remove()
          return
        }
      }
      setCopyStatus('已复制')
      setTimeout(() => setCopyStatus(''), 2000)
    } catch (err) {
      console.error('复制失败:', err)
      // 在复制失败时也显示提示，让用户知道发生了什么
      setCopyStatus('复制失败')
      setTimeout(() => setCopyStatus(''), 2000)
    }
  }

  // 转义HTML标签防止XSS
  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '未知大小'
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  // 添加自动调整高度的函数
  const adjustTextareaHeight = (e) => {
    const textarea = e.target
    textarea.style.height = '24px' // 重置高度
    const scrollHeight = textarea.scrollHeight
    textarea.style.height = Math.min(scrollHeight, 72) + 'px'
  }

  const handleLogout = () => {
    localStorage.removeItem('credential')
    setCredential('')
    setIsAuth(false)
    setContents({ texts: [], files: [] })
  }

  const handleDownload = (id) => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/download/${credential}/${id}`
  }

  if (isLoading) {
    return null
  }

  if (!isAuth) {
    return (
      <Login 
        credential={credential}
        setCredential={setCredential}
        onLogin={checkAuth}
      />
    )
  }

  return (
    <div className="app-container">
      <Header 
        credential={credential}
        onLogout={handleLogout}
      />
      
      <ContentSection 
        contents={contents}
        onCopyText={handleCopyText}
        onDeleteText={handleDeleteText}
        onDeleteFile={handleDeleteFile}
        onDownload={handleDownload}
        escapeHtml={escapeHtml}
        formatFileSize={formatFileSize}
        contentRef={contentRef}
      />

      {copyStatus && <div className="copy-status">{copyStatus}</div>}

      <InputSection 
        text={text}
        setText={setText}
        onSubmit={handleSubmitText}
        onFileUpload={handleFileUpload}
        adjustTextareaHeight={adjustTextareaHeight}
      />
    </div>
  )
}

export default App