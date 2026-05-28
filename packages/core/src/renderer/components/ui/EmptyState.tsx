import React from 'react';
import { Button } from './Button';

type Variant = 'page' | 'panel' | 'inline';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  variant?: Variant;
}

const variantConfig: Record<Variant, {
  container: React.CSSProperties;
  iconSize: number;
  titleSize: number;
  descSize: number;
}> = {
  page: {
    container: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      flex: 1, gap: 12, padding: 32,
    },
    iconSize: 48,
    titleSize: 16,
    descSize: 13,
  },
  panel: {
    container: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, gap: 8,
    },
    iconSize: 32,
    titleSize: 14,
    descSize: 12,
  },
  inline: {
    container: {
      padding: 12, textAlign: 'center',
    },
    iconSize: 0,
    titleSize: 13,
    descSize: 12,
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'inline',
}) => {
  const cfg = variantConfig[variant];

  return (
    <div style={cfg.container}>
      {icon && variant !== 'inline' && (
        <div style={{ fontSize: cfg.iconSize, opacity: 0.3 }}>{icon}</div>
      )}
      <div style={{ fontSize: cfg.titleSize, color: 'var(--text-muted)' }}>{title}</div>
      {description && (
        <div style={{ fontSize: cfg.descSize, color: 'var(--text-muted)', opacity: 0.7 }}>
          {description}
        </div>
      )}
      {(action || secondaryAction) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {action && (
            <Button variant="primary" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
