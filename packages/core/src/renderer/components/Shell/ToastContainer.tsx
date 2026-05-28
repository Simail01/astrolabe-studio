import React from 'react';
import { useToastStore, type Toast, type ToastType } from '../../stores/toast.store';

const typeColors: Record<ToastType, string> = {
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
};

const typeIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast: t, onDismiss }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 16px',
      marginBottom: 8,
      backgroundColor: 'var(--bg-panel)',
      border: `1px solid ${typeColors[t.type]}`,
      borderRadius: 'var(--radius)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      color: 'var(--text-primary)',
      fontSize: 13,
      maxWidth: 360,
      animation: 'toast-in 0.25s ease-out',
      cursor: 'pointer',
    }}
    onClick={() => onDismiss(t.id)}
  >
    <span style={{ color: typeColors[t.type], fontWeight: 600, fontSize: 15 }}>{typeIcons[t.type]}</span>
    <span style={{ flex: 1 }}>{t.message}</span>
  </div>
);

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: 40,
          right: 16,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </>
  );
};
