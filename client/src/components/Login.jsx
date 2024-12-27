import { useState, useRef, useEffect } from 'react'

const Login = ({ setCredential, onLogin }) => {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef([])

  useEffect(() => {
    // 自动聚焦第一个输入框
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  const handleInput = (index, value) => {
    // 移除数字限制检查
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
    const numbers = pastedData.replace(/\D/g, '').split('').slice(0, 6)
    
    if (numbers.length) {
      const newCode = [...code]
      numbers.forEach((num, index) => {
        if (index < 6) newCode[index] = num
      })
      setCode(newCode)

      // 聚焦到最后一个填充的数字后面的输入框
      const nextEmptyIndex = Math.min(numbers.length, 5)
      if (inputRefs.current[nextEmptyIndex]) {
        inputRefs.current[nextEmptyIndex].focus()
      }

      // 如果粘贴的数字正好是6位，自动提交
      if (newCode.every(digit => digit)) {
        const credential = newCode.join('')
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