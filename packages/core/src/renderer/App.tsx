import React, { useEffect, useState } from 'react';
import { GlobalNav, AppMode, CreateStage, VisualizeStage } from './components/Shell/GlobalNav';
import { BottomBar } from './components/Shell/BottomBar';
import { WritingPage } from './components/Pages/WritingPage';
import { OutlinePage } from './components/Pages/OutlinePage';
import { StoryboardViewer } from './components/Pipeline/StoryboardViewer';
import { ComicPage } from './components/Pages/ComicPage';
import { Explorer } from './components/Explorer/Explorer';
import { WorkspaceDialog } from './components/Workspace/WorkspaceDialog';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { AIBubble } from './components/AI/AIBubble';
import { TemplateEditor } from './components/Template/TemplateEditor';
import { useKeyboard } from './hooks/useKeyboard';
import { useWorkspaceStore } from './stores/workspace.store';
import { useTemplateStore } from './stores/template.store';
import { bridge } from './services/bridge';
import type { Workspace } from '@astrolabe/shared';

export const App: React.FC = () => {
  useKeyboard();
  const [mode, setMode] = useState<AppMode>('create');
  const [stage, setStage] = useState<CreateStage>('outline');
  const [vizStage, setVizStage] = useState<VisualizeStage>('storyboard');
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

  // Load templates when workspace changes
  const workspace = useWorkspaceStore(s => s.workspace);
  useEffect(() => {
    if (workspace) {
      useTemplateStore.getState().loadTemplates(workspace.path);
    }
  }, [workspace]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <WorkspaceDialog />
      <SettingsPanel />
      <SettingsPanel forceOpen={firstRun} onKeyConfigured={() => setFirstRun(false)} />
      <TemplateEditor />

      <GlobalNav mode={mode} onModeChange={setMode} stage={stage} onStageChange={setStage} vizStage={vizStage} onVizStageChange={setVizStage} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {mode === 'create' && <Explorer />}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {mode === 'create' && stage === 'writing' && <WritingPage />}
          {mode === 'create' && stage === 'outline' && <OutlinePage />}
          {mode === 'visualize' && vizStage === 'storyboard' && <StoryboardViewer />}
          {mode === 'visualize' && vizStage === 'comic' && <ComicPage />}
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
