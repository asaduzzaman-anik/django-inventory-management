import { Button } from "./Button.tsx"
import { Modal } from "./Modal.tsx"

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  pending,
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  confirmLabel: string
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-center text-sm text-gray-500">{message}</p>
      <div className="mt-4 flex justify-end gap-3 border-t border-gray-100 pt-4">
        <Button variant="ghost" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" type="button" disabled={pending} onClick={onConfirm}>
          {pending ? "Saving…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
