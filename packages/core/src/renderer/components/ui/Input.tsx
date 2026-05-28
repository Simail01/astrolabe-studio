import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, style, ...rest }) => {
  const base: React.CSSProperties = {
    width: '100%',
    padding: '6px 10px',
    fontSize: 14,
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-input)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius)',
    outline: 'none',
    transition: 'border-color 0.15s',
    ...style,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label style={{ fontSize: 'var(--font-ui)', color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <input
        style={base}
        onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; rest.onFocus?.(e); }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--border-input)'; rest.onBlur?.(e); }}
        {...rest}
      />
    </div>
  );
};
