import React, { useEffect, useState, Suspense, lazy } from 'react';
import { GlobalNav, AppMode, CreateStage, VisualizeStage } from './components/Shell/GlobalNav';
import { BottomBar } from './components/Shell/BottomBar';
import { Explorer } from './components/Explorer/Explorer';
import { WorkspaceDialog } from './components/Workspace/WorkspaceDialog';
import { CreateProjectDialog } from './components/Project/CreateProjectDialog';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { AIBubble } from './components/AI/AIBubble';
import { ToastContainer } from './components/Shell/ToastContainer';
import { FirstRunWizard } from './components/Onboarding/FirstRunWizard';
import { TemplateEditor } from './components/Template/TemplateEditor';
import { UpdateNotification } from './components/Shell/UpdateNotification';
import { useKeyboard } from './hooks/useKeyboard';
import { useWorkspaceStore } from './stores/workspace.store';
import { useLayoutStore } from './stores/layout.store';
import { useTemplateStore } from './stores/template.store';
import { bridge } from './services/bridge';
import type { Workspace, AstrolabeConfig } from '@astrolabe/shared';

// Lazy-loaded page components (non首屏)
const WritingPage = lazy(() => import('./components/Pages/WritingPage').then(m => ({ default: m.WritingPage })));
const OutlinePage = lazy(() => import('./components/Pages/OutlinePage').then(m => ({ default: m.OutlinePage })));
const DashboardPage = lazy(() => import('./components/Pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const StoryboardViewer = lazy(() => import('./components/Pipeline/StoryboardViewer').then(m => ({ default: m.StoryboardViewer })));
const ComicPage = lazy(() => import('./components/Pages/ComicPage').then(m => ({ default: m.ComicPage })));
const ComicPreview = lazy(() => import('./components/Comic/ComicPreview').then(m => ({ default: m.ComicPreview })));
const TimelineView = lazy(() => import('./components/Timeline/TimelineView').then(m => ({ default: m.TimelineView })));
const CharacterArcView = lazy(() => import('./components/Arc/CharacterArcView').then(m => ({ default: m.CharacterArcView })));
const WikiPanel = lazy(() => import('./components/Wiki/WikiPanel').then(m => ({ default: m.WikiPanel })));
const FanlibPanel = lazy(() => import('./components/Fanlib/FanlibPanel').then(m => ({ default: m.FanlibPanel })));
const PromptLogPanel = lazy(() => import('./components/PromptLog/PromptLogPanel').then(m => ({ default: m.PromptLogPanel })));
const DesignPanel = lazy(() => import('./components/Design/DesignPanel').then(m => ({ default: m.DesignPanel })));

const PageFallback: React.FC = () => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
    加载中…
  </div>
);

export const App: React.FC = () => {
  useKeyboard();
  const [mode, setMode] = useState<AppMode>('create');
  const [stage, setStage] = useState<CreateStage>('dashboard');
  const [vizStage, setVizStage] = useState<VisualizeStage>('storyboard');
  const [firstRun, setFirstRun] = useState(false);
  const rightPanelVisible = useLayoutStore((s) => s.rightPanelVisible);
  const rightPanelMode = useLayoutStore((s) => s.rightPanelMode);
  const createDialogOpen = useWorkspaceStore((s) => s.createDialogOpen);
  const closeCreateDialog = useWorkspaceStore((s) => s.closeCreateDialog);
  const workspace = useWorkspaceStore((s) => s.workspace);

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
  useEffect(() => {
    if (workspace) {
      useTemplateStore.getState().loadTemplates(workspace.path);
    }
  }, [workspace]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <WorkspaceDialog />
      <SettingsPanel />
      <FirstRunWizard open={firstRun} onComplete={() => setFirstRun(false)} />
      <TemplateEditor />
      {createDialogOpen && workspace && (
        <CreateProjectDialog
          onClose={closeCreateDialog}
          onCreated={(project: AstrolabeConfig) => {
            useWorkspaceStore.getState().setWorkspace({
              ...workspace,
              projects: [...workspace.projects, project.title],
            });
            useWorkspaceStore.getState().setActiveProject(project.title);
            closeCreateDialog();
          }}
        />
      )}

      <GlobalNav mode={mode} onModeChange={setMode} stage={stage} onStageChange={setStage} vizStage={vizStage} onVizStageChange={setVizStage} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {mode === 'create' && <Explorer />}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Suspense fallback={<PageFallback />}>
            {mode === 'create' && stage === 'dashboard' && <DashboardPage />}
            {mode === 'create' && stage === 'writing' && <WritingPage />}
            {mode === 'create' && stage === 'outline' && <OutlinePage />}
            {mode === 'create' && stage === 'timeline' && <TimelineView />}
            {mode === 'create' && stage === 'arc' && <CharacterArcView />}
            {mode === 'visualize' && vizStage === 'storyboard' && <StoryboardViewer />}
            {mode === 'visualize' && vizStage === 'comic' && <ComicPage />}
            {mode === 'visualize' && vizStage === 'preview' && <ComicPreview />}
            {mode === 'perform' && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 16 }}>
                演出模式 — 即将实现
              </div>
            )}
          </Suspense>
        </div>

        {rightPanelVisible && (
          <div style={{ width: 320, borderLeft: '1px solid var(--border-subtle)', overflow: 'hidden', flexShrink: 0 }}>
            <Suspense fallback={<PageFallback />}>
              {rightPanelMode === 'wiki' ? <WikiPanel /> : rightPanelMode === 'fanlib' ? <FanlibPanel /> : rightPanelMode === 'design' ? <DesignPanel /> : <PromptLogPanel />}
            </Suspense>
          </div>
        )}
      </div>

      <BottomBar />
      <CommandPalette />
      <AIBubble />
      <ToastContainer />
      <UpdateNotification />
    </div>
  );
};
