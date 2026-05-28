import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useOutlineStore } from '../../stores/outline.store';
import { bridge } from '../../services/bridge';
import type { Shot } from '@astrolabe/shared';
import { toast } from '../../stores/toast.store';
import { buildShotPrompt, findReferenceImage } from '../../utils/comic-prompt';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ComicBubble {
  id: string;
  text: string;
  type: 'speech' | 'thought' | 'narration';
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage
  height: number; // percentage
}

interface PanelData {
  shotId?: string;
  shotTitle?: string;
  imageUrl?: string;
  bubbles: ComicBubble[];
}

type Layout = '2x2' | '3x2' | '1big3small' | '2x1' | 'webtoon';

interface ComicPageData {
  id: string;
  title: string;
  layout: Layout;
  panels: PanelData[];
}

// ─── Layout definitions ─────────────────────────────────────────────────────

const layoutGrids: Record<Layout, { rows: number; cols: number; spans: { row: number; col: number; rowSpan: number; colSpan: number }[] }> = {
  '2x2': { rows: 2, cols: 2, spans: [{ row: 0, col: 0, rowSpan: 1, colSpan: 1 }, { row: 0, col: 1, rowSpan: 1, colSpan: 1 }, { row: 1, col: 0, rowSpan: 1, colSpan: 1 }, { row: 1, col: 1, rowSpan: 1, colSpan: 1 }] },
  '3x2': { rows: 3, cols: 2, spans: Array.from({ length: 6 }, (_, i) => ({ row: Math.floor(i / 2), col: i % 2, rowSpan: 1, colSpan: 1 })) },
  '1big3small': { rows: 2, cols: 2, spans: [{ row: 0, col: 0, rowSpan: 2, colSpan: 1 }, { row: 0, col: 1, rowSpan: 1, colSpan: 1 }, { row: 1, col: 1, rowSpan: 1, colSpan: 1 }] },
  '2x1': { rows: 1, cols: 2, spans: [{ row: 0, col: 0, rowSpan: 1, colSpan: 1 }, { row: 0, col: 1, rowSpan: 1, colSpan: 1 }] },
  'webtoon': { rows: 4, cols: 1, spans: Array.from({ length: 4 }, (_, i) => ({ row: i, col: 0, rowSpan: 1, colSpan: 1 })) },
};

const layoutLabels: Record<Layout, string> = {
  '2x2': '2x2',
  '3x2': '3x2',
  '1big3small': '1大3小',
  '2x1': '2x1',
  'webtoon': '条漫',
};

function createDefaultPage(index: number): ComicPageData {
  return {
    id: crypto.randomUUID(),
    title: `第${index + 1}页`,
    layout: '2x2',
    panels: Array.from({ length: layoutGrids['2x2'].spans.length }, () => ({ bubbles: [] })),
  };
}

function createPanelsForLayout(layout: Layout): PanelData[] {
  return Array.from({ length: layoutGrids[layout].spans.length }, () => ({ bubbles: [] }));
}

// ─── Image URL resolver ─────────────────────────────────────────────────────

async function resolveImageUrl(url: string): Promise<string> {
  if (url.startsWith('http')) return url;
  try { return await bridge.readFileBase64(url); } catch { return ''; }
}

function useImageUrls(pages: ComicPageData[], activePageIndex: number) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const page = pages[activePageIndex];
    if (!page) return;
    const entries = page.panels.filter(p => p.imageUrl && !urls[p.imageUrl!]);
    if (!entries.length) return;
    (async () => {
      const updates: Record<string, string> = {};
      for (const p of entries) {
        const key = p.imageUrl!;
        updates[key] = await resolveImageUrl(key);
      }
      setUrls(prev => ({ ...prev, ...updates }));
    })();
  }, [pages, activePageIndex]);
  return urls;
}

// ─── Bubble rendering helpers ───────────────────────────────────────────────

