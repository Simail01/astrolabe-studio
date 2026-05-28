import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { bridge } from '../../services/bridge';
import type { Shot } from '@astrolabe/shared';
import { toast } from '../../stores/toast.store';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';

const framingLabels: Record<string, string> = {
  'extreme-long': '远景', 'long': '全景', 'medium': '中景', 'close-up': '特写', 'extreme-close-up': '大特写',
};
const angleLabels: Record<string, string> = {
  'eye-level': '平视', 'high-angle': '俯拍', 'low-angle': '仰拍', 'bird-eye': '鸟瞰', 'dutch': '倾斜',
};

interface GalleryItem {
  shot: Shot;
  chapterId: string;
  chapterTitle: string;
  imageUrl: string;
}

export const ComicPreview: React.FC = () => {
  const projectPath = useWorkspaceStore((s) => {
    const ws = s.workspace;
    const ap = s.activeProject;
    return ws && ap ? `${ws.path}/${ap}` : null;
  });
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [chapterIds, setChapterIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [regenId, setRegenId] = useState<string | null>(null);

  // Load all chapters and their storyboards
  useEffect(() => {
    if (!projectPath) return;
    setLoading(true);
    bridge.pipelineListChapters(projectPath).then(async (ids: string[]) => {
      setChapterIds(ids);
      const allItems: GalleryItem[] = [];
      for (const cid of ids) {
        try {
          const data: any = await bridge.pipelineGetStoryboard(projectPath, cid);
          if (data?.shots?.length) {
            for (const shot of data.shots) {
              if (shot.notes) {
                allItems.push({ shot, chapterId: cid, chapterTitle: cid, imageUrl: shot.notes });
              }
            }
          }
        } catch { /* skip chapters without storyboard */ }
      }
      setItems(allItems);
    }).catch(e => toast.error(e.message || '加载画廊失败')).finally(() => setLoading(false));
  }, [projectPath]);

  // Resolve image URLs
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const filteredItems = useMemo(() => filter ? items.filter(it => it.chapterId === filter) : items, [items, filter]);

  useEffect(() => {
    const toResolve = filteredItems.filter(it => it.imageUrl && !resolvedUrls[it.imageUrl] && !it.imageUrl.startsWith('http'));
    if (!toResolve.length) return;
    (async () => {
      const updates: Record<string, string> = {};
      for (const it of toResolve) {
        try { updates[it.imageUrl] = await bridge.readFileBase64(it.imageUrl); } catch { /* skip */ }
      }
      setResolvedUrls(prev => ({ ...prev, ...updates }));
    })();
  }, [filteredItems]);

  const getDisplayUrl = useCallback((item: GalleryItem) => {
    if (item.imageUrl.startsWith('http')) return item.imageUrl;
    return resolvedUrls[item.imageUrl] || '';
  }, [resolvedUrls]);

  const handleRegenerate = useCallback(async (item: GalleryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!projectPath || regenId) return;
    setRegenId(item.shot.id);
    try {
      const model = await bridge.getAIKey('volcengine-image-model') || 'doubao-seedream-5-0-260128';
      const s = item.shot;
      const charDesc = (s.characters || []).map((c: any) => `${c.characterId}(${c.expression || ''} ${c.pose || ''})`).join(',');
      const prompt = `漫画风格，${s.framing || 'medium'}，${s.angle || 'eye-level'}。场景：${s.scene || ''}。${charDesc}。氛围：${s.mood || ''}。道具：${(s.props || []).join('，')}`;
      const urls = await bridge.generateImage({ model, prompt, size: '2K', workspacePath: projectPath ?? undefined, stage: 'comic:regenerate' }) as string[];
      if (urls?.length) {
        let localUrl = urls[0];
        try {
          const localPath = `${projectPath}/storyboards/images/${s.id}.png`;
          await bridge.downloadImage(urls[0], localPath);
          localUrl = localPath;
        } catch { /* fall back to remote */ }
        // Update storyboard file
        const data: any = await bridge.pipelineGetStoryboard(projectPath, item.chapterId);
        const updatedShots = (data?.shots || []).map((shot: Shot) => shot.id === s.id ? { ...shot, notes: localUrl } : shot);
        await bridge.pipelineSaveStoryboard(projectPath, { ...data, shots: updatedShots, updatedAt: new Date().toISOString() });
        // Update local state
        setItems(prev => prev.map(gi => gi.shot.id === s.id ? { ...gi, imageUrl: localUrl } : gi));
        setResolvedUrls(prev => { const next = { ...prev }; delete next[item.imageUrl]; return next; });
        toast.success('重新生成成功');
      }
    } catch (e) {
      toast.error(`重新生成失败: ${(e as Error).message || '未知错误'}`);
    } finally {
      setRegenId(null);
    }
  }, [projectPath, regenId]);

  // Lightbox navigation
  const openLightbox = useCallback((idx: number) => setLightboxIdx(idx), []);
  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const goPrev = useCallback(() => setLightboxIdx(i => i !== null && i > 0 ? i - 1 : i), []);
  const goNext = useCallback(() => setLightboxIdx(i => i !== null && i < filteredItems.length - 1 ? i + 1 : i), [filteredItems.length]);

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx, closeLightbox, goPrev, goNext]);

  if (!projectPath) {
    return (
      <EmptyState
        variant="page"
        icon={<Icon name="image" size={48} color="var(--text-muted)" />}
        title="请先打开工作区并选择作品"
      />
    );
  }

  if (loading) {
    return (
      <EmptyState
        variant="page"
        icon={<Icon name="image" size={48} color="var(--text-muted)" />}
        title="正在加载画廊..."
      />
    );
  }

  const lightboxItem = lightboxIdx !== null ? filteredItems[lightboxIdx] : null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px',
        borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>画廊</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({filteredItems.length} 张)</span>
        <div style={{ flex: 1 }} />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            padding: '4px 8px', fontSize: 12, borderRadius: 4,
            backgroundColor: 'var(--bg-control)', color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">全部章节</option>
          {chapterIds.map(cid => <option key={cid} value={cid}>{cid}</option>)}
        </select>
      </div>

      {/* Grid gallery */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {!filteredItems.length ? (
          <EmptyState
            variant="page"
            icon={<Icon name="image" size={48} color="var(--text-muted)" />}
            title="暂无已生成的分镜图片"
            description="请先在视觉化/分镜模式中完成图片生成"
          />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 12,
          }}>
            {filteredItems.map((item, idx) => {
              const url = getDisplayUrl(item);
              return (
                <div
                  key={`${item.chapterId}-${item.shot.id}`}
                  onClick={() => openLightbox(idx)}
                  style={{
                    backgroundColor: 'var(--bg-panel)', borderRadius: 6,
                    border: '1px solid var(--border-subtle)', overflow: 'hidden',
                    cursor: 'pointer', transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  {/* Image */}
                  <div style={{ position: 'relative', aspectRatio: '4/3', backgroundColor: 'var(--bg-control)', overflow: 'hidden' }}>
                    {url ? (
                      <img src={url} alt={`镜头 ${item.shot.order}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="image" size={32} color="var(--text-muted)" />
                      </div>
                    )}
                    {/* Shot number badge */}
                    <div style={{
                      position: 'absolute', top: 6, left: 8,
                      fontSize: 11, color: 'var(--text-inverse)', backgroundColor: 'rgba(0,0,0,0.65)',
                      padding: '2px 6px', borderRadius: 3,
                    }}>
                      #{item.shot.order}
                    </div>
                    {/* Regenerate button */}
                    <button
                      onClick={(e) => handleRegenerate(item, e)}
                      disabled={regenId === item.shot.id}
                      title="重新生成"
                      style={{
                        position: 'absolute', top: 6, right: 8,
                        background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 4,
                        padding: '3px 6px', cursor: regenId === item.shot.id ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: regenId === item.shot.id ? 0.5 : 1,
                      }}
                    >
                      <Icon name="refresh" size={14} color="var(--text-inverse)" />
                    </button>
                  </div>
                  {/* Info */}
                  <div style={{ padding: '6px 8px' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.chapterTitle}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-block', padding: '1px 5px', fontSize: 10, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', borderRadius: 3 }}>
                        {framingLabels[item.shot.framing] || item.shot.framing}
                      </span>
                      <span style={{ display: 'inline-block', padding: '1px 5px', fontSize: 10, backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 3 }}>
                        {angleLabels[item.shot.angle] || item.shot.angle}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox modal */}
      {lightboxItem && (
        <div
          onClick={closeLightbox}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {/* Close button */}
          <button onClick={closeLightbox} style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4,
            padding: '6px 10px', color: '#fff', fontSize: 14, cursor: 'pointer', zIndex: 1001,
          }}>
            ✕
          </button>

          {/* Prev arrow */}
          {lightboxIdx! > 0 && (
            <button onClick={e => { e.stopPropagation(); goPrev(); }} style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4,
              padding: '12px 14px', color: '#fff', fontSize: 18, cursor: 'pointer', zIndex: 1001,
            }}>
              &#8592;
            </button>
          )}

          {/* Next arrow */}
          {lightboxIdx! < filteredItems.length - 1 && (
            <button onClick={e => { e.stopPropagation(); goNext(); }} style={{
              position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4,
              padding: '12px 14px', color: '#fff', fontSize: 18, cursor: 'pointer', zIndex: 1001,
            }}>
              &#8594;
            </button>
          )}

          {/* Image + info overlay */}
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {(() => {
              const url = getDisplayUrl(lightboxItem);
              return url ? (
                <img src={url} alt={`镜头 ${lightboxItem.shot.order}`} style={{ maxWidth: '90vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 6 }} />
              ) : (
                <div style={{ width: 400, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6 }}>
                  <Icon name="image" size={48} color="rgba(255,255,255,0.3)" />
                </div>
              );
            })()}
            {/* Info bar */}
            <div style={{
              marginTop: 12, padding: '8px 16px', borderRadius: 6,
              backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 16, maxWidth: '90vw',
            }}>
              <span style={{ fontWeight: 600 }}>镜头 {lightboxItem.shot.order}</span>
              <span style={{ opacity: 0.7 }}>{lightboxItem.chapterTitle}</span>
              <span style={{
                display: 'inline-block', padding: '2px 6px', fontSize: 10,
                backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', borderRadius: 3,
              }}>
                {framingLabels[lightboxItem.shot.framing] || lightboxItem.shot.framing}
              </span>
              <span style={{
                display: 'inline-block', padding: '2px 6px', fontSize: 10,
                backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 3,
              }}>
                {angleLabels[lightboxItem.shot.angle] || lightboxItem.shot.angle}
              </span>
              <span style={{ opacity: 0.6, fontSize: 12 }}>{lightboxItem.shot.scene?.slice(0, 60)}</span>
              <div style={{ flex: 1 }} />
              <button
                onClick={(e) => { handleRegenerate(lightboxItem, e); }}
                disabled={regenId === lightboxItem.shot.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 12px', fontSize: 12, border: 'none', borderRadius: 4,
                  backgroundColor: 'var(--accent)', color: 'var(--text-inverse)',
                  cursor: regenId === lightboxItem.shot.id ? 'not-allowed' : 'pointer',
                  opacity: regenId === lightboxItem.shot.id ? 0.6 : 1,
                }}
              >
                <Icon name="refresh" size={13} color="var(--text-inverse)" />
                {regenId === lightboxItem.shot.id ? '生成中...' : '重新生成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
