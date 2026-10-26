'use client';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = 'ยืนยัน', onConfirm, onCancel }: Props) {
  return (
    <div className="modal-overlay" style={{ alignItems: 'center' }} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="confirm-dialog">
        <h3>{title}</h3>
        <p>{message}</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onCancel} className="btn-secondary" style={{ flex: 1 }}>
            ยกเลิก
          </button>
          <button onClick={onConfirm} className="btn-danger" style={{ flex: 1 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