const bubbleStyles: Record<ComicBubble['type'], React.CSSProperties> = {
  speech: {
    backgroundColor: '#fff',
    border: '2px solid #333',
    borderRadius: 12,
    color: '#222',
  },
  thought: {
    backgroundColor: '#fff',
    border: '2px dashed #666',
    borderRadius: '50%',
    color: '#444',
  },
  narration: {
    backgroundColor: '#fdf6e3',
    border: '2px solid #b8860b',
    borderRadius: 4,
    color: '#333',
    fontStyle: 'italic',
  },
};

// SVG-based bubble with pointer
function BubbleShape({ type }: { type: ComicBubble['type'] }) {
  if (type === 'speech') {
    return (
      <svg
        style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', width: 20, height: 12 }}
        viewBox="0 0 20 12"
      >
        <polygon points="0,0 10,12 20,0" fill="#fff" stroke="#333" strokeWidth="2" />
        <polygon points="2,0 10,9 18,0" fill="#fff" />
      </svg>
    );
  }
  if (type === 'thought') {
    return (
      <div style={{ position: 'absolute', bottom: -18, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 3 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#fff', border: '1.5px dashed #666' }} />
        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#fff', border: '1.5px dashed #666' }} />
        <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#fff', border: '1.5px dashed #666' }} />
      </div>
    );
  }
  // narration: no pointer
  return null;
}

// ─── Bubble component ───────────────────────────────────────────────────────

interface BubbleViewProps {
  bubble: ComicBubble;
  selected: boolean;
  onSelect: () => void;
  onTextChange: (text: string) => void;
  onPositionChange: (x: number, y: number) => void;
  onSizeChange: (w: number, h: number) => void;
}

const HANDLE_SIZE = 8;

function BubbleView({ bubble, selected, onSelect, onTextChange, onPositionChange, onSizeChange }: BubbleViewProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(bubble.text);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; mode: 'move' | 'resize-br'; origW: number; origH: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setEditText(bubble.text);
  };

  const handleEditCommit = () => {
    onTextChange(editText);
    setEditing(false);
  };

  const handleMouseDown = (e: React.MouseEvent, mode: 'move' | 'resize-br') => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: bubble.x,
      origY: bubble.y,
      origW: bubble.width,
      origH: bubble.height,
      mode,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const parent = containerRef.current.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dx = ((ev.clientX - dragRef.current.startX) / rect.width) * 100;
      const dy = ((ev.clientY - dragRef.current.startY) / rect.height) * 100;

      if (dragRef.current.mode === 'move') {
        const nx = Math.max(0, Math.min(100 - bubble.width, dragRef.current.origX + dx));
        const ny = Math.max(0, Math.min(100 - bubble.height, dragRef.current.origY + dy));
        onPositionChange(nx, ny);
      } else {
        const nw = Math.max(8, Math.min(100 - bubble.x, dragRef.current.origW + dx));
        const nh = Math.max(6, Math.min(100 - bubble.y, dragRef.current.origH + dy));
        onSizeChange(nw, nh);
      }
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const style = bubbleStyles[bubble.type];

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      style={{
        position: 'absolute',
        left: `${bubble.x}%`,
        top: `${bubble.y}%`,
        width: `${bubble.width}%`,
        height: `${bubble.height}%`,
        ...style,
        padding: '6px 8px',
        fontSize: 12,
        lineHeight: 1.4,
        cursor: 'move',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        zIndex: selected ? 10 : 1,
        outline: selected ? '2px dashed var(--accent)' : 'none',
        outlineOffset: 2,
        boxShadow: selected ? '0 0 0 1px var(--accent)' : 'none',
        overflow: 'visible',
      }}
    >
      <BubbleShape type={bubble.type} />
      {editing ? (
        <textarea
          autoFocus
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleEditCommit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setEditing(false); }
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditCommit(); }
          }}
          style={{
            width: '100%', height: '100%', border: 'none', outline: 'none', resize: 'none',
            backgroundColor: 'transparent', color: style.color, fontSize: 12, lineHeight: 1.4,
            textAlign: 'center', fontFamily: 'inherit',
          }}
        />
      ) : (
        <span style={{ pointerEvents: 'none', wordBreak: 'break-word' }}>{bubble.text || '双击编辑'}</span>
      )}
      {/* Resize handle (bottom-right) */}
      {selected && (
        <div
          onMouseDown={(e) => handleMouseDown(e, 'resize-br')}
          style={{
            position: 'absolute',
            right: -HANDLE_SIZE / 2,
            bottom: -HANDLE_SIZE / 2,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            backgroundColor: 'var(--accent)',
            borderRadius: 2,
            cursor: 'nwse-resize',
            zIndex: 11,
          }}
        />
      )}
    </div>
  );
}

