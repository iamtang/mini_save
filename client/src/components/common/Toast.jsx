const Toast = ({ show, message, position = 'bottom' }) => {
  if (!show) return null

  return (
    <div className={`toast toast-${position}`}>
      {message}
    </div>
  )
}

export default Toast 