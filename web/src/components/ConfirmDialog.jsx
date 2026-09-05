import Modal from "./Modal";

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  pending = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="m-0 mb-5 text-sm text-foreground">{message}</p>
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          className="pagination-button"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </button>
        <button
          type="button"
          className="cursor-pointer rounded-md bg-danger px-5 py-2.5 text-sm font-semibold text-white hover:bg-danger-dark disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
