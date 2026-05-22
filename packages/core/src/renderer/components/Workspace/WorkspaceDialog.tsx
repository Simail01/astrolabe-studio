import React from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { bridge } from '../../services/bridge';
import type { Workspace } from '@astrolabe/shared';

const overlay: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.6)',
  display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100,
};

const card: React.CSSProperties = {
  backgroundColor: '#252526', borderRadius: 8, padding: 32, width: 400,
  textAlign: 'center', color: '#ccc', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

const title: React.CSSProperties = { fontSize: 20, color: '#fff', marginBottom: 8 };
const subtitle: React.CSSProperties = { fontSize: 14, color: '#999', marginBottom: 24 };

const btn: React.CSSProperties = {
  padding: '10px 24px', fontSize: 14, borderRadius: 4, cursor: 'pointer', border: 'none', margin: 4,
};

const btnPrimary: React.CSSProperties = { ...btn, backgroundColor: '#007acc', color: '#fff' };
const btnSecondary: React.CSSProperties = { ...btn, backgroundColor: '#3c3c3c', color: '#ccc' };

export const WorkspaceDialog: React.FC = () => {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);

  if (workspace) return null;

  const handleOpen = async () => {
    const folder = await bridge.selectFolder();
    if (!folder) return;
    const ws = await bridge.openWorkspace(folder) as Workspace;
    setWorkspace(ws);
  };

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={title}>星盘工坊</div>
        <div style={subtitle}>打开工作区开始创作</div>
        <button style={btnPrimary} onClick={handleOpen}>打开文件夹</button>
        <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
          选择一个文件夹作为工作区，所有作品将保存在此
        </div>
      </div>
    </div>
  );
};
