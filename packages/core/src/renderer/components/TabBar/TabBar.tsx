import React from 'react';
import { useLayoutStore } from '../../stores/layout.store';

const bar: React.CSSProperties = {
  height: 36,
  backgroundColor: '#252526',
  display: 'flex',
  alignItems: 'center',
  overflow: 'hidden',
};

const tab: React.CSSProperties = {
  height: '100%',
  padding: '0 12px',
  display: 'flex',
  alignItems: 'center',
  fontSize: 13,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  borderRight: '1px solid #3c3c3c',
};

const activeTabStyle: React.CSSProperties = {
  height: '100%',
  padding: '0 12px',
  display: 'flex',
  alignItems: 'center',
  fontSize: 13,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  borderRight: '1px solid #3c3c3c',
  backgroundColor: '#1e1e1e',
  color: '#ffffff',
  borderTop: '1px solid #007acc',
};

const closeBtn: React.CSSProperties = {
  marginLeft: 8,
  fontSize: 14,
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  color: '#999',
};

export const TabBar: React.FC = () => {
  const { tabs, activeTab, openTab, closeTab } = useLayoutStore();

  return (
    <div style={bar}>
      {tabs.map((t) => {
        const isActive = t.filePath === activeTab;
        const fileName = t.filePath.split('/').pop()?.replace('.json', '') ?? t.filePath;
        return (
          <div
            key={t.filePath}
            style={isActive ? activeTabStyle : tab}
            onClick={() => openTab(t)}
          >
            <span>{fileName}</span>
            <button
              style={closeBtn}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(t.filePath);
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
};
