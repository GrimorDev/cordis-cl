import { clsx } from 'clsx'
import type { UserStatus } from '@cordis/shared'

const statusColors: Record<UserStatus, string> = {
  online: 'bg-green-online',
  idle: 'bg-yellow-idle',
  dnd: 'bg-red-dnd',
  offline: 'bg-text-muted',
}

interface AvatarProps {
  src?: string | null
  username: string
  size?: 'sm' | 'md' | 'lg'
  status?: UserStatus
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
}

const statusSizes = {
  sm: 'w-3 h-3 border-[2px]',
  md: 'w-3.5 h-3.5 border-2',
  lg: 'w-4 h-4 border-2',
}

export function Avatar({ src, username, size = 'md', status, className }: AvatarProps) {
  const initials = username.slice(0, 2).toUpperCase()

  return (
    <div className={clsx('relative flex-shrink-0', className)}>
      <div
        className={clsx(
          'rounded-full flex items-center justify-center font-semibold',
          'bg-brand text-white select-none',
          sizeClasses[size]
        )}
      >
        {src ? (
          <img src={src} alt={username} className="w-full h-full rounded-full object-cover" />
        ) : (
          initials
        )}
      </div>
      {status && (
        <div
          className={clsx(
            'absolute bottom-0 right-0 rounded-full border-bg-primary',
            statusColors[status],
            statusSizes[size]
          )}
        />
      )}
    </div>
  )
}
