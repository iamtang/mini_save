import { useRef } from 'react'
import { LogoutIcon } from './Icons'
import { useToast } from '../utils/helpers'
import Toast from './common/Toast'

const Header = ({ credential, onLogout }) => {
  const [showToast, , showCredential] = useToast()
  const lastTapRef = useRef(0)

  const handleTouchStart = () => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      showCredential(`当前凭证：${credential}`)
    }
    lastTapRef.current = now
  }

  return (
    <header className="header">
      <div className="header-content">
        <h1 
          className="app-title" 
          onDoubleClick={() => showCredential(`当前凭证：${credential}`)}
          onTouchStart={handleTouchStart}
        >
          迷你保存
        </h1>
        <button 
          className="logout-button" 
          onClick={onLogout}
          title="退出登录"
        >
          <LogoutIcon />
        </button>
      </div>
      <Toast show={showToast} message={`当前凭证：${credential}`} position="top" />
    </header>
  )
}

export default Header 