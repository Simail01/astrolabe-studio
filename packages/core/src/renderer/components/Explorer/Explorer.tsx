import React from 'react';
import { useLayoutStore } from '../../stores/layout.store';
import { useWorkspaceStore } from '../../stores/workspace.store';

const panel: React.CSSProperties = {
  width: 260, minWidth: 200, backgroundColor: '#252526', display: 'flex', flexDirection: 'column', overflow: 'hidden',
};
const title: React.CSSProperties = {
  padding: '8px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#999', letterSpacing: 1,
};
const list: React.CSSProperties = { flex: 1, overflow: 'auto' };
const projectItem: React.CSSProperties = {
  padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#ccc', display: 'flex', alignItems: 'center', gap: 6,
};
const empty: React.CSSProperties = { padding: 12, color: '#666', fontSize: 13 };

const fileIcon: React.CSSProperties = { fontSize: 14 };

export const Explorer: React.FC = () => {
  const sidebarVisible = useLayoutStore((s) => s.sidebarVisible);
  const workspace = useWorkspaceStore((s) => s.workspace);

  if (!sidebarVisible) return null;

  return (
    <div style={panel}>
      <div style={title}>{workspace ? workspace.name : '资源管理器'}</div>
      <div style={list}>
        {workspace && workspace.projects.length > 0 ? (
          workspace.projects.map((name) => (
            <div key={name} style={projectItem}>
              <span style={fileIcon}>📄</span>
              {name}
            </div>
          ))
        ) : (
          <div style={empty}>
            {workspace ? '暂无作品，使用菜单创建' : '未打开工作区'}
          </div>
        )}
      </div>
    </div>
  );
};