// ─── Panel component ────────────────────────────────────────────────────────

interface PanelViewProps {
  panel: PanelData;
  index: number;
  selected: boolean;
  selectedBubbleId: string | null;
  imageUrl?: string;
  onClick: () => void;
  onBubbleSelect: (bubbleId: string | null) => void;
  onBubbleUpdate: (bubbleId: string, updates: Partial<ComicBubble>) => void;
}

function PanelView({ panel, index, selected, selectedBubbleId, imageUrl, onClick, onBubbleSelect, onBubbleUpdate }: PanelViewProps) {
  const handleClick = (e: React.MouseEvent) => {
    // Only deselect bubble if clicking the panel background
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.panelBg === 'true') {
      onClick();
      onBubbleSelect(null);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        backgroundColor: selected ? 'var(--accent-dim)' : 'var(--bg-panel)',
        border: `2px solid ${selected ? 'var(--accent)' : 'var(--border-subtle)'}`,
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt={`面板 ${index + 1}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
            data-panel-bg="true"
          />
          {/* Bubble overlay */}
          {panel.bubbles.map(b => (
            <BubbleView
              key={b.id}
              bubble={b}
              selected={selectedBubbleId === b.id}
              onSelect={() => onBubbleSelect(b.id)}
              onTextChange={(text) => onBubbleUpdate(b.id, { text })}
              onPositionChange={(x, y) => onBubbleUpdate(b.id, { x, y })}
              onSizeChange={(w, h) => onBubbleUpdate(b.id, { width: w, height: h })}
            />
          ))}
        </>
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }} data-panel-bg="true">
          {panel.shotTitle ? (
            <>
              <div style={{ fontSize: 20, marginBottom: 4 }}><Icon name="image" size={20} color="var(--text-muted)" /></div>
              <div>{panel.shotTitle}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 20, marginBottom: 4 }}>+</div>
              <div>选择右侧镜头</div>
            </>
          )}
        </div>
      )}
      <div style={{ position: 'absolute', top: 4, left: 8, fontSize: 11, color: 'var(--text-inverse)', backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 3, zIndex: 20, pointerEvents: 'none' }}>
        {index + 1}
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export const ComicPage: React.FC = () => {
  const projectPath = useWorkspaceStore((s) => { const ws = s.workspace; const ap = s.activeProject; return ws && ap ? `${ws.path}/${ap}` : null; });
  const selectedNodeId = useOutlineStore((s) => s.selectedNodeId);
  const [shots, setShots] = useState<Shot[]>([]);
  const [pages, setPages] = useState<ComicPageData[]>([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [selectedPanel, setSelectedPanel] = useState(0);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState('');
  const [loaded, setLoaded] = useState(false);

  const activePage = pages[activePageIndex] || null;
  const imageUrls = useImageUrls(pages, activePageIndex);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived: current panels from active page
  const panels = activePage?.panels ?? [];
  const layout = activePage?.layout ?? '2x2';
  const grid = layoutGrids[layout];

  // ── Load storyboard shots ─────────────────────────────────────────────────
  useEffect(() => {
    if (!projectPath || !selectedNodeId) return;
    bridge.pipelineGetStoryboard(projectPath, selectedNodeId).then((d: any) => {
      if (d?.shots) setShots(d.shots);
    }).catch(e => toast.error(e.message || '操作失败'));
  }, [projectPath, selectedNodeId]);

  // ── Load / init pages from disk ───────────────────────────────────────────
  useEffect(() => {
    if (!projectPath) return;
    (async () => {
      try {
        const pagesPath = `${projectPath}/comic/pages.json`;
        const exists = await bridge.exists(pagesPath);
        if (exists) {
          const raw = await bridge.readFile(pagesPath);
          const data = JSON.parse(raw) as ComicPageData[];
          if (Array.isArray(data) && data.length > 0) {
            // Ensure bubbles arrays exist on all panels
            const migrated = data.map(p => ({
              ...p,
              panels: p.panels.map(pn => ({ ...pn, bubbles: pn.bubbles || [] })),
            }));
            setPages(migrated);
            setLoaded(true);
            return;
          }
        }
      } catch { /* ignore */ }
      // Fallback: create a default first page
      setPages([createDefaultPage(0)]);
      setLoaded(true);
    })();
  }, [projectPath]);

  // ── Auto-save pages on change ─────────────────────────────────────────────
  const scheduleSave = useCallback((data: ComicPageData[]) => {
    if (!projectPath || !loaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const pagesDir = `${projectPath}/comic`;
        await bridge.mkdir(pagesDir);
        await bridge.writeFile(`${pagesDir}/pages.json`, JSON.stringify(data, null, 2));
      } catch (e) {
        toast.error(`保存页面失败: ${(e as Error).message}`);
      }
    }, 800);
  }, [projectPath, loaded]);

  useEffect(() => {
    if (loaded && pages.length > 0) scheduleSave(pages);
  }, [pages, loaded, scheduleSave]);

  // ── Update pages immutably ────────────────────────────────────────────────
  const updatePage = useCallback((index: number, updates: Partial<ComicPageData>) => {
    setPages(prev => prev.map((p, i) => i === index ? { ...p, ...updates } : p));
  }, []);

  const updatePagePanels = useCallback((index: number, newPanels: PanelData[]) => {
    setPages(prev => prev.map((p, i) => i === index ? { ...p, panels: newPanels } : p));
  }, []);

  // ── Layout change ─────────────────────────────────────────────────────────
  const handleLayoutChange = useCallback((newLayout: Layout) => {
    if (!activePage) return;
    updatePage(activePageIndex, {
      layout: newLayout,
      panels: createPanelsForLayout(newLayout),
    });
    setSelectedPanel(0);
    setSelectedBubbleId(null);
  }, [activePage, activePageIndex, updatePage]);

  // ── Shot assignment ───────────────────────────────────────────────────────
  const assignShot = useCallback((shot: Shot) => {
    const newPanels = [...panels];
    const imageUrl = shot.notes && shot.notes.startsWith('http') ? shot.notes : undefined;
    newPanels[selectedPanel] = {
      ...newPanels[selectedPanel],
      shotId: shot.id,
      shotTitle: `镜头${shot.order || selectedPanel + 1}`,
      imageUrl,
    };
    updatePagePanels(activePageIndex, newPanels);
  }, [panels, selectedPanel, activePageIndex, updatePagePanels]);

  // ── Save storyboard ──────────────────────────────────────────────────────
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
    } catch (e) { toast.error(`保存分镜失败: ${(e as Error).message || '操作失败'}`); }
  }, [projectPath, selectedNodeId]);

  // ── Generate panel image ──────────────────────────────────────────────────
  const generatePanel = useCallback(async (idx: number) => {
    const panel = panels[idx];
    if (!panel?.shotId) return;
    const shot = shots.find(s => s.id === panel.shotId);
    if (!shot) return;
    setGenMsg(`生成面板 ${idx + 1}...`);
    setGenerating(true);
    try {
      const model = await bridge.getAIKey('volcengine-image-model') || 'doubao-seedream-5-0-260128';
      const prompt = buildShotPrompt(shot);
      const referenceImage = await findReferenceImage(projectPath!, shot.characters);
      const urls = await bridge.generateImage({ model, prompt, size: '2K', referenceImage, workspacePath: projectPath ?? undefined, stage: 'comic:generate' }) as string[];
      if (urls?.length) {
        let localUrl = urls[0];
        try {
          const imagesDir = `${projectPath}/storyboards/images`;
          const localPath = `${imagesDir}/${panel.shotId}.png`;
          await bridge.downloadImage(urls[0], localPath);
          localUrl = localPath;
        } catch { /* fall back to remote URL */ }
        const newPanels = [...panels];
        newPanels[idx] = { ...panel, imageUrl: localUrl };
        updatePagePanels(activePageIndex, newPanels);
        const updatedShots = shots.map(s => s.id === panel.shotId ? { ...s, notes: localUrl } : s);
        setShots(updatedShots);
        await saveStoryboard(updatedShots);
      }
      setGenMsg('');
    } catch (e) { setGenMsg(`生成失败: ${(e as Error).message}`); }
    finally { setGenerating(false); }
  }, [panels, shots, projectPath, activePageIndex, updatePagePanels, saveStoryboard]);

  const generateAll = useCallback(async () => {
    for (let i = 0; i < panels.length; i++) {
      if (panels[i].shotId) await generatePanel(i);
    }
  }, [panels, generatePanel]);

  // ── Page management ───────────────────────────────────────────────────────
  const addPage = useCallback(() => {
    setPages(prev => [...prev, createDefaultPage(prev.length)]);
    setActivePageIndex(pages.length);
    setSelectedPanel(0);
    setSelectedBubbleId(null);
  }, [pages.length]);

  const deletePage = useCallback((index: number) => {
    if (pages.length <= 1) {
      toast.warning('至少保留一个页面');
      return;
    }
    setPages(prev => prev.filter((_, i) => i !== index));
    setActivePageIndex(prev => Math.max(0, Math.min(prev, pages.length - 2)));
    setSelectedPanel(0);
    setSelectedBubbleId(null);
  }, [pages.length]);

  const renamePage = useCallback((index: number, title: string) => {
    updatePage(index, { title });
  }, [updatePage]);

  // ── Bubble management ─────────────────────────────────────────────────────
  const addBubble = useCallback((type: ComicBubble['type']) => {
    if (!activePage) return;
    const newPanels = [...panels];
    const panel = newPanels[selectedPanel];
    if (!panel) return;
    const bubble: ComicBubble = {
      id: crypto.randomUUID(),
      text: type === 'narration' ? '旁白文字' : type === 'thought' ? '内心独白...' : '对话内容',
      type,
      x: 30,
      y: 30,
      width: 40,
      height: 20,
    };
    newPanels[selectedPanel] = {
      ...panel,
      bubbles: [...panel.bubbles, bubble],
    };
    updatePagePanels(activePageIndex, newPanels);
    setSelectedBubbleId(bubble.id);
  }, [activePage, panels, selectedPanel, activePageIndex, updatePagePanels]);

  const deleteBubble = useCallback(() => {
    if (!selectedBubbleId || !activePage) return;
    const newPanels = panels.map(p => ({
      ...p,
      bubbles: p.bubbles.filter(b => b.id !== selectedBubbleId),
    }));
    updatePagePanels(activePageIndex, newPanels);
    setSelectedBubbleId(null);
  }, [selectedBubbleId, activePage, panels, activePageIndex, updatePagePanels]);

  const updateBubble = useCallback((bubbleId: string, updates: Partial<ComicBubble>) => {
    const newPanels = panels.map(p => ({
      ...p,
      bubbles: p.bubbles.map(b => b.id === bubbleId ? { ...b, ...updates } : b),
    }));
    updatePagePanels(activePageIndex, newPanels);
  }, [panels, activePageIndex, updatePagePanels]);

  // ── Keyboard shortcut for bubble deletion ─────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedBubbleId && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        deleteBubble();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedBubbleId, deleteBubble]);

  // ── Export as long-image HTML ──────────────────────────────────────────────
  const exportLongImage = useCallback(async () => {
    if (!projectPath || pages.length === 0) return;
    try {
      let projectTitle = '未命名作品';
      try {
        const config = await bridge.readProject(projectPath);
        if (config?.title) projectTitle = config.title;
      } catch { /* use default */ }

      // Resolve all image URLs to base64 for self-contained HTML
      const imageCache: Record<string, string> = {};
      for (const page of pages) {
        for (const panel of page.panels) {
          if (panel.imageUrl && !imageCache[panel.imageUrl]) {
            try {
              const resolved = await resolveImageUrl(panel.imageUrl);
              if (resolved) imageCache[panel.imageUrl] = resolved;
            } catch { /* skip */ }
          }
        }
      }

      const pagesHtml = pages.map((page) => {
        const grid = layoutGrids[page.layout];
        const panelHtml = page.panels.map((panel, idx) => {
          const span = grid.spans[idx];
          if (!span) return '';
          const imgHtml = panel.imageUrl
            ? `<img src="${escapeAttr(imageCache[panel.imageUrl] || panel.imageUrl)}" style="width:100%;height:100%;object-fit:cover;" />`
            : '';
          const bubblesHtml = panel.bubbles.map(b => {
            const style = bubbleStyles[b.type];
            const pointerHtml = b.type === 'speech'
              ? `<div style="position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:12px solid ${style.border?.toString().includes('#333') ? '#333' : '#333'};"></div>`
              : b.type === 'thought'
                ? `<div style="position:absolute;bottom:-16px;left:50%;transform:translateX(-50%);display:flex;gap:3px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#fff;border:1.5px dashed #666;"></span><span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:#fff;border:1.5px dashed #666;"></span><span style="display:inline-block;width:3px;height:3px;border-radius:50%;background:#fff;border:1.5px dashed #666;"></span></div>`
                : '';
            return `<div style="position:absolute;left:${b.x}%;top:${b.y}%;width:${b.width}%;height:${b.height}%;background:${b.type === 'narration' ? '#fdf6e3' : '#fff'};border:${b.type === 'thought' ? '2px dashed #666' : b.type === 'narration' ? '2px solid #b8860b' : '2px solid #333'};border-radius:${b.type === 'narration' ? '4px' : b.type === 'thought' ? '50%' : '12px'};color:${style.color || '#222'};padding:6px 8px;font-size:12px;display:flex;align-items:center;justify-content:center;text-align:center;overflow:visible;z-index:2;${b.type === 'narration' ? 'font-style:italic;' : ''}">${escapeHtml(b.text)}${pointerHtml}</div>`;
          }).join('');
          return `<div style="grid-row:${span.row + 1}/span ${span.rowSpan};grid-column:${span.col + 1}/span ${span.colSpan};position:relative;overflow:hidden;border:2px solid #444;border-radius:4px;background:#222;">${imgHtml}${bubblesHtml}</div>`;
        }).join('');

        return `<div class="comic-page" style="margin-bottom:40px;page-break-after:always;">
          <h2 style="color:#B08D57;margin-bottom:12px;font-size:16px;">${escapeHtml(page.title)}</h2>
          <div style="display:grid;grid-template-rows:repeat(${grid.rows},1fr);grid-template-columns:repeat(${grid.cols},1fr);gap:8px;max-width:800px;aspect-ratio:${grid.cols}/${grid.rows};">
            ${panelHtml}
          </div>
        </div>`;
      }).join('\n');

      const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(projectTitle)} — 漫画长图</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Microsoft YaHei", sans-serif; background: #1a1b1e; color: #d4d4d4; padding: 20px; }
    h1 { text-align: center; color: #B08D57; margin-bottom: 24px; }
    .comic-page { max-width: 840px; margin: 0 auto 40px; }
    @media print { body { background: #fff; color: #222; } .comic-page { page-break-after: always; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(projectTitle)}</h1>
  ${pagesHtml}
</body>
</html>`;

      // Write via main process
      await bridge.exportComicLongImage(projectPath, html);
      toast.success('导出完成');
    } catch (e) {
      toast.error(`导出失败: ${(e as Error).message}`);
    }
  }, [projectPath, pages]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!projectPath || !selectedNodeId) {
    return (
      <EmptyState
        variant="page"
        icon={<Icon name="comic" size={48} color="var(--text-muted)" />}
        title={!projectPath ? '请先打开工作区并选择作品' : '请在大纲中选择一个章节节点'}
        description={!projectPath ? undefined : '请先在创作/大纲模式中选中章节，或在视觉化/分镜中完成分镜拆解'}
      />
    );
  }

  if (!activePage) {
    return (
      <EmptyState
        variant="page"
        icon={<Icon name="comic" size={48} color="var(--text-muted)" />}
        title="暂无漫画页面"
        description="点击左侧「新建页面」开始创作"
      />
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>
      {/* Left sidebar — page list */}
      <div style={{ width: 200, backgroundColor: 'var(--bg-panel)', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>页面列表</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>{pages.length} 页</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 6 }}>
          {pages.map((page, i) => (
            <div
              key={page.id}
              onClick={() => { setActivePageIndex(i); setSelectedPanel(0); setSelectedBubbleId(null); }}
              style={{
                padding: '6px 8px', marginBottom: 4, cursor: 'pointer', borderRadius: 4,
                border: `1px solid ${i === activePageIndex ? 'var(--accent)' : 'var(--border-subtle)'}`,
                backgroundColor: i === activePageIndex ? 'var(--accent-dim)' : 'var(--bg-base)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {/* Thumbnail placeholder */}
              <div style={{
                width: 36, height: 48, borderRadius: 2, flexShrink: 0,
                backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text-muted)',
                overflow: 'hidden',
              }}>
                {page.panels[0]?.imageUrl ? (
                  <img
                    src={page.panels[0].imageUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {page.title}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {layoutLabels[page.layout]} · {page.panels.filter(p => p.imageUrl).length}/{page.panels.length} 图
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deletePage(i); }}
                title="删除页面"
                style={{
                  width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: 'var(--text-muted)', backgroundColor: 'transparent', border: 'none',
                  borderRadius: 2, cursor: 'pointer', flexShrink: 0, lineHeight: 1,
                }}
              >
                x
              </button>
            </div>
          ))}
        </div>
        <div style={{ padding: 6, borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={addPage}
            style={{
              width: '100%', padding: '6px 0', fontSize: 12, backgroundColor: 'var(--accent)',
              color: 'var(--text-inverse)', border: 'none', borderRadius: 4, cursor: 'pointer',
            }}
          >
            + 新建页面
          </button>
        </div>
      </div>

      {/* Main canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, overflow: 'auto' }}>
        {/* Top toolbar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Layout buttons */}
          {(Object.keys(layoutGrids) as Layout[]).map(l => (
            <button key={l} onClick={() => handleLayoutChange(l)}
              style={{
                padding: '4px 10px', fontSize: 12, borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border-subtle)',
                backgroundColor: layout === l ? 'var(--accent-dim)' : 'var(--bg-input)',
                color: layout === l ? 'var(--accent)' : 'var(--text-secondary)',
              }}>{layoutLabels[l]}</button>
          ))}

          <div style={{ width: 1, height: 20, backgroundColor: 'var(--border-subtle)', margin: '0 4px' }} />

          {/* Bubble buttons */}
          <button onClick={() => addBubble('speech')} disabled={!panels[selectedPanel]?.imageUrl}
            style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', opacity: panels[selectedPanel]?.imageUrl ? 1 : 0.4 }}>
            + 对话
          </button>
          <button onClick={() => addBubble('narration')} disabled={!panels[selectedPanel]?.imageUrl}
            style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', opacity: panels[selectedPanel]?.imageUrl ? 1 : 0.4 }}>
            + 旁白
          </button>
          <button onClick={() => addBubble('thought')} disabled={!panels[selectedPanel]?.imageUrl}
            style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', opacity: panels[selectedPanel]?.imageUrl ? 1 : 0.4 }}>
            + 内心
          </button>

          {selectedBubbleId && (
            <button onClick={deleteBubble}
              style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, cursor: 'pointer', border: '1px solid var(--color-error)', backgroundColor: 'transparent', color: 'var(--color-error)' }}>
              删除气泡
            </button>
          )}

          <div style={{ flex: 1 }} />

          {/* Page title (editable) */}
          <input
            value={activePage.title}
            onChange={(e) => renamePage(activePageIndex, e.target.value)}
            style={{
              width: 120, padding: '3px 8px', fontSize: 12, borderRadius: 4,
              border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)', outline: 'none',
            }}
          />

          <button onClick={exportLongImage}
            style={{ padding: '4px 12px', fontSize: 12, backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 4, cursor: 'pointer' }}>
            导出长图 HTML
          </button>
          <button onClick={generateAll} disabled={generating || !panels.some(p => p.shotId)}
            style={{ padding: '4px 12px', fontSize: 12, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderRadius: 4, cursor: generating || !panels.some(p => p.shotId) ? 'not-allowed' : 'pointer', opacity: generating || !panels.some(p => p.shotId) ? 0.6 : 1 }}>
            {generating ? genMsg || '生成中...' : '全部生成'}
          </button>
        </div>
        {genMsg && !generating && (
          <div style={{ padding: '6px 12px', marginBottom: 8, backgroundColor: genMsg.includes('失败') ? 'var(--color-error-bg)' : 'var(--accent-dim)', color: genMsg.includes('失败') ? 'var(--color-error)' : 'var(--accent)', fontSize: 12, borderRadius: 4 }}>{genMsg}</div>
        )}

        {/* Grid canvas */}
        <div style={{ flex: 1, display: 'grid', gridTemplateRows: `repeat(${grid.rows}, 1fr)`, gridTemplateColumns: `repeat(${grid.cols}, 1fr)`, gap: 8 }}>
          {grid.spans.map((span, i) => {
            const p = panels[i] || { bubbles: [] };
            return (
              <div
                key={i}
                style={{
                  gridRow: `${span.row + 1} / span ${span.rowSpan}`,
                  gridColumn: `${span.col + 1} / span ${span.colSpan}`,
                }}
              >
                <PanelView
                  panel={p}
                  index={i}
                  selected={selectedPanel === i}
                  selectedBubbleId={selectedPanel === i ? selectedBubbleId : null}
                  imageUrl={p.imageUrl ? (imageUrls[p.imageUrl] || p.imageUrl) : undefined}
                  onClick={() => { setSelectedPanel(i); setSelectedBubbleId(null); }}
                  onBubbleSelect={(id) => setSelectedBubbleId(id)}
                  onBubbleUpdate={updateBubble}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Right drawer — shot library */}
      <div style={{ width: 300, backgroundColor: 'var(--bg-panel)', borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--border-subtle)' }}>分镜素材</div>
        <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
          {!shots.length ? (
            <EmptyState variant="inline" title="暂无分镜数据，请先在视觉化/分镜模式中完成 AI 分镜拆解" />
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

// ─── HTML helper functions ──────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
