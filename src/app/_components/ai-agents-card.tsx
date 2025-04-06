import Image from 'next/image'

interface AIAgentsCardProps {
  onClick: () => void
}

export function AIAgentsCard({ onClick }: AIAgentsCardProps) {
  return (
    <div 
      className="bg-[#c0c0c0] p-4 shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#dfdfdf,inset_-2px_-2px_grey,inset_2px_2px_#fff] cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        <Image 
          src="/ai-agent-icon.png" 
          alt="AI Agent" 
          width={64} 
          height={64} 
          className="pixelated"
        />
        <h2 className="text-xl font-bold">AI Agents</h2>
      </div>
    </div>
  )
} 