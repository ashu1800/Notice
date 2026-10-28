import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWS } from '../contexts/WSContext'
import './Sidebar.css'

const navItems = [
  { path: '/', label: '消息', icon: '📬' },
  { path: '/subscriptions', label: '订阅', icon: '📋' },
  { path: '/settings', label: '设置', icon: '⚙️' }
]

export function Sidebar() {
  const { logout, user } = useAuth()
  const { isConnected } = useWS()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-logo">Notice</h1>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-info">
          <span className="user-avatar">👤</span>
          <div className="user-meta">
            {user && (
              <span className="user-email">{user.email}</span>
            )}
            <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '已连接' : '连接断开'}
            </span>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <span className="nav-icon">🚪</span>
          <span className="nav-label">退出登录</span>
        </button>
      </div>
    </aside>
  )
}
