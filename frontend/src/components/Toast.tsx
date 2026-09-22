export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed right-4 bottom-4 z-50 max-w-sm rounded-md bg-stone-900 px-4 py-3 text-sm text-white shadow-lg" role="status">
      <p>{message}</p>
      <button className="mt-2 text-xs text-stone-300 underline" type="button" onClick={onClose}>
        Dismiss
      </button>
    </div>
  )
}
