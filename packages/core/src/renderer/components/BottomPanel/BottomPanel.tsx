import React from 'react';
import { useLayoutStore } from '../../stores/layout.store';

const panel: React.CSSProperties = {
  height: 200,
  minHeight: 100,
  backgroundColor: '#1e1e1e',
  borderTop: '1px solid #3c3c3c',
  display: 'flex',
  flexDirection: 'column',
};

const tabs: React.CSSProperties = {
  display: 'flex',
  height: 28,
  backgroundColor: '#252526',
};

const tabStyle: React.CSSProperties = {
  padding: '4px 12px',
  fontSize: 12,
  color: '#ccc',
  cursor: 'pointer',
  borderRight: '1px solid #3c3c3c',
};

const activeTabStyle: React.CSSProperties = {
  ...tabStyle,
  backgroundColor: '#1e1e1e',
  color: '#fff',
};

export const BottomPanel: React.FC = () => {
  const visible = useLayoutStore((s) => s.bottomPanelVisible);

  if (!visible) return null;

  return (
    <div style={panel}>
      <div style={tabs}>
        <div style={activeTabStyle}>终端</div>
        <div style={tabStyle}>AI 对话</div>
        <div style={tabStyle}>输出</div>
      </div>
      <div style={{ flex: 1, padding: 8, color: '#999', fontSize: 13 }}>
        &gt; _
      </div>
    </div>
  );
};
