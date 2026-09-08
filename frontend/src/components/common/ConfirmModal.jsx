import React from 'react';
import Modal from './Modal';

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div style={{ padding: '24px 0', fontSize: '16px', color: '#333' }}>
        {message}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
        <button 
          onClick={onCancel} 
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: 'transparent', cursor: 'pointer' }}
        >
          {cancelText}
        </button>
        <button 
          onClick={onConfirm} 
          style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#bd1f36', color: 'white', cursor: 'pointer' }}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

