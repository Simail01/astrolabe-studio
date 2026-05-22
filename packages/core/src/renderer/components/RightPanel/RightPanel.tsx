import React from 'react';
import { useLayoutStore } from '../../stores/layout.store';

const panel: React.CSSProperties = {
  width: 280,
  minWidth: 200,
  backgroundColor: '#252526',
  borderLeft: '1px solid #3c3c3c',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const header: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  color: '#999',
  letterSpacing: 1,
  borderBottom: '1px solid #3c3c3c',
};

export const RightPanel: React.FC = () => {
  const visible = useLayoutStore((s) => s.rightPanelVisible);

  if (!visible) return null;

  return (
    <div style={panel}>
      <div style={header}>属性面板</div>
      <div style={{ padding: 12, color: '#999', fontSize: 13 }}>
        选中内容后显示属性和参考
      </div>
    </div>
  );
};
