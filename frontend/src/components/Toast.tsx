export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed right-4 bottom-4 z-999 max-w-sm rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-theme-lg" role="status">
      <p>{message}</p>
      <button className="mt-2 text-xs text-gray-500 hover:text-gray-800" type="button" onClick={onClose}>
        Dismiss
      </button>
    </div>
  )
}
