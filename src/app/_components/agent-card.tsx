import { Bot } from 'lucide-react'

interface AgentCardProps {
  name: string
  type: string
  status: "online" | "offline"
  description: string
}

export function AgentCard({ name, type, status, description }: AgentCardProps) {
  return (
    <div className="rounded bg-[#c0c0c0] p-2 shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#dfdfdf,inset_-2px_-2px_grey,inset_2px_2px_#fff]">
      <div className="flex items-start gap-2">
        <div className="rounded bg-white p-1 shadow-[inset_-1px_-1px_#dfdfdf,inset_1px_1px_#0a0a0a]">
          <Bot className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">{name}</h3>
            <span className={`
              h-2 w-2 rounded-full
              ${status === 'online' ? 'bg-green-500' : 'bg-gray-400'}
            `} />
          </div>
          <p className="text-xs text-gray-600">{type}</p>
          <p className="mt-1 text-xs">{description}</p>
        </div>
      </div>
    </div>
  )
} 