import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useOutlineStore } from '../../stores/outline.store';
import { bridge } from '../../services/bridge';
import type { Shot } from '@astrolabe/shared';

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
  const [error, setError] = useState('');
  const [genProgress, setGenProgress] = useState('');

  // Load existing storyboard
  useEffect(() => {
    if (!projectPath || !selectedNodeId) return;
    setError('');
    bridge.pipelineGetStoryboard(projectPath, selectedNodeId).then((data: any) => {
      if (data?.shots) { setShots(data.shots); setSelectedShotIdx(0); }
    }).catch(() => {});
  }, [projectPath, selectedNodeId]);

  const handleDecompose = async () => {
    if (!projectPath || !selectedNodeId) return;
    setLoading(true); setError('');
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
      } else {
        setError('AI 未返回有效的镜头数据');
      }
    } catch (e) {
      setError((e as Error).message || '分镜拆解失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateComic = async () => {
    if (!shots.length || !projectPath || !selectedNodeId) return;
    setGenProgress('正在生成漫画...');
    try {
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
      await bridge.pipelineSaveStoryboard(projectPath, {
        id: `sb-${selectedNodeId}`,
        chapterId: selectedNodeId,
        shots: updatedShots,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      setError((e as Error).message || '漫画生成失败');
    }
    setGenProgress('');
  };

  const shot = shots[selectedShotIdx];

  if (!projectPath || !selectedNodeId) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-base)', gap: 12, flexDirection: 'column' }}>
        <div style={{ fontSize: 48, opacity: 0.3 }}>🎬</div>
        <div style={{ fontSize: 16 }}>{!projectPath ? '请先打开工作区并选择作品' : '请在大纲中选择一个章节节点'}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Shot list */}
      <div style={{ width: 260, overflow: 'auto', borderRight: '1px solid var(--border-subtle)' }}>
        <div style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>分镜 ({shots.length})</span>
        </div>
        {!shots.length ? (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>暂无分镜数据</div>
            <button onClick={handleDecompose} disabled={loading}
              style={{ padding: '6px 16px', fontSize: 12, backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'AI 拆解中...' : 'AI 分镜拆解'}
            </button>
            {loading && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>正在调用 AI 分析章节内容...</div>}
          </div>
        ) : (
          shots.map((s, i) => (
            <div key={s.id || i}
              onClick={() => setSelectedShotIdx(i)}
              style={{
                padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', fontSize: 13,
                backgroundColor: i === selectedShotIdx ? 'var(--accent-dim)' : 'transparent',
              }}>
              <div style={{ color: 'var(--accent)', fontSize: 11, marginBottom: 2 }}>镜头 {i + 1}</div>
              <div style={{ fontSize: 12 }}>{(s.scene || '').slice(0, 30) || '（无场景）'}</div>
              <div style={{ marginTop: 4 }}>
                <span style={{ display: 'inline-block', padding: '2px 6px', fontSize: 10, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', borderRadius: 3, marginRight: 4 }}>{framingLabels[s.framing] || s.framing}</span>
                <span style={{ display: 'inline-block', padding: '2px 6px', fontSize: 10, backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 3, marginRight: 4 }}>{angleLabels[s.angle] || s.angle}</span>
              </div>
              {s.notes && <div style={{ fontSize: 10, color: 'var(--color-success)', marginTop: 2 }}>已生成图片</div>}
            </div>
          ))
        )}
      </div>

      {/* Shot detail */}
      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {/* Error banner */}
        {error && (
          <div style={{ padding: '8px 12px', backgroundColor: '#3a1a1a', color: 'var(--color-error)', fontSize: 13, borderRadius: 4, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        )}

        {/* Progress banner */}
        {genProgress && (
          <div style={{ padding: '8px 12px', backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 13, borderRadius: 4, marginBottom: 12 }}>
            {genProgress}
          </div>
        )}

        {shot ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 600 }}>镜头 {selectedShotIdx + 1}</div>
                <div style={{ marginTop: 4 }}>
                  <span style={{ display: 'inline-block', padding: '2px 6px', fontSize: 10, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', borderRadius: 3, marginRight: 4 }}>{framingLabels[shot.framing] || shot.framing}</span>
                  <span style={{ display: 'inline-block', padding: '2px 6px', fontSize: 10, backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 3, marginRight: 4 }}>{angleLabels[shot.angle] || shot.angle}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {shots.length > 0 && (
                  <button onClick={handleDecompose} disabled={loading}
                    style={{ padding: '4px 12px', fontSize: 12, backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', border: 'none', borderRadius: 3, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                    {loading ? '拆解中...' : '重新拆解'}
                  </button>
                )}
                <button onClick={handleGenerateComic} disabled={!!genProgress}
                  style={{ padding: '4px 12px', fontSize: 12, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderRadius: 3, cursor: genProgress ? 'not-allowed' : 'pointer', opacity: genProgress ? 0.6 : 1 }}>
                  {genProgress || '生成漫画'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>场景</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{shot.scene || '—'}</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>角色</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                {(shot.characters || []).length > 0
                  ? shot.characters.map((c: any, i: number) => (
                      <span key={i} style={{ display: 'inline-block', padding: '2px 6px', margin: '0 4px 4px 0', backgroundColor: 'var(--bg-input)', borderRadius: 3, fontSize: 11 }}>
                        {c.characterId} {c.expression ? `·${c.expression}` : ''} {c.pose ? `·${c.pose}` : ''}
                      </span>
                    ))
                  : '—'}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>对话</div>
              {(shot.dialogue || []).length > 0
                ? shot.dialogue.map((d: any, i: number) => (
                    <div key={i} style={{ padding: '4px 8px', marginBottom: 4, backgroundColor: 'var(--bg-input)', borderRadius: 3, fontSize: 12 }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{d.speakerId}: </span>
                      <span>{d.text}</span>
                    </div>
                  ))
                : <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>—</div>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>道具</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{(shot.props || []).join('、') || '—'}</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>氛围</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{shot.mood || '—'}</div>
            </div>

            {/* Generated image preview */}
            {shot.notes && (
              <div style={{ marginBottom: 14, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>生成结果</div>
                <img src={shot.notes} alt={`镜头 ${selectedShotIdx + 1}`}
                  style={{ maxWidth: '100%', borderRadius: 6, border: '1px solid var(--border-subtle)' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            {shots.length > 0 ? '选择左侧镜头查看详情' : '点击"AI 分镜拆解"开始生成分镜'}
          </div>
        )}
      </div>
    </div>
  );
};
