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
      <p className="text-sm text-stone-700">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
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
