import { useState, useRef } from 'react'
import { LogoutIcon } from './Icons'

const Header = ({ credential, onLogout }) => {
  const [showToast, setShowToast] = useState(false)
  const timeoutRef = useRef(null)
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

  // 处理移动端双击
  const handleTouchStart = () => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) { // 300ms 内的双击
      showCredential()
    }
    lastTapRef.current = now
  }

  return (
    <header className="header">
      <div className="header-content">
        <h1 
          className="app-title" 
          onDoubleClick={showCredential}
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