import React from 'react';
import { usePipelineStore } from '../../stores/pipeline.store';
import type { PipelineStage } from '@astrolabe/shared';

const panel: React.CSSProperties = {
  padding: 12, color: '#ccc', backgroundColor: '#1e1e1e', height: '100%',
};
const title: React.CSSProperties = { fontSize: 14, color: '#fff', marginBottom: 12 };
const stageList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };

const stageLabels: Record<PipelineStage, string> = {
  outline: '大纲', characters: '人物', chapters: '章节',
  storyboard: '分镜', comic: '漫画', video: '漫剧',
};

const stageOrder: PipelineStage[] = ['outline', 'characters', 'chapters', 'storyboard', 'comic', 'video'];

const statusColors: Record<string, string> = {
  done: '#4ec9b0', 'in-progress': '#dcdcaa', pending: '#666',
};
const statusLabels: Record<string, string> = {
  done: '✓', 'in-progress': '◉', pending: '○',
};

export const PipelinePanel: React.FC = () => {
  const { currentStage, stages, setCurrentStage } = usePipelineStore();

  return (
    <div style={panel}>
      <div style={title}>创作管线</div>
      <div style={stageList}>
        {stageOrder.map((stage, i) => {
          const info = stages[stage];
          const isCurrent = currentStage === stage;
          return (
            <div
              key={stage}
              onClick={() => setCurrentStage(stage)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                cursor: 'pointer', borderRadius: 4, fontSize: 13,
                backgroundColor: isCurrent ? '#094771' : 'transparent',
                color: isCurrent ? '#fff' : '#999',
              }}
            >
              <span style={{ color: statusColors[info.status], fontWeight: 'bold' }}>
                {statusLabels[info.status]}
              </span>
              <span>{stageLabels[stage]}</span>
              {i < stageOrder.length - 1 && (
                <span style={{ marginLeft: 'auto', color: '#555', fontSize: 11 }}>→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
