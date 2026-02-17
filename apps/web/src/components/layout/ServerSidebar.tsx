import { clsx } from 'clsx'
import { Plus } from 'lucide-react'
import { useServersStore } from '../../store/servers.store.js'
import { Avatar } from '../ui/Avatar.js'

export function ServerSidebar() {
  const { servers, activeServerId, setActiveServer } = useServersStore()

  return (
    <div className="w-[72px] bg-bg-primary flex flex-col items-center py-3 gap-2 border-r border-surface overflow-y-auto">
      {/* Home button */}
      <button
        onClick={() => setActiveServer(null)}
        className={clsx(
          'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200',
          'bg-brand text-white font-bold text-lg hover:rounded-2xl',
          !activeServerId && 'rounded-2xl'
        )}
      >
        C
      </button>

      <div className="w-8 h-px bg-surface" />

      {/* Server list */}
      {servers.map(server => (
        <button
          key={server.id}
          onClick={() => setActiveServer(server.id)}
          title={server.name}
          className={clsx(
            'transition-all duration-200 hover:rounded-2xl',
            activeServerId === server.id && 'rounded-2xl'
          )}
        >
          <Avatar
            src={server.iconUrl}
            username={server.name}
            size="md"
            className={clsx(
              'hover:rounded-2xl transition-all duration-200',
              activeServerId === server.id && 'ring-2 ring-brand'
            )}
          />
        </button>
      ))}

      {/* Add server */}
      <button
        className={clsx(
          'w-12 h-12 rounded-full flex items-center justify-center',
          'bg-surface hover:bg-brand text-green-online hover:text-white',
          'hover:rounded-2xl transition-all duration-200'
        )}
        title="Add a Server"
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
