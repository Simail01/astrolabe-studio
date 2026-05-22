import React from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store';

export const BottomBar: React.FC = () => {
  const workspace = useWorkspaceStore(s => s.workspace);
  const activeProject = useWorkspaceStore(s => s.activeProject);
  const label = activeProject ? `${workspace?.name ?? ''} / ${activeProject}` : workspace?.name ?? '未打开项目';

  return (
    <div style={{
      height: 24, backgroundColor: 'var(--bg-panel)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 12px', fontSize: 11, color: 'var(--text-secondary)',
      borderTop: '1px solid var(--border-subtle)', flexShrink: 0,
    }}>
      <span>{label}</span>
      <span style={{ color: 'var(--accent)' }}>AI 就绪</span>
    </div>
  );
};
