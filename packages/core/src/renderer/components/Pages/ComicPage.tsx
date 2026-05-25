import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useOutlineStore } from '../../stores/outline.store';
import { bridge } from '../../services/bridge';
import type { Shot } from '@astrolabe/shared';

type Layout = '2x2' | '3x2' | '1big3small' | '2x1';

const layoutGrids: Record<Layout, { rows: number; cols: number; spans: { row: number; col: number; rowSpan: number; colSpan: number }[] }> = {
  '2x2': { rows: 2, cols: 2, spans: [{ row: 0, col: 0, rowSpan: 1, colSpan: 1 }, { row: 0, col: 1, rowSpan: 1, colSpan: 1 }, { row: 1, col: 0, rowSpan: 1, colSpan: 1 }, { row: 1, col: 1, rowSpan: 1, colSpan: 1 }] },
  '3x2': { rows: 3, cols: 2, spans: Array.from({ length: 6 }, (_, i) => ({ row: Math.floor(i / 2), col: i % 2, rowSpan: 1, colSpan: 1 })) },
  '1big3small': { rows: 2, cols: 2, spans: [{ row: 0, col: 0, rowSpan: 2, colSpan: 1 }, { row: 0, col: 1, rowSpan: 1, colSpan: 1 }, { row: 1, col: 1, rowSpan: 1, colSpan: 1 }] },
  '2x1': { rows: 1, cols: 2, spans: [{ row: 0, col: 0, rowSpan: 1, colSpan: 1 }, { row: 0, col: 1, rowSpan: 1, colSpan: 1 }] },
};

interface PanelData {
  shotId?: string;
  shotTitle?: string;
  imageUrl?: string;
}

