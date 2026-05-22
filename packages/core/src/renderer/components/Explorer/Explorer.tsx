import React, { useState, useEffect } from 'react';
import { useLayoutStore } from '../../stores/layout.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useOutlineStore } from '../../stores/outline.store';
import { useWikiStore } from '../../stores/wiki.store';
import { useFanlibStore } from '../../stores/fanlib.store';
import { CreateProjectDialog } from '../Project/CreateProjectDialog';
import { bridge } from '../../services/bridge';
import type { AstrolabeConfig, Outline, WikiEntry } from '@astrolabe/shared';

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
  const activeProject = useWorkspaceStore((s) => s.activeProject);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const activeProjectStyle: React.CSSProperties = {
    ...projectItem,
    backgroundColor: '#094771',
    color: '#fff',
  };

  // Load fanlib cards when workspace opens (workspace-level, not project-level)
  useEffect(() => {
    if (!workspace) return;
    bridge.fanlibSearch(workspace.path, '').then((cards) => {
      if (cards && Array.isArray(cards)) useFanlibStore.getState().setCards(cards as any[]);
    }).catch(() => {});
  }, [workspace]);

  // When active project changes, load outline and wiki from disk
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

  if (!sidebarVisible) return null;

  return (
    <div style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px' }}>
        <div style={title}>{workspace ? workspace.name : '资源管理器'}</div>
        {workspace && (
          <button
            onClick={() => setShowCreateDialog(true)}
            style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 16, padding: '2px 4px' }}
            title="新建作品"
          >
            +
          </button>
        )}
      </div>
      <div style={list}>
        {workspace && workspace.projects.length > 0 ? (
          workspace.projects.map((name) => (
            <div key={name} style={name === activeProject ? activeProjectStyle : projectItem} onClick={() => setActiveProject(name)}>
              <span style={fileIcon}>{name === activeProject ? '📂' : '📄'}</span>
              {name}
            </div>
          ))
        ) : (
          <div style={empty}>
            {workspace ? '暂无作品，使用菜单创建' : '未打开工作区'}
          </div>
        )}
      </div>

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
