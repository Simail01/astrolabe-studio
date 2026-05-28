import React, { useEffect, useState, useCallback } from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useOutlineStore } from '../../stores/outline.store';
import { useTemplateStore } from '../../stores/template.store';
import { TemplateSelector } from '../Template/TemplateSelector';
import { bridge } from '../../services/bridge';
import type { Shot } from '@astrolabe/shared';
import { toast } from '../../stores/toast.store';
import { buildShotPrompt, findReferenceImage } from '../../utils/comic-prompt';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';

const framingLabels: Record<string, string> = {
  'extreme-long': '远景', 'long': '全景', 'medium': '中景', 'close-up': '特写', 'extreme-close-up': '大特写',
};
const angleLabels: Record<string, string> = {
  'eye-level': '平视', 'high-angle': '俯拍', 'low-angle': '仰拍', 'bird-eye': '鸟瞰', 'dutch': '倾斜',
};

export const StoryboardViewer: React.FC = () => {
  const projectPath = useWorkspaceStore((s) => { const ws = s.workspace; const ap = s.activeProject; return ws && ap ? `${ws.path}/${ap}` : null; });
  const workspacePath = useWorkspaceStore((s) => s.workspace?.path || null);
  const selectedNodeId = useOutlineStore((s) => s.selectedNodeId);
  const getSelectedTemplate = useTemplateStore(s => s.getSelectedTemplate);
  const [shots, setShots] = useState<Shot[]>([]);
  const [selectedShotIdx, setSelectedShotIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [genProgress, setGenProgress] = useState('');
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  // Load existing storyboard
  useEffect(() => {
    if (!projectPath || !selectedNodeId) return;
    setError('');
    bridge.pipelineGetStoryboard(projectPath, selectedNodeId).then((data: any) => {
      if (data?.shots) { setShots(data.shots); setSelectedShotIdx(0); }
    }).catch(e => toast.error(e.message || '操作失败'));
  }, [projectPath, selectedNodeId]);

  // Resolve local image paths to data URLs for display
  useEffect(() => {
    const s = shots[selectedShotIdx];
    if (!s?.notes) { setResolvedImageUrl(null); return; }
    if (s.notes.startsWith('http')) { setResolvedImageUrl(s.notes); return; }
    bridge.readFileBase64(s.notes).then(setResolvedImageUrl).catch(() => setResolvedImageUrl(null));
  }, [shots, selectedShotIdx]);

  /** Persist current shots to disk */
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
    } catch (e) {
      toast.error('自动保存失败: ' + ((e as Error).message || '未知错误'));
    }
  }, [projectPath, selectedNodeId]);

  /** Add a new manual shot with default values */
  const handleAddShot = useCallback(() => {
    const newShot: Shot = {
      id: crypto.randomUUID(),
      order: shots.length,
      scene: '',
      framing: 'medium',
      angle: 'eye-level',
      characters: [],
      dialogue: [],
      props: [],
      mood: '',
      notes: '',
    };
    const updated = [...shots, newShot];
    setShots(updated);
    setSelectedShotIdx(updated.length - 1);
    saveStoryboard(updated);
  }, [shots, saveStoryboard]);

  /** Delete a shot by index */
  const handleDeleteShot = useCallback((idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (shots.length <= 1) { toast.error('至少保留一个镜头'); return; }
    const updated = shots.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i }));
    setShots(updated);
    if (selectedShotIdx >= updated.length) setSelectedShotIdx(updated.length - 1);
    else if (selectedShotIdx > idx) setSelectedShotIdx(selectedShotIdx - 1);
    else if (selectedShotIdx === idx) setSelectedShotIdx(Math.min(idx, updated.length - 1));
    saveStoryboard(updated);
  }, [shots, selectedShotIdx, saveStoryboard]);

  /** Merge current shot with the next shot */
  const handleMergeShot = useCallback((idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (idx >= shots.length - 1) { toast.error('已是最后一个镜头，无法合并'); return; }
    const current = shots[idx];
    const next = shots[idx + 1];
    // Deduplicate characters by characterId
    const charMap = new Map<string, any>();
    for (const c of [...(current.characters || []), ...(next.characters || [])]) {
      charMap.set(c.characterId, c);
    }
    const merged: Shot = {
      ...current,
      scene: [current.scene, next.scene].filter(Boolean).join(' | '),
      characters: Array.from(charMap.values()),
      dialogue: [...(current.dialogue || []), ...(next.dialogue || [])],
      props: [...new Set([...(current.props || []), ...(next.props || [])])],
      mood: [current.mood, next.mood].filter(Boolean).join('；'),
    };
    const updated = shots
      .filter((_, i) => i !== idx + 1)
      .map((s, i) => (s.id === current.id ? { ...merged, order: i } : { ...s, order: i }));
    setShots(updated);
    if (selectedShotIdx > idx) setSelectedShotIdx(selectedShotIdx - 1);
    saveStoryboard(updated);
  }, [shots, selectedShotIdx, saveStoryboard]);

  // --- Drag-and-drop handlers ---
  const handleDragStart = useCallback((idx: number, e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }, []);

  const handleDragOver = useCallback((idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIdx(idx);
  }, []);

  const handleDrop = useCallback((targetIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    const srcIdx = dragIdx;
    setDragIdx(null);
    setDropIdx(null);
    if (srcIdx === null || srcIdx === targetIdx) return;
    const updated = [...shots];
    const [moved] = updated.splice(srcIdx, 1);
    updated.splice(targetIdx, 0, moved);
    const reordered = updated.map((s, i) => ({ ...s, order: i }));
    setShots(reordered);
    // Adjust selected index
    if (selectedShotIdx === srcIdx) setSelectedShotIdx(targetIdx);
    else if (srcIdx < selectedShotIdx && targetIdx >= selectedShotIdx) setSelectedShotIdx(selectedShotIdx - 1);
    else if (srcIdx > selectedShotIdx && targetIdx <= selectedShotIdx) setSelectedShotIdx(selectedShotIdx + 1);
    saveStoryboard(reordered);
  }, [dragIdx, shots, selectedShotIdx, saveStoryboard]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDropIdx(null);
  }, []);

  const handleDecompose = async () => {
    if (!projectPath || !selectedNodeId) return;
    setLoading(true); setError('');
    try {
      const template = getSelectedTemplate('storyboard:decompose');
      const result = await bridge.storyboardDecompose(
        projectPath, selectedNodeId,
        template?.id, workspacePath || undefined,
      ) as Shot[];
      if (result?.length) {
        setShots(result);
        setSelectedShotIdx(0);
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
          const prompt = buildShotPrompt(shot);
          const referenceImage = await findReferenceImage(projectPath, shot.characters);
          const urls = await bridge.generateImage({ model, prompt, size: '2K', referenceImage, workspacePath: projectPath ?? undefined, stage: 'storyboard:generate' }) as string[];
          if (urls?.length) {
            let localUrl = urls[0];
            try {
              const localPath = `${projectPath}/storyboards/images/${shot.id}.png`;
              await bridge.downloadImage(urls[0], localPath);
              localUrl = localPath;
            } catch { /* fall back to remote URL */ }
            updatedShots[i] = { ...shot, notes: localUrl };
          }
        } catch (e) { toast.error(`镜头 ${i + 1} 生成失败: ${(e as Error).message || '未知错误'}`); }
      }
      setShots(updatedShots);
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
      <EmptyState
        variant="page"
        icon={<Icon name="movie" size={48} color="var(--text-muted)" />}
        title={!projectPath ? '请先打开工作区并选择作品' : '请在大纲中选择一个章节节点'}
      />
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Shot list */}
      <div style={{ width: 260, overflow: 'auto', borderRight: '1px solid var(--border-subtle)' }}>
        <div style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>分镜 ({shots.length})</span>
          <button onClick={handleAddShot} title="新建镜头"
            style={{ background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 3, cursor: 'pointer', fontSize: 11, padding: '1px 8px', lineHeight: '18px' }}>
            + 新建镜头
          </button>
        </div>
        {!shots.length ? (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <EmptyState
              variant="inline"
              title="暂无分镜数据"
            />
            <div style={{ marginBottom: 8 }}>
              <TemplateSelector stage="storyboard:decompose" />
            </div>
            <button onClick={handleDecompose} disabled={loading}
              style={{ padding: '6px 16px', fontSize: 12, backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'AI 拆解中...' : 'AI 分镜拆解'}
            </button>
            {loading && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>正在调用 AI 分析章节内容...</div>}
          </div>
        ) : (
          shots.map((s, i) => {
            const isDragging = dragIdx === i;
            const isDropTarget = dropIdx === i && dragIdx !== null && dragIdx !== i;
            return (
              <div key={s.id || i}
                onClick={() => setSelectedShotIdx(i)}
                draggable
                onDragStart={(e) => handleDragStart(i, e)}
                onDragOver={(e) => handleDragOver(i, e)}
                onDrop={(e) => handleDrop(i, e)}
                onDragEnd={handleDragEnd}
                style={{
                  padding: '8px 12px', cursor: 'grab', borderBottom: '1px solid var(--border-subtle)', fontSize: 13,
                  backgroundColor: i === selectedShotIdx ? 'var(--accent-dim)' : 'transparent',
                  opacity: isDragging ? 0.4 : 1,
                  borderTop: isDropTarget ? '2px solid var(--accent)' : undefined,
                  position: 'relative',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ color: 'var(--accent)', fontSize: 11 }}>镜头 {i + 1}</span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    {i < shots.length - 1 && (
                      <button onClick={(e) => handleMergeShot(i, e)} title="与下一镜头合并"
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 10, padding: '0 3px', lineHeight: 1 }}>
                        合并
                      </button>
                    )}
                    <button onClick={(e) => handleDeleteShot(i, e)} title="删除镜头"
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, padding: '0 2px', lineHeight: 1 }}>
                      ✕
                    </button>
                  </span>
                </div>
                <div style={{ fontSize: 12 }}>{(s.scene || '').slice(0, 30) || '（无场景）'}</div>
                <div style={{ marginTop: 4 }}>
                  <span style={{ display: 'inline-block', padding: '2px 6px', fontSize: 10, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', borderRadius: 3, marginRight: 4 }}>{framingLabels[s.framing] || s.framing}</span>
                  <span style={{ display: 'inline-block', padding: '2px 6px', fontSize: 10, backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 3, marginRight: 4 }}>{angleLabels[s.angle] || s.angle}</span>
                </div>
                {s.notes && s.notes.startsWith('http') && <div style={{ fontSize: 10, color: 'var(--color-success)', marginTop: 2 }}>已生成图片</div>}
              </div>
            );
          })
        )}
      </div>

      {/* Shot detail */}
      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {/* Error banner */}
        {error && (
          <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', fontSize: 13, borderRadius: 4, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <TemplateSelector stage="storyboard:decompose" />
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
                {resolvedImageUrl && <img src={resolvedImageUrl} alt={`镜头 ${selectedShotIdx + 1}`}
                  style={{ maxWidth: '100%', borderRadius: 6, border: '1px solid var(--border-subtle)' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />}
              </div>
            )}
          </>
        ) : (
          <EmptyState
            variant="panel"
            title={shots.length > 0 ? '选择左侧镜头查看详情' : '点击"AI 分镜拆解"开始生成分镜'}
          />
        )}
      </div>
    </div>
  );
};
