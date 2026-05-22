import React, { useEffect, useState } from 'react';
import { useLayoutStore } from '../../stores/layout.store';
import { AISettings } from './AISettings';
import { bridge } from '../../services/bridge';

const overlay: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200,
};

const dialog: React.CSSProperties = {
  width: 560, maxHeight: '80vh', backgroundColor: '#252526', borderRadius: 8,
  display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

const header: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 20px', borderBottom: '1px solid #3c3c3c',
};

const headerTitle: React.CSSProperties = { fontSize: 16, color: '#fff', fontWeight: 600 };

const closeBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#999', fontSize: 20, cursor: 'pointer', padding: '0 4px',
};

const body: React.CSSProperties = {
  flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column',
};

const warnBanner: React.CSSProperties = {
  margin: '12px 20px', padding: '10px 14px', backgroundColor: '#5a3e00', borderRadius: 4,
  color: '#dcdcaa', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
};

interface Props {
  forceOpen?: boolean;
  onKeyConfigured?: () => void;
}

export const SettingsPanel: React.FC<Props> = ({ forceOpen, onKeyConfigured }) => {
  const settingsOpen = useLayoutStore((s) => s.settingsOpen);
  const toggleSettings = useLayoutStore((s) => s.toggleSettings);
  const open = forceOpen || settingsOpen;

  if (!open) return null;

  const handleClose = () => {
    if (!forceOpen) {
      toggleSettings();
    }
  };

  return (
    <div style={overlay} onClick={handleClose}>
      <div style={dialog} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <span style={headerTitle}>设置</span>
          {!forceOpen && (
            <button style={closeBtn} onClick={handleClose}>✕</button>
          )}
        </div>
        <div style={body}>
          {forceOpen && (
            <div style={warnBanner}>
              <span>⚠️</span>
              首次使用前请配置 DeepSeek API Key，否则 AI 功能无法使用。
            </div>
          )}
          <AISettings onSaved={onKeyConfigured} />
        </div>
      </div>
    </div>
  );
};
