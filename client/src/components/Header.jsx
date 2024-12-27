import { useState, useRef, useEffect } from 'react'
import { LogoutIcon } from './Icons'

const Header = ({ credential, onLogout }) => {
  const [showToast, setShowToast] = useState(false)
  const timeoutRef = useRef(null)
  const tapCountRef = useRef(0)
  const lastTapRef = useRef(0)

  // 显示 Toast
  const showCredential = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setShowToast(true)
    timeoutRef.current = setTimeout(() => {
      setShowToast(false)
    }, 2000)
  }

  // 处理移动端双触
  const handleTouchStart = () => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      showCredential()
      tapCountRef.current = 0
    } else {
      tapCountRef.current = 1
    }
    lastTapRef.current = now
  }

  // 处理 PC 端双击
  const handleDoubleClick = (e) => {
    e.preventDefault() // 防止文本选中
    showCredential()
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <header className="header">
      <div className="header-content">
        <h1 
          className="app-title" 
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
        >
          迷你仓
        </h1>
        <button 
          className="logout-button" 
          onClick={onLogout}
          title="退出登录"
        >
          <LogoutIcon />
        </button>
      </div>
      {showToast && (
        <div className="credential-toast">
          当前凭证：{credential}
        </div>
      )}
    </header>
  )
}

export default Header 