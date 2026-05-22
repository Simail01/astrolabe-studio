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
  const projectName = workspace?.name ?? '未打开项目';

  return (
    <div style={bar}>
      <span>项目: {projectName}</span>
      <span>AI: 就绪</span>
    </div>
  );
};
