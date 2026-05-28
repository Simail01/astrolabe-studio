import React from 'react';
import { useLayoutStore } from '../../stores/layout.store';
import { AISettings } from './AISettings';

const overlay: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200,
};

const dialog: React.CSSProperties = {
  width: 560, maxHeight: '80vh', backgroundColor: 'var(--editor-panel)', borderRadius: 8,
  display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

const header: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 20px', borderBottom: '1px solid var(--border-default)',
};

const headerTitle: React.CSSProperties = { fontSize: 16, color: 'var(--text-inverse)', fontWeight: 600 };

const closeBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 20, cursor: 'pointer', padding: '0 4px',
};

const body: React.CSSProperties = {
  flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column',
};

export const SettingsPanel: React.FC = () => {
  const settingsOpen = useLayoutStore((s) => s.settingsOpen);
  const toggleSettings = useLayoutStore((s) => s.toggleSettings);

  if (!settingsOpen) return null;

  return (
    <div style={overlay} onClick={toggleSettings}>
      <div style={dialog} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <span style={headerTitle}>设置</span>
          <button style={closeBtn} onClick={toggleSettings}>✕</button>
        </div>
        <div style={body}>
          <AISettings />
        </div>
      </div>
    </div>
  );
};
