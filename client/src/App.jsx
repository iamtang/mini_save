import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import './App.css'
import Login from './components/Login'
import Header from './components/Header'
import ContentSection from './components/ContentSection'
import InputSection from './components/InputSection'
import { RefreshIcon } from './components/Icons'
import { formatFileSize, escapeHtml, useToast, copyToClipboard } from './utils/helpers'
import Toast from './components/common/Toast'

function App() {
  const [credential, setCredential] = useState(localStorage.getItem('lastCredential') || '')
  const [isAuth, setIsAuth] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [text, setText] = useState('')
  const [contents, setContents] = useState({ texts: [], files: [] })
  const [copyStatus, setCopyStatus] = useState('')
  const [uploadProgress, setUploadProgress] = useState(null)
  const contentRef = useRef(null)
  const [uploadTasks, setUploadTasks] = useState(new Set())
  const [showCopyToast, message, showCopyMessage] = useToast(1500)

  useEffect(() => {
    if (credential) {
      checkAuth()
    } else {
      setIsLoading(false)
    }
  }, [credential])

  const checkAuth = async () => {
    try {
      const response = await fetch(`${window.API_URL}/api/auth`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ credential })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        localStorage.setItem('credential', credential)
        setIsAuth(true)
        // 登录成功后立即获取内容
        await fetchContents()  // 使用 await 确保内容加载完成
      } else {
        throw new Error('Auth failed')
      }
    } catch (error) {
      console.error('Auth error:', error)
      setIsAuth(false)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchContents = async () => {
    try {
      if (!credential) return

      const response = await fetch(`${window.API_URL}/api/content/${credential}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // 保留当前正在上传的文件
      const uploadingFiles = contents.files.filter(f => f.uploading)
      
      setContents(prev => ({
        texts: data.texts,
        files: [...uploadingFiles, ...data.files]
      }))
    } catch (error) {
      console.error('Fetch error:', error)
    }
  }

  const handleSubmitText = async () => {
    if (!text.trim()) return
    
    try {
      await fetch(`${window.API_URL}/api/text/${credential}`, {
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
    const files = event.target.files
    if (!files.length) return

    // 检查是否超过最大同时上传数
    const maxConcurrentUploads = 3
    const remainingSlots = maxConcurrentUploads - uploadTasks.size
    const filesToUpload = Array.from(files).slice(0, remainingSlots)

    if (files.length > remainingSlots) {
      alert(`当前只能再上传 ${remainingSlots} 个文件`)
    }

    // 处理每个选中的文件
    filesToUpload.forEach(file => {
      uploadFile(file)
    })

    // 清空文件输入框
    event.target.value = ''
  }

  const uploadFile = async (file) => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const xhr = new XMLHttpRequest()
      
      // 创建一个临时的文件记录，使用更可靠的唯一ID
      const tempFileId = Date.now() + '-' + Math.random().toString(36).substr(2, 9)
      
      // 添加到上传任务列表
      setUploadTasks(prev => {
        const newTasks = new Set(prev)
        newTasks.add(tempFileId)
        return newTasks
      })

      // 添加进度追踪变量
      let lastUpdate = Date.now()
      let lastLoaded = 0

      setContents(prev => ({
        ...prev,
        files: [{
          id: tempFileId,
          filename: file.name,
          timestamp: new Date().toISOString(),
          uploading: true,
          progress: 0,
          speed: '0 KB/s',
          size: file.size
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
          const currentTime = Date.now()
          const timeElapsed = currentTime - lastUpdate
          
          if (timeElapsed >= 200) {
            const loaded = event.loaded - lastLoaded
            const speed = (loaded / timeElapsed) * 1000
            const formattedSpeed = formatSpeed(speed)
            const progress = Math.round((event.loaded / event.total) * 100)
            
            setContents(prev => ({
              ...prev,
              files: prev.files.map(f => 
                f.id === tempFileId 
                  ? { ...f, progress, speed: formattedSpeed }
                  : f
              )
            }))
            
            lastUpdate = currentTime
            lastLoaded = event.loaded
          }
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          fetchContents()
        } else {
          console.error('Upload failed')
          setContents(prev => ({
            ...prev,
            files: prev.files.filter(f => f.id !== tempFileId)
          }))
        }
        setUploadTasks(prev => {
          const newTasks = new Set(prev)
          newTasks.delete(tempFileId)
          return newTasks
        })
      }

      xhr.onerror = () => {
        console.error('Upload error')
        setContents(prev => ({
          ...prev,
          files: prev.files.filter(f => f.id !== tempFileId)
        }))
        setUploadTasks(prev => {
          const newTasks = new Set(prev)
          newTasks.delete(tempFileId)
          return newTasks
        })
      }

      xhr.open('POST', `${window.API_URL}/api/upload/${credential}`)
      xhr.send(formData)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadTasks(prev => {
        const newTasks = new Set(prev)
        newTasks.delete(tempFileId)
        return newTasks
      })
    }
  }

  // 添加格式化速率的函数
  const formatSpeed = (bytesPerSecond) => {
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
    let speed = bytesPerSecond
    let unitIndex = 0
    
    while (speed >= 1024 && unitIndex < units.length - 1) {
      speed /= 1024
      unitIndex++
    }
    
    return `${speed.toFixed(1)} ${units[unitIndex]}`
  }

  const handleDeleteText = async (id) => {
    try {
      await fetch(`${window.API_URL}/api/text/${credential}/${id}`, {
        method: 'DELETE'
      })
      
      // 只更新 texts ��组，保持 files 数组不变
      setContents(prev => ({
        ...prev,
        texts: prev.texts.filter(t => t.id !== id)
      }))
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const handleDeleteFile = async (id) => {
    try {
      await fetch(`${window.API_URL}/api/file/${credential}/${id}`, {
        method: 'DELETE'
      })
      
      // 只删除非上传中且 ID 匹配的文件
      setContents(prev => ({
        ...prev,
        files: prev.files.filter(f => f.uploading || f.id !== id)
      }))
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const handleCopyText = async (text) => {
    try {
      const success = await copyToClipboard(text)
      showCopyMessage(success ? '已复制到剪贴板' : '复制失败')
    } catch (error) {
      console.error('Copy failed:', error)
      showCopyMessage('复制失败')
    }
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
    localStorage.removeItem('lastCredential')
    setCredential('')
    setIsAuth(false)
    setContents({ texts: [], files: [] })
  }

  const handleDownload = (id) => {
    window.location.href = `${window.API_URL}/api/download/${credential}/${id}`
  }

  const handleRefresh = () => {
    fetchContents()
  }

  // 添加视口高度计算
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }

    setVH()
    window.addEventListener('resize', setVH)
    window.addEventListener('orientationchange', setVH)

    return () => {
      window.removeEventListener('resize', setVH)
      window.removeEventListener('orientationchange', setVH)
    }
  }, [])

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

      <button 
        className="refresh-button" 
        onClick={handleRefresh}
        title="刷新内容"
      >
        <RefreshIcon />
      </button>

      <Toast show={showCopyToast} message={message} />

      <InputSection 
        text={text}
        setText={setText}
        onSubmit={handleSubmitText}
        onFileUpload={handleFileUpload}
        adjustTextareaHeight={adjustTextareaHeight}
        uploadTasks={uploadTasks}
      />
    </div>
  )
}

export default App