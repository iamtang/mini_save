import { useState, useRef, useEffect } from 'react'

const Login = ({ setCredential, onLogin }) => {
  const [code, setCode] = useState(Array(6).fill(''))
  const inputRefs = useRef([])

  useEffect(() => {
    const savedCredential = localStorage.getItem('lastCredential')
    if (savedCredential && savedCredential.length === 6) {
      setCode(savedCredential.split(''))
      setCredential(savedCredential)
      onLogin()
    } else if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [setCredential, onLogin])

  const handleInput = (index, value) => {
    value = value.replace(/\s/g, '')

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    if (value && index < 5) {
      inputRefs.current[index + 1].focus()
    }

    if (newCode.every(char => char)) {
      const credential = newCode.join('')
      localStorage.setItem('lastCredential', credential)
      setCredential(credential)
      onLogin()
    }
  }

  const handleKeyDown = (index, e) => {
    // 处理删除键
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text')
    // 过滤掉空格后再处理
    const chars = pastedData.replace(/\s/g, '').split('').slice(0, 6)
    
    if (chars.length) {
      const newCode = [...code]
      chars.forEach((char, index) => {
        if (index < 6) newCode[index] = char
      })
      setCode(newCode)

      // 聚焦到最后一个填充的字符后面的输入框
      const nextEmptyIndex = Math.min(chars.length, 5)
      if (inputRefs.current[nextEmptyIndex]) {
        inputRefs.current[nextEmptyIndex].focus()
      }

      // 如果粘贴的字符正好是6位，自动提交
      if (newCode.every(char => char)) {
        const credential = newCode.join('')
        localStorage.setItem('lastCredential', credential)
        setCredential(credential)
        onLogin()
      }
    }
  }

  return (
    <div className="auth-container">
      <h1>迷你保存</h1>
      <div className="code-inputs">
        {code.map((char, index) => (
          <input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="text"
            maxLength={1}
            value={char}
            onChange={e => handleInput(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className="code-input"
            autoComplete="off"
          />
        ))}
      </div>
    </div>
  )
}

export default Login 