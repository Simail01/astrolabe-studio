import React, { useEffect } from 'react';
import { ActivityBar } from './components/ActivityBar/ActivityBar';
import { TabBar } from './components/TabBar/TabBar';
import { EditorArea } from './components/EditorArea/EditorArea';
import { RightPanel } from './components/RightPanel/RightPanel';
import { BottomPanel } from './components/BottomPanel/BottomPanel';
import { StatusBar } from './components/StatusBar/StatusBar';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { Explorer } from './components/Explorer/Explorer';
import { WorkspaceDialog } from './components/Workspace/WorkspaceDialog';
import { useLayoutStore } from './stores/layout.store';
import { useWorkspaceStore } from './stores/workspace.store';
import { useKeyboard } from './hooks/useKeyboard';
import { bridge } from './services/bridge';
import type { Workspace } from '@astrolabe/shared';

const SHELL: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: '#1e1e1e',
  color: '#cccccc',
};

const MENUBAR: React.CSSProperties = {
  height: 30,
  backgroundColor: '#3c3c3c',
  display: 'flex',
  alignItems: 'center',
  paddingLeft: 12,
  fontSize: 13,
  gap: 16,
};

const MAIN: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
};

const CENTER: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflow: 'hidden',
};

export const App: React.FC = () => {
  useKeyboard();
  const bottomVisible = useLayoutStore((s) => s.bottomPanelVisible);

  // Session restore: auto-load last workspace on startup
  useEffect(() => {
    bridge.getLastWorkspace().then((wsPath) => {
      if (wsPath && typeof wsPath === 'string') {
        bridge.openWorkspace(wsPath).then((ws) => {
          useWorkspaceStore.getState().setWorkspace(ws as Workspace);
        });
      }
    });
  }, []);

  return (
    <div style={SHELL}>
      <WorkspaceDialog />
      <div style={MENUBAR}>
        <span>文件</span>
        <span>编辑</span>
        <span>视图</span>
        <span>帮助</span>
      </div>
      <div style={MAIN}>
        <ActivityBar />
        <Explorer />
        <div style={CENTER}>
          <TabBar />
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <EditorArea />
              {bottomVisible && <BottomPanel />}
            </div>
            <RightPanel />
          </div>
        </div>
      </div>
      <StatusBar />
      <CommandPalette />
    </div>
  );
};
