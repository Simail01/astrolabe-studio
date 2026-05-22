import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useOutlineStore } from '../../stores/outline.store';
import { bridge } from '../../services/bridge';
import type { Shot } from '@astrolabe/shared';

const container: React.CSSProperties = {
  display: 'flex', height: '100%', backgroundColor: '#1e1e1e', color: '#ccc',
};
const shotList: React.CSSProperties = {
  width: 260, overflow: 'auto', borderRight: '1px solid #3c3c3c',
};
const shotCard: React.CSSProperties = {
  padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #2d2d2d', fontSize: 13,
};
const shotCardActive: React.CSSProperties = { ...shotCard, backgroundColor: '#094771' };
const shotDetail: React.CSSProperties = {
  flex: 1, padding: 16, overflow: 'auto',
};
const field: React.CSSProperties = { marginBottom: 14 };
const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 };
const fieldValue: React.CSSProperties = { fontSize: 13, color: '#ccc' };
const framingTag: React.CSSProperties = {
  display: 'inline-block', padding: '2px 6px', fontSize: 10, backgroundColor: '#0e639c', color: '#fff', borderRadius: 3, marginRight: 4,
};
const angleTag: React.CSSProperties = {
  display: 'inline-block', padding: '2px 6px', fontSize: 10, backgroundColor: '#5a3e00', color: '#dcdcaa', borderRadius: 3, marginRight: 4,
};
const dialogLine: React.CSSProperties = {
  padding: '4px 8px', marginBottom: 4, backgroundColor: '#2d2d2d', borderRadius: 3, fontSize: 12,
};
const header: React.CSSProperties = {
  padding: '8px 12px', fontSize: 12, fontWeight: 600, color: '#999', borderBottom: '1px solid #3c3c3c',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const btn: React.CSSProperties = {
  padding: '4px 12px', fontSize: 12, backgroundColor: '#007acc', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer',
};
const btnAi: React.CSSProperties = { ...btn, backgroundColor: '#5a3e00', color: '#dcdcaa' };

const framingLabels: Record<string, string> = {
  'extreme-long': '远景', 'long': '全景', 'medium': '中景', 'close-up': '特写', 'extreme-close-up': '大特写',
};
const angleLabels: Record<string, string> = {
  'eye-level': '平视', 'high-angle': '俯拍', 'low-angle': '仰拍', 'bird-eye': '鸟瞰', 'dutch': '倾斜',
};

export const StoryboardViewer: React.FC = () => {
  const projectPath = useWorkspaceStore((s) => { const ws = s.workspace; const ap = s.activeProject; return ws && ap ? `${ws.path}/${ap}` : null; });
  const selectedNodeId = useOutlineStore((s) => s.selectedNodeId);
  const [shots, setShots] = useState<Shot[]>([]);
  const [selectedShotIdx, setSelectedShotIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [genProgress, setGenProgress] = useState('');

  // Load existing storyboard
  useEffect(() => {
    if (!projectPath || !selectedNodeId) return;
    bridge.pipelineGetStoryboard(projectPath, selectedNodeId).then((data: any) => {
      if (data?.shots) setShots(data.shots);
    }).catch(() => {});
  }, [projectPath, selectedNodeId]);

  const handleDecompose = async () => {
    if (!projectPath || !selectedNodeId) return;
    setLoading(true);
    try {
      const result = await bridge.storyboardDecompose(projectPath, selectedNodeId) as Shot[];
      if (result?.length) {
        setShots(result);
        setSelectedShotIdx(0);
        // Save to disk
        await bridge.pipelineSaveStoryboard(projectPath, {
          id: `sb-${selectedNodeId}`,
          chapterId: selectedNodeId,
          shots: result,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleGenerateComic = async () => {
    if (!shots.length) return;
    setGenProgress('正在生成漫画...');
    const model = await bridge.getAIKey('volcengine-image-model') || 'doubao-seedream-5-0-260128';
    const updatedShots = [...shots];
    for (let i = 0; i < updatedShots.length; i++) {
      const shot = updatedShots[i];
      setGenProgress(`生成中: 镜头 ${i + 1}/${updatedShots.length}`);
      try {
        const charDesc = (shot.characters || []).map((c: any) => `${c.characterId}(${c.expression || ''} ${c.pose || ''})`).join(',');
        const prompt = `漫画风格，${shot.framing}，${shot.angle}。场景：${shot.scene || ''}。${charDesc}。氛围：${shot.mood || ''}。道具：${(shot.props || []).join('，')}`;
        const urls = await bridge.generateImage({ model, prompt, size: '2K' }) as string[];
        if (urls?.length) {
          updatedShots[i] = { ...shot, notes: urls[0] };
        }
      } catch (e) { console.error(`Shot ${i + 1} failed:`, e); }
    }
    setShots(updatedShots);
    // Save with generated image URLs
    if (projectPath && selectedNodeId) {
      await bridge.pipelineSaveStoryboard(projectPath, {
        id: `sb-${selectedNodeId}`,
        chapterId: selectedNodeId,
        shots: updatedShots,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setGenProgress('');
  };

  const shot = shots[selectedShotIdx];

  if (!selectedNodeId) {
    return <div style={{ ...container, alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 14 }}>在大纲中选择一个章节节点</div>;
  }

  return (
    <div style={container}>
      <div style={shotList}>
        <div style={header}>
          <span>分镜 ({shots.length})</span>
        </div>
        {!shots.length ? (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>暂无分镜数据</div>
            <button style={btnAi} onClick={handleDecompose} disabled={loading}>
              {loading ? 'AI 拆解中...' : 'AI 分镜拆解'}
            </button>
          </div>
        ) : (
          shots.map((s, i) => (
            <div key={s.id || i} style={i === selectedShotIdx ? shotCardActive : shotCard} onClick={() => setSelectedShotIdx(i)}>
              <div style={{ color: '#4ec9b0', fontSize: 11, marginBottom: 2 }}>镜头 {i + 1}</div>
              <div style={{ fontSize: 12 }}>{(s.scene || '').slice(0, 30) || '（无场景）'}</div>
              <div style={{ marginTop: 4 }}>
                <span style={framingTag}>{framingLabels[s.framing] || s.framing}</span>
                <span style={angleTag}>{angleLabels[s.angle] || s.angle}</span>
              </div>
              {s.notes && <div style={{ fontSize: 10, color: '#4ec9b0', marginTop: 2 }}>✓ 已生成</div>}
            </div>
          ))
        )}
      </div>
      <div style={shotDetail}>
        {shot ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, color: '#fff', fontWeight: 600 }}>镜头 {selectedShotIdx + 1}</div>
                <div style={{ marginTop: 4 }}>
                  <span style={framingTag}>{framingLabels[shot.framing] || shot.framing}</span>
                  <span style={angleTag}>{angleLabels[shot.angle] || shot.angle}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {shots.length > 0 && <button style={btnAi} onClick={handleDecompose} disabled={loading}>重新拆解</button>}
                <button style={btn} onClick={handleGenerateComic} disabled={!!genProgress}>{genProgress || '生成漫画'}</button>
              </div>
            </div>

            {genProgress && (
              <div style={{ padding: '8px 12px', backgroundColor: '#094771', color: '#fff', fontSize: 13, borderRadius: 4, marginBottom: 12 }}>
                {genProgress}
              </div>
            )}

            <div style={field}>
              <div style={fieldLabel}>场景</div>
              <div style={fieldValue}>{shot.scene || '—'}</div>
            </div>
            <div style={field}>
              <div style={fieldLabel}>角色</div>
              <div style={fieldValue}>
                {(shot.characters || []).length > 0
                  ? shot.characters.map((c: any, i: number) => (
                      <span key={i} style={{ display: 'inline-block', padding: '2px 6px', margin: '0 4px 4px 0', backgroundColor: '#3c3c3c', borderRadius: 3, fontSize: 11 }}>
                        {c.characterId} {c.expression ? `·${c.expression}` : ''} {c.pose ? `·${c.pose}` : ''}
                      </span>
                    ))
                  : '—'}
              </div>
            </div>
            <div style={field}>
              <div style={fieldLabel}>对话</div>
              {(shot.dialogue || []).length > 0
                ? shot.dialogue.map((d: any, i: number) => (
                    <div key={i} style={dialogLine}>
                      <span style={{ color: '#dcdcaa', fontWeight: 600 }}>{d.speakerId}: </span>
                      <span>{d.text}</span>
                    </div>
                  ))
                : <div style={fieldValue}>—</div>}
            </div>
            <div style={field}>
              <div style={fieldLabel}>道具</div>
              <div style={fieldValue}>{(shot.props || []).join('、') || '—'}</div>
            </div>
            <div style={field}>
              <div style={fieldLabel}>氛围</div>
              <div style={fieldValue}>{shot.mood || '—'}</div>
            </div>

            {/* Generated image preview */}
            {shot.notes && (
              <div style={{ ...field, borderTop: '1px solid #3c3c3c', paddingTop: 12 }}>
                <div style={fieldLabel}>生成结果</div>
                <img src={shot.notes} alt={`镜头 ${selectedShotIdx + 1}`}
                  style={{ maxWidth: '100%', borderRadius: 6, border: '1px solid #444' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
            选择左侧镜头查看详情
          </div>
        )}
      </div>
    </div>
  );
};
