import React from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store';

const bar: React.CSSProperties = {
  height: 24,
  backgroundColor: '#007acc',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 12px',
  fontSize: 12,
  color: '#ffffff',
};

export const StatusBar: React.FC = () => {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const activeProject = useWorkspaceStore((s) => s.activeProject);
  const label = activeProject
    ? `${workspace?.name ?? ''} / ${activeProject}`
    : workspace?.name ?? '未打开项目';

  return (
    <div style={bar}>
      <span>{label}</span>
      <span>AI: 就绪</span>
    </div>
  );
};
