import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import OSS from 'ali-oss'
import './App.css'
import Login from './components/Login'
import Header from './components/Header'
import ContentSection from './components/ContentSection'
import InputSection from './components/InputSection'
import { RefreshIcon } from './components/Icons'
import { formatFileSize, escapeHtml, useToast, copyToClipboard } from './utils/helpers'
import Toast from './components/common/Toast'


const keyHex = "7483c8494ebee272085a833dd83a7651e18aa2936529ed3146fe9ac0ea0439e1"
const ivHex  ="69a117444dda7e183100876d7558ea37"

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
      const response = await fetch(`${API_URL}/api/auth`, {
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

      const response = await fetch(`${API_URL}/api/content/${credential}`)
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

    if(text.includes("set _oss=1")){
      window.localStorage.setItem('_oss', 1)
    }else if(text.includes("rm _oss")){
       window.localStorage.removeItem('_oss')
    }
    
    try {
      await fetch(`${API_URL}/api/text/${credential}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, from: 'h5' })
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
      const isOss = window.localStorage.getItem('_oss')
      isOss ? uploadOssFile(file) : uploadFile(file)
      
    })

    // 清空文件输入框
    event.target.value = ''
  }

  const uploadOssFile = async(file) => {
    const tempFileId = Date.now() + '-' + Math.random().toString(36).substr(2, 9)
    // 添加到上传任务列表
    setUploadTasks(prev => {
      const newTasks = new Set(prev)
      newTasks.add(tempFileId)
      return newTasks
    })

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

    const res = await fetch(`${API_URL}/api/upload/oss/sts`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', _oss: 1 },
    })
    const ossConfig = await res.json()
    const oss = new OSS(ossConfig)
    const _file = await encryptFile(file)
    const fileResult = await oss.put(file.name, _file)
    const res2 = await fetch(`${API_URL}/api/upload/oss/${credential}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          from: 'h5', 
          size: file.size, 
          filename: fileResult.name, 
          filePath: fileResult.url
        })
    })
    fetchContents()
    setUploadTasks(prev => {
      const newTasks = new Set(prev)
      newTasks.delete(tempFileId)
      return newTasks
    })
  }

  const uploadFile = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('from', 'h5')

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

      xhr.open('POST', `${API_URL}/api/upload/${credential}`)
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
      await fetch(`${API_URL}/api/text/${credential}/${id}`, {
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

  const handleStarText = async (id) => {
    try {
      await fetch(`${API_URL}/api/star/text/${credential}/${id}`, {
        method: 'PUT'
      })
      
      // 只删除非上传中且 ID 匹配的文件
      setContents(prev => ({
        ...prev,
        texts: prev.texts.map(item => {
          if(item.id === id){
            return { ...item, star: item.star ? 0 : 1}
          }else{
            return item
          }
        })
      }))
    } catch (error) {
      console.error('Star error:', error)
    }
  }

  const handleStarFile = async (id) => {
    try {
      await fetch(`${API_URL}/api/star/file/${credential}/${id}`, {
        method: 'PUT'
      })
      
      // 只删除非上传中且 ID 匹配的文件
      setContents(prev => ({
        ...prev,
        files: prev.files.map(item => {
          if(item.id === id){
            return { ...item, star: item.star ? 0 : 1}
          }else{
            return item
          }
        })
      }))
    } catch (error) {
      console.error('Star error:', error)
    }
  }

  const handleDeleteFile = async (id) => {
    try {
      await fetch(`${API_URL}/api/file/${credential}/${id}`, {
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

async function getAesKey() {
  return crypto.subtle.importKey(
    'raw',
    hexStringToUint8Array(keyHex),
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  );
}

  // 加密函数
async function encryptFile(file) {
  const key = await getAesKey(keyHex);
  const iv = hexStringToUint8Array(ivHex);
  const arrayBuffer = await file.arrayBuffer();

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    key,
    arrayBuffer
  );

  // 返回 Blob 对象，可直接上传
  return new Blob([encryptedBuffer], { type: file.type });
}

  async function decryptFile(encryptedBuffer) {
    const key = await getAesKey();
    const iv = hexStringToUint8Array(ivHex);

    const decryptedArrayBuffer = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      key,
      encryptedBuffer
    );

    return new Uint8Array(decryptedArrayBuffer);
  }

  // 工具函数：hex -> Uint8Array
  function hexStringToUint8Array(hexString) {
    if (hexString.length % 2 !== 0) throw new Error('Invalid hex string');
    const arr = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      arr[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }
    return arr;
  }

  const handleDownload = async ({type, id, filePath}) => {
    if(type === 'file'){
       window.location.href = `${API_URL}/api/download/${credential}/${id}`
    }else{
      const response = await fetch(filePath);
      const encryptedBuffer = await response.arrayBuffer();
      const decrypted = await decryptFile(encryptedBuffer);
      // 保存文件
      const blob = new Blob([decrypted]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = decodeURIComponent(filePath.split('/').pop().split('?')[0]);; // 自定义文件名
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    }
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
        onStarText={handleStarText}
        onStarFile={handleStarFile}
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