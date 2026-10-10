import React from 'react';
import Modal from './Modal';

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', busy = false }) {
  const cancel = () => { if (!busy) onCancel(); };
  return (
    <Modal title={title} onClose={cancel}>
      <div aria-busy={busy} style={{ padding: '24px 0', fontSize: '16px', overflowWrap: 'anywhere' }}>
        {message}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
        <button 
          type="button"
          disabled={busy}
          onClick={cancel}
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: 'transparent', cursor: 'pointer' }}
        >
          {cancelText}
        </button>
        <button 
          type="button"
          disabled={busy}
          onClick={() => { if (!busy) onConfirm(); }}
          style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#bd1f36', color: 'white', cursor: 'pointer' }}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

