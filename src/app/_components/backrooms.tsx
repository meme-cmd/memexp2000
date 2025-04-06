export function Backrooms() {
  return (
    <div className="space-y-4">
      <button className="w-full text-left px-4 py-2 bg-[#c0c0c0] shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#fff] active:shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]">
        Create Backroom
      </button>
      <div className="space-y-2">
        <h3 className="font-bold">Active Backrooms:</h3>
        <ul className="list-disc list-inside">
          <li>Backroom 1</li>
          <li>Backroom 2</li>
          <li>Backroom 3</li>
        </ul>
      </div>
    </div>
  )
} 