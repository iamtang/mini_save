const Login = ({ credential, setCredential, onLogin }) => {
  return (
    <div className="auth-container">
      <h1>迷你仓</h1>
      <p>输入任意凭证即可开始使用</p>
      <input
        type="text"
        value={credential}
        onChange={(e) => setCredential(e.target.value)}
        placeholder="输入凭证"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onLogin()
          }
        }}
      />
      <button onClick={onLogin}>开始使用</button>
    </div>
  )
}

export default Login 