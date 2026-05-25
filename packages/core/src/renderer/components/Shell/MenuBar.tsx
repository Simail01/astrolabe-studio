import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLayoutStore } from '../../stores/layout.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useCommandStore } from '../../stores/command.store';
import { bridge } from '../../services/bridge';
import type { Workspace } from '@astrolabe/shared';

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  divider?: boolean;
  disabled?: boolean;
}

interface MenuDef {
  label: string;
  items: MenuItem[];
}

export const MenuBar: React.FC = () => {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpenMenu(null), []);

  useEffect(() => {
    if (openMenu === null) return;
    const handleClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenu, close]);

  const menus: MenuDef[] = [
    {
      label: '文件',
      items: [
        { label: '打开工作区…', action: async () => { close(); const folder = await bridge.selectFolder(); if (folder) { const ws = await bridge.openWorkspace(folder) as Workspace; useWorkspaceStore.getState().setWorkspace(ws); } } },
        { label: '新建作品…', action: () => { close(); const ws = useWorkspaceStore.getState().workspace; if (!ws) return alert('请先打开工作区'); useWorkspaceStore.getState().openCreateDialog(); } },
        { divider: true, label: '' },
        { label: '导出小说 (TXT)…', action: async () => { close(); const ws = useWorkspaceStore.getState(); const pp = ws.getProjectPath(); if (!pp) return alert('请先选择作品'); try { await bridge.exportNovel(pp, 'txt'); } catch (e) { alert('导出失败: ' + (e as Error).message); } } },
        { label: '导出小说 (EPUB)…', action: async () => { close(); const ws = useWorkspaceStore.getState(); const pp = ws.getProjectPath(); if (!pp) return alert('请先选择作品'); try { await bridge.exportNovel(pp, 'epub'); } catch (e) { alert('导出失败: ' + (e as Error).message); } } },
        { label: '导出漫画 (HTML)…', action: async () => { close(); const ws = useWorkspaceStore.getState(); const pp = ws.getProjectPath(); if (!pp) return alert('请先选择作品'); try { await bridge.exportComic(pp, 'html'); } catch (e) { alert('导出失败: ' + (e as Error).message); } } },
        { divider: true, label: '' },
        { label: '设置', shortcut: 'Ctrl+,', action: () => { close(); useLayoutStore.getState().openSettings(); } },
      ],
    },
    {
      label: '视图',
      items: [
        { label: '命令面板', shortcut: 'Ctrl+Shift+P', action: () => { close(); useCommandStore.getState().togglePalette(); } },
        { divider: true, label: '' },
        { label: '切换侧边栏', shortcut: 'Ctrl+B', action: () => { close(); useLayoutStore.getState().toggleSidebar(); } },
        { label: '切换右面板', shortcut: 'Ctrl+R', action: () => { close(); useLayoutStore.getState().toggleRightPanel(); } },
        { label: 'Wiki 面板', action: () => { close(); useLayoutStore.getState().setRightPanelMode('wiki'); useLayoutStore.getState().openRightPanel(); } },
        { label: '同人库面板', action: () => { close(); useLayoutStore.getState().setRightPanelMode('fanlib'); useLayoutStore.getState().openRightPanel(); } },
      ],
    },
    {
      label: '帮助',
      items: [
        { label: '关于星盘工坊', action: () => { close(); alert('星盘工坊 v2.0\nAI 赋能的个人创作工作台\n小说 · 漫画 · 漫剧'); } },
      ],
    },
  ];

  return (
    <div ref={barRef} style={{ display: 'flex', alignItems: 'center', height: '100%', position: 'relative' }}>
      {menus.map((menu, mi) => (
        <div key={menu.label} style={{ position: 'relative' }}>
          <span
            onClick={() => setOpenMenu(openMenu === mi ? null : mi)}
            onMouseEnter={() => { if (openMenu !== null) setOpenMenu(mi); }}
            style={{
              fontSize: 12, cursor: 'pointer', padding: '4px 10px', borderRadius: 3,
              color: openMenu === mi ? 'var(--text-inverse)' : 'var(--text-secondary)',
              backgroundColor: openMenu === mi ? 'var(--accent-dim)' : 'transparent',
            }}
          >{menu.label}</span>
          {openMenu === mi && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 2,
              minWidth: 200, backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-subtle)',
              borderRadius: 4, padding: '4px 0', zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}>
              {menu.items.map((item, ii) => item.divider ? (
                <div key={ii} style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '4px 8px' }} />
              ) : (
                <div
                  key={ii}
                  onClick={() => { if (!item.disabled) item.action?.(); }}
                  style={{
                    padding: '6px 16px', fontSize: 12, cursor: item.disabled ? 'default' : 'pointer',
                    color: item.disabled ? 'var(--text-muted)' : 'var(--text-primary)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={e => { if (!item.disabled) (e.currentTarget.style.backgroundColor = 'var(--accent-dim)'); }}
                  onMouseLeave={e => { (e.currentTarget.style.backgroundColor = 'transparent'); }}
                >
                  <span>{item.label}</span>
                  {item.shortcut && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 24 }}>{item.shortcut}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
