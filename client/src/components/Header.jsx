import { LogoutIcon } from './Icons'
import { RefreshIcon } from './Icons'

const Header = ({ credential, onLogout, onRefresh }) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="app-title">迷你仓</div>
        <div className="header-actions">
          <button 
            className="refresh-button" 
            onClick={onRefresh}
            title="刷新内容"
          >
            <RefreshIcon />
          </button>
          <button 
            className="logout-button" 
            onClick={onLogout}
            title="退出登录"
          >
            <LogoutIcon />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header 