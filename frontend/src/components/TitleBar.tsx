import { useEffect, useState } from 'react'
import { Window } from '@wailsio/runtime'
import './TitleBar.css'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    let active = true
    Window.IsMaximised()
      .then(value => {
        if (active) {
          setIsMaximized(value)
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [])

  const handleMinimize = () => {
    void Window.Minimise()
  }

  const handleMaximize = async () => {
    if (await Window.IsMaximised()) {
      await Window.UnMaximise()
    } else {
      await Window.Maximise()
    }
    setIsMaximized(await Window.IsMaximised())
  }

  const handleClose = () => {
    void Window.Close()
  }

  return (
    <div className="titlebar">
      <div className="titlebar-drag">Notice</div>
      <div className="titlebar-buttons">
        <button className="titlebar-btn minimize" aria-label="最小化" title="最小化" onClick={handleMinimize}>─</button>
        <button className="titlebar-btn maximize" aria-label={isMaximized ? '还原' : '最大化'} title={isMaximized ? '还原' : '最大化'} onClick={handleMaximize}>
          {isMaximized ? '❐' : '□'}
        </button>
        <button className="titlebar-btn close" aria-label="关闭" title="关闭" onClick={handleClose}>×</button>
      </div>
    </div>
  )
}
