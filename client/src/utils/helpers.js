import { useState, useRef, useEffect } from 'react'

// 格式化文件大小
export const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '未知大小'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// 转义HTML防止XSS
export const escapeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

// 复制文本到剪贴板
export const copyToClipboard = async (text) => {
  try {
    // 尝试使用新的 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    
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
      return true
    } catch (err) {
      console.error('复制失败:', err)
      textArea.remove()
      return false
    }
  } catch (err) {
    console.error('复制失败:', err)
    return false
  }
}

// Toast 提示
export const useToast = (duration = 2000) => {
  const [show, setShow] = useState(false)
  const [message, setMessage] = useState('')
  const timeoutRef = useRef(null)

  const showToast = (msg) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setMessage(msg)
    setShow(true)
    timeoutRef.current = setTimeout(() => {
      setShow(false)
    }, duration)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [show, message, showToast]
} 