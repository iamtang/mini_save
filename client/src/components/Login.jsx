import { useState, useRef, useEffect } from 'react'

const Login = ({ setCredential, onLogin }) => {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef([])

  useEffect(() => {
    // 从本地存储读取上次使用的凭证
    const savedCredential = localStorage.getItem('lastCredential')
    if (savedCredential && savedCredential.length === 6) {
      // 将凭证拆分为字符数组
      setCode(savedCredential.split(''))
      // 自动提交
      setCredential(savedCredential)
      onLogin()
    } else {
      // 如果没有保存的凭证，聚焦第一个输入框
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus()
      }
    }
  }, [setCredential, onLogin])

  const handleInput = (index, value) => {
    // 过滤掉空格
    value = value.replace(/\s/g, '')
    // if (!value) return  // 如果过滤后为空，直接返回

    const newCode = [...code]
    newCode[index] = value

    setCode(newCode)

    // 如果输入了字符，移动到下一个输入框
    if (value && index < 5) {
      inputRefs.current[index + 1].focus()
    }

    // 如果所有字符都填完了，自动提交
    if (newCode.every(char => char) && value) {
      const credential = newCode.join('')
      // 保存到本地存储
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
      <h1>迷你仓</h1>
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