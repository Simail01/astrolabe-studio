import React from 'react';
import { useLayoutStore } from '../../stores/layout.store';
import { useWorkspaceStore } from '../../stores/workspace.store';

const panel: React.CSSProperties = {
  width: 260,
  minWidth: 200,
  backgroundColor: '#252526',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const title: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  color: '#999',
  letterSpacing: 1,
};

const empty: React.CSSProperties = {
  padding: 12,
  color: '#666',
  fontSize: 13,
};

export const Explorer: React.FC = () => {
  const sidebarVisible = useLayoutStore((s) => s.sidebarVisible);
  const workspace = useWorkspaceStore((s) => s.workspace);

  if (!sidebarVisible) return null;

  return (
    <div style={panel}>
      <div style={title}>资源管理器</div>
      <div style={empty}>
        {workspace ? `工作区: ${workspace.name}` : '未打开工作区'}
      </div>
    </div>
  );
};