export const ComicPage: React.FC = () => {
  const projectPath = useWorkspaceStore((s) => { const ws = s.workspace; const ap = s.activeProject; return ws && ap ? `${ws.path}/${ap}` : null; });
  const selectedNodeId = useOutlineStore((s) => s.selectedNodeId);
  const [shots, setShots] = useState<Shot[]>([]);
  const [layout, setLayout] = useState<Layout>('2x2');
  const [panels, setPanels] = useState<PanelData[]>(() => Array.from({ length: layoutGrids['2x2'].spans.length }, () => ({})));
  const [selectedPanel, setSelectedPanel] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState('');

  // Load storyboard shots
  useEffect(() => {
    if (!projectPath || !selectedNodeId) return;
    bridge.pipelineGetStoryboard(projectPath, selectedNodeId).then((d: any) => {
      if (d?.shots) setShots(d.shots);
    }).catch(() => {});
  }, [projectPath, selectedNodeId]);

  // Init panels when layout changes
  useEffect(() => {
    const grid = layoutGrids[layout];
    setPanels(Array.from({ length: grid.spans.length }, () => ({})));
    setSelectedPanel(0);
  }, [layout]);

  const assignShot = (shot: Shot) => {
    const newPanels = [...panels];
    // Use shot.notes as imageUrl if it contains a generated image
    const imageUrl = shot.notes && shot.notes.startsWith('http') ? shot.notes : undefined;
    newPanels[selectedPanel] = { shotId: shot.id, shotTitle: `镜头${shot.order || selectedPanel + 1}`, imageUrl };
    setPanels(newPanels);
  };

  // Save updated shots back to storyboard file
  const saveStoryboard = useCallback(async (updatedShots: Shot[]) => {
    if (!projectPath || !selectedNodeId) return;
    try {
      await bridge.pipelineSaveStoryboard(projectPath, {
        id: `sb-${selectedNodeId}`,
        chapterId: selectedNodeId,
        shots: updatedShots,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (e) { console.error('Failed to save storyboard:', e); }
  }, [projectPath, selectedNodeId]);

  const generatePanel = async (idx: number) => {
    const panel = panels[idx];
    if (!panel.shotId) return;
    const shot = shots.find(s => s.id === panel.shotId);
    if (!shot) return;
    setGenMsg(`生成面板 ${idx + 1}...`);
    setGenerating(true);
    try {
      const model = await bridge.getAIKey('volcengine-image-model') || 'doubao-seedream-5-0-260128';
      const charDesc = (shot.characters || []).map((c: any) => `${c.characterId}(${c.expression || ''} ${c.pose || ''})`).join(',');
      const prompt = `漫画风格，${shot.framing || 'medium'}，${shot.angle || 'eye-level'}。场景：${shot.scene || ''}。${charDesc}。氛围：${shot.mood || ''}。道具：${(shot.props || []).join('，')}`;
      const urls = await bridge.generateImage({ model, prompt, size: '2K' }) as string[];
      if (urls?.length) {
        const newPanels = [...panels];
        newPanels[idx] = { ...panel, imageUrl: urls[0] };
        setPanels(newPanels);
        // Save image URL back to shot
        const updatedShots = shots.map(s => s.id === panel.shotId ? { ...s, notes: urls[0] } : s);
        setShots(updatedShots);
        await saveStoryboard(updatedShots);
      }
      setGenMsg('');
    } catch (e) { setGenMsg(`生成失败: ${(e as Error).message}`); }
    finally { setGenerating(false); }
  };

  const generateAll = async () => {
    for (let i = 0; i < panels.length; i++) {
      if (panels[i].shotId) await generatePanel(i);
    }
  };

  const grid = layoutGrids[layout];

  if (!projectPath || !selectedNodeId) {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-base)', gap: 12 }}>
        <div style={{ fontSize: 48, opacity: 0.3 }}>🎨</div>
        <div style={{ fontSize: 16 }}>{!projectPath ? '请先打开工作区并选择作品' : '请在大纲中选择一个章节节点'}</div>
        <div style={{ fontSize: 13 }}>{!projectPath ? '' : '请先在创作/大纲模式中选中章节，或在视觉化/分镜中完成分镜拆解'}</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>
      {/* Main canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, overflow: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(Object.keys(layoutGrids) as Layout[]).map(l => (
            <button key={l} onClick={() => setLayout(l)}
              style={{
                padding: '4px 10px', fontSize: 12, borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border-subtle)',
                backgroundColor: layout === l ? 'var(--accent-dim)' : 'var(--bg-input)',
                color: layout === l ? 'var(--accent)' : 'var(--text-secondary)',
              }}>{l}</button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={generateAll} disabled={generating || !panels.some(p => p.shotId)}
            style={{ padding: '4px 12px', fontSize: 12, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderRadius: 4, cursor: generating || !panels.some(p => p.shotId) ? 'not-allowed' : 'pointer', opacity: generating || !panels.some(p => p.shotId) ? 0.6 : 1 }}>
            {generating ? genMsg || '生成中...' : '全部生成'}
          </button>
        </div>
        {genMsg && !generating && (
          <div style={{ padding: '6px 12px', marginBottom: 8, backgroundColor: genMsg.includes('失败') ? '#3a1a1a' : 'var(--accent-dim)', color: genMsg.includes('失败') ? 'var(--color-error)' : 'var(--accent)', fontSize: 12, borderRadius: 4 }}>{genMsg}</div>
        )}

        <div style={{ flex: 1, display: 'grid', gridTemplateRows: `repeat(${grid.rows}, 1fr)`, gridTemplateColumns: `repeat(${grid.cols}, 1fr)`, gap: 8 }}>
          {grid.spans.map((span, i) => {
            const p = panels[i];
            return (
              <div key={i} onClick={() => setSelectedPanel(i)}
                style={{
                  gridRow: `${span.row + 1} / span ${span.rowSpan}`, gridColumn: `${span.col + 1} / span ${span.colSpan}`,
                  backgroundColor: selectedPanel === i ? 'var(--accent-dim)' : 'var(--bg-panel)',
                  border: `2px solid ${selectedPanel === i ? 'var(--accent)' : 'var(--border-subtle)'}`, borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative',
                }}>
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={`面板 ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    {p.shotTitle ? (
                      <>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>📷</div>
                        <div>{p.shotTitle}</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>+</div>
                        <div>选择右侧镜头</div>
                      </>
                    )}
                  </div>
                )}
                <div style={{ position: 'absolute', top: 4, left: 8, fontSize: 11, color: 'var(--text-inverse)', backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 3 }}>
                  {i + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right drawer — shot library */}
      <div style={{ width: 300, backgroundColor: 'var(--bg-panel)', borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--border-subtle)' }}>分镜素材</div>
        <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
          {!shots.length ? (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>暂无分镜数据，请先在视觉化/分镜模式中完成 AI 分镜拆解</div>
          ) : (
            shots.map((shot, i) => (
              <div key={shot.id || i} onClick={() => assignShot(shot)}
                style={{
                  padding: '8px 10px', marginBottom: 4, cursor: 'pointer', borderRadius: 4, border: '1px solid var(--border-subtle)',
                  backgroundColor: panels.some(p => p.shotId === shot.id) ? 'var(--accent-dim)' : 'var(--bg-base)',
                }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>镜头 {shot.order || i + 1}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{(shot.scene || '').slice(0, 40)}</div>
                {shot.notes && shot.notes.startsWith('http') && (
                  <div style={{ fontSize: 10, color: 'var(--color-success)', marginTop: 2 }}>已有图片</div>
                )}
                {panels.some(p => p.shotId === shot.id) && (
                  <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 2 }}>✓ 已分配</div>
                )}
              </div>
            ))
          )}
        </div>
        {/* Generate single panel */}
        {panels[selectedPanel]?.shotId && (
          <div style={{ padding: 8, borderTop: '1px solid var(--border-subtle)' }}>
            <button onClick={() => generatePanel(selectedPanel)} disabled={generating}
              style={{ width: '100%', padding: '6px 12px', fontSize: 12, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderRadius: 4, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1 }}>
              {generating ? genMsg || '生成中...' : '生成当前面板'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
