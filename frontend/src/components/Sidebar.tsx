import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWS } from '../contexts/WSContext'
import { Icon, type IconName } from './Icon'
import './Sidebar.css'

interface NavItem {
  path: string
  label: string
  caption: string
  icon: IconName
}

const navItems: NavItem[] = [
  { path: '/', label: '消息', caption: 'INBOX', icon: 'inbox' },
  { path: '/subscriptions', label: '订阅', caption: 'FEEDS', icon: 'feed' },
  { path: '/settings', label: '设置', caption: 'SYSTEM', icon: 'settings' }
]

const waveform = [4, 9, 6, 14, 8, 18, 11, 16, 7, 12, 5, 9]

export function Sidebar() {
  const { logout, user } = useAuth()
  const { isConnected } = useWS()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initial = user?.email?.charAt(0).toUpperCase() || 'N'

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <div className="brand-lockup">
          <span className="brand-glyph" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <div className="brand-copy">
            <span className="brand-word">Notice</span>
            <span className="brand-caption">PRIVATE SIGNAL DESK</span>
          </div>
        </div>
      </header>

      <nav className="sidebar-nav" aria-label="主导航">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <Icon name={item.icon} size={18} />
            </span>
            <span className="nav-copy">
              <span className="nav-label">{item.label}</span>
              <span className="nav-caption">{item.caption}</span>
            </span>
            <Icon name="arrow-up-right" size={13} className="nav-arrow" />
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-live" aria-label={isConnected ? '实时连接正常' : '实时连接断开'}>
        <div className="live-line">
          <span className={`live-dot ${isConnected ? 'is-live' : ''}`} />
          <span className="live-label">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
          <span className="live-code">WS/01</span>
        </div>
        <div className="waveform" aria-hidden="true">
          {waveform.map((height, index) => (
            <i
              key={index}
              style={{
                height: `${height}px`,
                animationDelay: `${index * 90}ms`
              }}
            />
          ))}
        </div>
      </div>

      <footer className="sidebar-footer">
        <div className="user-card">
          <span className="user-avatar" aria-hidden="true">{initial}</span>
          <div className="user-meta">
            <span className="user-kicker">SIGNED IN</span>
            <span className="user-email" title={user?.email || ''}>{user?.email || '未登录'}</span>
          </div>
          <button
            type="button"
            className="logout-btn"
            onClick={handleLogout}
            aria-label="退出登录"
            title="退出登录"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </footer>
    </aside>
  )
}
