import React from 'react';
import { MenuBar } from './MenuBar';

export type AppMode = 'create' | 'visualize' | 'perform';
export type CreateStage = 'outline' | 'writing';
export type VisualizeStage = 'storyboard' | 'comic';

interface Props {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  stage?: CreateStage;
  onStageChange?: (stage: CreateStage) => void;
  vizStage?: VisualizeStage;
  onVizStageChange?: (stage: VisualizeStage) => void;
}

const modes: { key: AppMode; label: string }[] = [
  { key: 'create', label: '创作' },
  { key: 'visualize', label: '视觉化' },
  { key: 'perform', label: '演出' },
];

const createStages: { key: CreateStage; label: string }[] = [
  { key: 'outline', label: '大纲' },
  { key: 'writing', label: '写作' },
];

const visualizeStages: { key: VisualizeStage; label: string }[] = [
  { key: 'storyboard', label: '分镜' },
  { key: 'comic', label: '漫画' },
];

export const GlobalNav: React.FC<Props> = ({ mode, onModeChange, stage, onStageChange, vizStage, onVizStageChange }) => (
  <div style={{
    height: 30, backgroundColor: 'var(--bg-panel)',
    display: 'flex', alignItems: 'center', padding: '0 8px', gap: 16,
    borderBottom: '1px solid var(--border-subtle)', userSelect: 'none', flexShrink: 0,
  }}>
    <MenuBar />
    <span style={{ color: 'var(--border-default)', fontSize: 12 }}>│</span>
    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>星盘工坊</span>
    {modes.map(m => (
      <span
        key={m.key}
        onClick={() => onModeChange(m.key)}
        style={{
          fontSize: 13, cursor: 'pointer',
          color: mode === m.key ? 'var(--text-inverse)' : 'var(--text-secondary)',
          fontWeight: mode === m.key ? 600 : 400,
          padding: '4px 8px', borderRadius: 4,
          backgroundColor: mode === m.key ? 'var(--accent-dim)' : 'transparent',
        }}
      >{m.label}</span>
    ))}
    {mode === 'create' && onStageChange && (
      <>
        <span style={{ color: 'var(--border-default)', fontSize: 12 }}>│</span>
        {createStages.map(s => (
          <span key={s.key} onClick={() => onStageChange(s.key)} style={{ fontSize: 13, cursor: 'pointer', color: stage === s.key ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: stage === s.key ? 500 : 400 }}>{s.label}</span>
        ))}
      </>
    )}
    {mode === 'visualize' && onVizStageChange && (
      <>
        <span style={{ color: 'var(--border-default)', fontSize: 12 }}>│</span>
        {visualizeStages.map(s => (
          <span key={s.key} onClick={() => onVizStageChange(s.key)} style={{ fontSize: 13, cursor: 'pointer', color: vizStage === s.key ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: vizStage === s.key ? 500 : 400 }}>{s.label}</span>
        ))}
      </>
    )}
    <div style={{ flex: 1 }} />
    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>v2.0</span>
  </div>
);
