import React, { useState, useEffect, useCallback } from 'react';
import { useLayoutStore } from '../../stores/layout.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useOutlineStore } from '../../stores/outline.store';
import { useWikiStore } from '../../stores/wiki.store';
import { useFanlibStore } from '../../stores/fanlib.store';
import { CreateProjectDialog } from '../Project/CreateProjectDialog';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';
import { bridge } from '../../services/bridge';
import { toast } from '../../stores/toast.store';
import type { AstrolabeConfig, Outline, WikiEntry } from '@astrolabe/shared';

const panel: React.CSSProperties = {
  width: 260, minWidth: 200, backgroundColor: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
};
const title: React.CSSProperties = {
  padding: '8px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: 1,
};
const list: React.CSSProperties = { flex: 1, overflow: 'auto' };
const projectItem: React.CSSProperties = {
  padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6,
};
const fileIcon: React.CSSProperties = { fontSize: 14 };

export const Explorer: React.FC = () => {
  const sidebarVisible = useLayoutStore((s) => s.sidebarVisible);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const activeProject = useWorkspaceStore((s) => s.activeProject);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const activeProjectStyle: React.CSSProperties = {
    ...projectItem,
    backgroundColor: 'var(--accent-dim)',
    color: 'var(--text-inverse)',
  };

  useEffect(() => {
    if (!workspace) return;
    bridge.fanlibSearch(workspace.path, '').then((cards) => {
      if (cards && Array.isArray(cards)) useFanlibStore.getState().setCards(cards as any[]);
    }).catch(() => {});
  }, [workspace]);

  useEffect(() => {
    if (!workspace || !activeProject) return;
    const projectPath = `${workspace.path}/${activeProject}`;
    bridge.pipelineGetOutline(projectPath).then((data) => {
      if (data) useOutlineStore.getState().setOutline(data as Outline);
    }).catch(() => {});
    bridge.wikiSearch(projectPath, '').then((entries) => {
      if (entries) useWikiStore.getState().setEntries(entries as WikiEntry[]);
    }).catch(() => {});
  }, [activeProject, workspace]);

  // 持久化 workspace（含 lastOpened）到磁盘
  useEffect(() => {
    if (!workspace) return;
    bridge.writeFile(`${workspace.path}/astrolabe-workspace.json`, JSON.stringify(workspace, null, 2)).catch(() => {});
  }, [workspace]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => closeContextMenu();
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu, closeContextMenu]);

  const handleContextMenu = (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, name });
  };

  const handleDelete = async () => {
    if (!workspace || !deleteTarget) return;
    const projectPath = `${workspace.path}/${deleteTarget}`;
    try {
      await bridge.deleteProject(projectPath);
      const updated = workspace.projects.filter((p) => p !== deleteTarget);
      useWorkspaceStore.getState().setWorkspace({ ...workspace, projects: updated });
      if (activeProject === deleteTarget) setActiveProject(null);
      toast.success(`已删除「${deleteTarget}」`);
    } catch {
      toast.error('删除失败');
    }
    setDeleteTarget(null);
  };

  const handleRename = async () => {
    if (!workspace || !renameTarget || !renameValue.trim()) return;
    const newName = renameValue.trim();
    if (newName === renameTarget) { setRenameTarget(null); return; }
    if (workspace.projects.includes(newName)) {
      toast.warning('已存在同名作品');
      return;
    }
    const oldPath = `${workspace.path}/${renameTarget}`;
    const newPath = `${workspace.path}/${newName}`;
    try {
      await bridge.invoke('fs:rename', oldPath, newPath);
      const updated = workspace.projects.map((p) => (p === renameTarget ? newName : p));
      useWorkspaceStore.getState().setWorkspace({ ...workspace, projects: updated });
      if (activeProject === renameTarget) setActiveProject(newName);
      toast.success(`已重命名为「${newName}」`);
    } catch {
      toast.error('重命名失败');
    }
    setRenameTarget(null);
  };

  if (!sidebarVisible) return null;

  return (
    <div style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px' }}>
        <div style={title}>{workspace ? workspace.name : '资源管理器'}</div>
        {workspace && (
          <button
            onClick={() => setShowCreateDialog(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 16, padding: '2px 4px' }}
            title="新建作品"
          >
            +
          </button>
        )}
      </div>
      <div style={list}>
        {workspace && workspace.projects.length > 0 ? (
          [...workspace.projects].sort((a, b) => {
            const ta = workspace.lastOpened?.[a] ?? '';
            const tb = workspace.lastOpened?.[b] ?? '';
            return tb.localeCompare(ta);
          }).map((name) => (
            <div
              key={name}
              style={name === activeProject ? activeProjectStyle : projectItem}
              onClick={() => setActiveProject(name)}
              onContextMenu={(e) => handleContextMenu(e, name)}
            >
              <span style={fileIcon}>{name === activeProject ? <Icon name="folder-open" size={14} color="var(--accent)" /> : <Icon name="file" size={14} color="var(--text-muted)" />}</span>
              {name}
            </div>
          ))
        ) : (
          workspace ? (
            <EmptyState variant="inline" title="暂无作品" action={{ label: "新建作品", onClick: () => setShowCreateDialog(true) }} />
          ) : (
            <EmptyState variant="inline" title="未打开工作区" />
          )
        )}
      </div>

      {contextMenu && (
        <div style={{
          position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 1000,
          backgroundColor: 'var(--editor-panel)', borderRadius: 'var(--radius)',
          border: '1px solid var(--border-subtle)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          padding: '4px 0', minWidth: 120,
        }}>
          <div
            style={{ padding: '6px 16px', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); setRenameTarget(contextMenu.name); setRenameValue(contextMenu.name); setContextMenu(null); }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >重命名</div>
          <div
            style={{ padding: '6px 16px', fontSize: 13, color: 'var(--color-error)', cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(contextMenu.name); setContextMenu(null); }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >删除</div>
        </div>
      )}

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="确认删除" width={360}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          确定要删除「{deleteTarget}」吗？此操作不可撤销，所有项目文件将被永久删除。
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>删除</Button>
        </div>
      </Dialog>

      <Dialog open={!!renameTarget} onClose={() => setRenameTarget(null)} title="重命名作品" width={360}>
        <input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
          style={{
            width: '100%', padding: '8px 10px', fontSize: 13, marginBottom: 16,
            backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)', borderRadius: 'var(--radius)', outline: 'none',
          }}
          autoFocus
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => setRenameTarget(null)}>取消</Button>
          <Button variant="primary" size="sm" onClick={handleRename}>确定</Button>
        </div>
      </Dialog>

      {showCreateDialog && (
        <CreateProjectDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={(project: AstrolabeConfig) => {
            const ws = useWorkspaceStore.getState().workspace;
            if (ws) {
              useWorkspaceStore.getState().setWorkspace({
                ...ws,
                projects: [...ws.projects, project.title],
              });
              setActiveProject(project.title);
            }
          }}
        />
      )}
    </div>
  );
};
