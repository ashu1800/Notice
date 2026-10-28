import { useEffect, useState } from 'react'
import { Window } from '@wailsio/runtime'
import { Icon } from './Icon'
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
      <div className="titlebar-drag">
        <span className="titlebar-mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="titlebar-name">Notice</span>
        <span className="titlebar-divider" aria-hidden="true">/</span>
        <span className="titlebar-caption">SIGNAL DESK</span>
      </div>
      <div className="titlebar-buttons">
        <button type="button" className="titlebar-btn" aria-label="最小化" title="最小化" onClick={handleMinimize}>
          <Icon name="minimize" size={12} />
        </button>
        <button
          type="button"
          className="titlebar-btn"
          aria-label={isMaximized ? '还原' : '最大化'}
          title={isMaximized ? '还原' : '最大化'}
          onClick={handleMaximize}
        >
          <Icon name={isMaximized ? 'restore' : 'maximize'} size={12} />
        </button>
        <button type="button" className="titlebar-btn close" aria-label="关闭" title="关闭" onClick={handleClose}>
          <Icon name="close" size={13} />
        </button>
      </div>
    </div>
  )
}
