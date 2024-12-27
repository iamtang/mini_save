import { KeyIcon, LogoutIcon } from './Icons'

const Header = ({ credential, onLogout }) => {
  return (
    <div className="header">
      <div className="header-content">
        <div className="app-title">迷你仓</div>
        {/* <div className="credential-name">
          <KeyIcon />
          <span>凭证: {credential}</span>
        </div> */}
        <button className="logout-button" onClick={onLogout} title="退出登录">
          <LogoutIcon />
        </button>
      </div>
    </div>
  )
}

export default Header 