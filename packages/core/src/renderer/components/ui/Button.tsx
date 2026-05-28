import React, { useState } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: '2px 8px', fontSize: 11 },
  md: { padding: '6px 16px', fontSize: 13 },
  lg: { padding: '10px 24px', fontSize: 14 },
};

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: { backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' },
  secondary: { backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' },
  ghost: { backgroundColor: 'transparent', color: 'var(--text-secondary)' },
  danger: { backgroundColor: 'var(--color-error)', color: 'var(--text-inverse)' },
};

const variantHoverStyles: Record<Variant, React.CSSProperties> = {
  primary: { backgroundColor: 'var(--accent-hover)' },
  secondary: { backgroundColor: 'var(--bg-hover)' },
  ghost: { backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' },
  danger: { backgroundColor: 'var(--color-danger)' },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  style,
  onMouseEnter,
  onMouseLeave,
  disabled,
  children,
  ...rest
}) => {
  const [hovered, setHovered] = useState(false);

  const base: React.CSSProperties = {
    border: 'none',
    borderRadius: 'var(--radius)',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background-color 0.15s',
    whiteSpace: 'nowrap',
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...(hovered && !disabled ? variantHoverStyles[variant] : {}),
    ...style,
  };

  return (
    <button
      style={base}
      disabled={disabled}
      onMouseEnter={(e) => { setHovered(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHovered(false); onMouseLeave?.(e); }}
      {...rest}
    >
      {children}
    </button>
  );
};
