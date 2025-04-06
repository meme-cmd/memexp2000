import Image from 'next/image'

interface DashboardProps {
  onNavigate: (view: 'aiAgents' | 'backrooms') => void
}

export function Dashboard({ onNavigate }: DashboardProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <button
          className="bg-[#c0c0c0] p-4 shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#dfdfdf,inset_-2px_-2px_grey,inset_2px_2px_#fff] text-left hover:scale-[1.02] transition-transform duration-200"
          onClick={() => onNavigate('aiAgents')}
        >
          <div className="flex items-center space-x-4">
            <div className="relative h-8 w-8 overflow-hidden">
              <Image 
                src="https://picsum.photos/200"
                alt="AI Agent"
                fill
                className="object-cover"
              />
            </div>
            <span className="text-lg font-bold">AI Agents</span>
          </div>
        </button>
        
        <button
          className="bg-[#c0c0c0] p-4 shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#dfdfdf,inset_-2px_-2px_grey,inset_2px_2px_#fff] text-left hover:scale-[1.02] transition-transform duration-200"
          onClick={() => onNavigate('backrooms')}
        >
          <div className="flex items-center space-x-4">
            <div className="relative h-8 w-8 overflow-hidden">
              <Image 
                src="https://picsum.photos/200"
                alt="Explore Backrooms"
                fill
                className="object-cover"
              />
            </div>
            <span className="text-lg font-bold">Explore Backrooms</span>
          </div>
        </button>
      </div>
      
      <div className="bg-[#c0c0c0] p-4 shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#dfdfdf,inset_-2px_-2px_grey,inset_2px_2px_#fff]">
        <h2 className="text-xl font-bold mb-2">About the Project</h2>
        <p className="text-sm">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        </p>
      </div>
    </div>
  )
} 