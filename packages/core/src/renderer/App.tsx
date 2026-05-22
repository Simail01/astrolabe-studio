import React, { useEffect, useState } from 'react';
import { GlobalNav, AppMode, CreateStage } from './components/Shell/GlobalNav';
import { BottomBar } from './components/Shell/BottomBar';
import { WritingPage } from './components/Pages/WritingPage';
import { OutlinePage } from './components/Pages/OutlinePage';
import { Explorer } from './components/Explorer/Explorer';
import { WorkspaceDialog } from './components/Workspace/WorkspaceDialog';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { AIBubble } from './components/AI/AIBubble';
import { useKeyboard } from './hooks/useKeyboard';
import { useWorkspaceStore } from './stores/workspace.store';
import { bridge } from './services/bridge';
import type { Workspace } from '@astrolabe/shared';

export const App: React.FC = () => {
  useKeyboard();
  const [mode, setMode] = useState<AppMode>('create');
  const [stage, setStage] = useState<CreateStage>('outline');
  const [firstRun, setFirstRun] = useState(false);

  useEffect(() => {
    bridge.getLastWorkspace().then((wsPath) => {
      if (wsPath && typeof wsPath === 'string') {
        bridge.openWorkspace(wsPath).then(ws => {
          useWorkspaceStore.getState().setWorkspace(ws as Workspace);
        });
      }
    });
    bridge.getAIKey('deepseek').then(key => { if (!key) setFirstRun(true); });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <WorkspaceDialog />
      <SettingsPanel />
      <SettingsPanel forceOpen={firstRun} onKeyConfigured={() => setFirstRun(false)} />

      <GlobalNav mode={mode} onModeChange={setMode} stage={stage} onStageChange={setStage} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {mode === 'create' && <Explorer />}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {mode === 'create' && stage === 'writing' && <WritingPage />}
          {mode === 'create' && stage === 'outline' && <OutlinePage />}
          {mode === 'visualize' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 16 }}>
              视觉化模式 — 即将实现
            </div>
          )}
          {mode === 'perform' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 16 }}>
              演出模式 — 即将实现
            </div>
          )}
        </div>
      </div>

      <BottomBar />
      <CommandPalette />
      <AIBubble />
    </div>
  );
};
