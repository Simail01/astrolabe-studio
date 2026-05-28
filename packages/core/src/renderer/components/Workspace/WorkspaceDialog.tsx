import React from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { bridge } from '../../services/bridge';
import { Button } from '../ui/Button';
import { toast } from '../../stores/toast.store';
import type { Workspace } from '@astrolabe/shared';

const overlay: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.6)',
  display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100,
};

const card: React.CSSProperties = {
  backgroundColor: 'var(--bg-panel)', borderRadius: 8, padding: 32, width: 400,
  textAlign: 'center', color: 'var(--text-primary)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

const title: React.CSSProperties = { fontSize: 20, color: 'var(--text-inverse)', marginBottom: 8 };
const subtitle: React.CSSProperties = { fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 };

const btn: React.CSSProperties = {
  padding: '10px 24px', fontSize: 14, borderRadius: 4, cursor: 'pointer', border: 'none', margin: 4,
};

const btnPrimary: React.CSSProperties = { ...btn, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' };
const btnSecondary: React.CSSProperties = { ...btn, backgroundColor: 'var(--border-default)', color: 'var(--text-primary)' };

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

  const handleSeedExample = async () => {
    const folder = await bridge.selectFolder();
    if (!folder) return;
    try {
      const ws = await bridge.openWorkspace(folder) as Workspace;
      if (ws.projects.length === 0) {
        const name = await bridge.seedExample(folder);
        if (name) {
          const updated = await bridge.openWorkspace(folder) as Workspace;
          setWorkspace(updated);
          toast.success('示例项目已加载');
          return;
        }
      }
      setWorkspace(ws);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '加载示例失败');
    }
  };

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={title}>星盘工坊</div>
        <div style={subtitle}>打开工作区开始创作</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <Button variant="primary" size="lg" onClick={handleOpen}>打开文件夹</Button>
          <Button variant="ghost" size="md" onClick={handleSeedExample}>体验示例项目</Button>
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          选择一个文件夹作为工作区，所有作品将保存在此
        </div>
      </div>
    </div>
  );
};
