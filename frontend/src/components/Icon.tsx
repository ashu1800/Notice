import type { CSSProperties, ReactNode } from 'react'

export type IconName =
  | 'inbox'
  | 'feed'
  | 'settings'
  | 'logout'
  | 'plus'
  | 'copy'
  | 'check'
  | 'trash'
  | 'refresh'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'chevron-down'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'minimize'
  | 'maximize'
  | 'restore'
  | 'close'

interface IconProps {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
  style?: CSSProperties
}

const paths: Record<IconName, ReactNode> = {
  inbox: (
    <>
      <path d="M3.5 5.5h17l-1.7 10.3a2 2 0 0 1-2 1.7H7.2a2 2 0 0 1-2-1.7L3.5 5.5Z" />
      <path d="M3.9 12.2h4.2l1.2 2.4h5.4l1.2-2.4h4.2" />
    </>
  ),
  feed: (
    <>
      <path d="M5 4.5h14v15H5z" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17" r="1.8" fill="currentColor" stroke="none" />
    </>
  ),
  logout: (
    <>
      <path d="M10 5H5v14h5" />
      <path d="M14 8l4 4-4 4M9 12h9" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  copy: (
    <>
      <rect x="8" y="8" width="11" height="11" rx="1.5" />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
    </>
  ),
  check: <path d="m5 12 4.5 4.5L19 7" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.8-4M4 5v5h5" />
      <path d="M4 13a8 8 0 0 0 14.8 4M20 19v-5h-5" />
    </>
  ),
  'arrow-right': <path d="M4 12h15M13 6l6 6-6 6" />,
  'arrow-up-right': <path d="M6 18 18 6M8 6h10v10" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </>
  ),
  moon: <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z" />,
  monitor: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="1.5" />
      <path d="M8.5 20h7M12 16.5V20" />
    </>
  ),
  minimize: <path d="M5 12h14" />,
  maximize: <rect x="6" y="6" width="12" height="12" />,
  restore: (
    <>
      <rect x="5" y="8" width="11" height="11" />
      <path d="M8 8V5h11v11h-3" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />
}

export function Icon({ name, size = 18, strokeWidth = 1.7, className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  )
}
