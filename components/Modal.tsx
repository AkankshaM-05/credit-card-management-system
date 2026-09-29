import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

export function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}: ModalProps) {
  if (!isOpen) return null;

  const confirmBtnStyles =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500'
      : variant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500'
      : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-6">{description}</p>

        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-hidden"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-lg focus:outline-hidden focus:ring-2 focus:ring-offset-2 ${confirmBtnStyles}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
