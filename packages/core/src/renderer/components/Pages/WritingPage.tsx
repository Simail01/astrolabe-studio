import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChapterStore } from '../../stores/chapter.store';
import { useOutlineStore } from '../../stores/outline.store';
import { useWikiStore } from '../../stores/wiki.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useTemplateStore } from '../../stores/template.store';
import { TemplateSelector } from '../Template/TemplateSelector';
import { bridge } from '../../services/bridge';
import { toast } from '../../stores/toast.store';
import type { Chapter, ChapterStatus, OutlineNode, WikiEntry, Outline } from '@astrolabe/shared';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';

function findNode(nodes: OutlineNode[], id: string | null): OutlineNode | null {
  if (!id) return null;
  for (const n of nodes) { if (n.id === id) return n; const found = findNode(n.children, id); if (found) return found; }
  return null;
}
function flatNodes(nodes: OutlineNode[]): OutlineNode[] {
  return nodes.reduce<OutlineNode[]>((acc, n) => { acc.push(n); if (n.children.length > 0) acc.push(...flatNodes(n.children)); return acc; }, []);
}

export const WritingPage: React.FC = () => {
  const { currentChapter, content, wordCount, isDirty, setContent } = useChapterStore();
  const selectedNodeId = useOutlineStore(s => s.selectedNodeId);
  const outline = useOutlineStore(s => s.outline);
  const wikiEntries = useWikiStore(s => s.entries);
  const getProjectPath = useWorkspaceStore(s => s.getProjectPath);
  const workspace = useWorkspaceStore(s => s.workspace);
  const activeProject = useWorkspaceStore(s => s.activeProject);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [pinnedEntryIds, setPinnedEntryIds] = useState<Set<string>>(new Set());
  const [wikiSearch, setWikiSearch] = useState('');
  const [wikiSearchDebounced, setWikiSearchDebounced] = useState('');
  const wikiSearchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce wiki search (300ms)
  useEffect(() => {
    if (wikiSearchTimerRef.current) clearTimeout(wikiSearchTimerRef.current);
    wikiSearchTimerRef.current = setTimeout(() => setWikiSearchDebounced(wikiSearch), 300);
    return () => { if (wikiSearchTimerRef.current) clearTimeout(wikiSearchTimerRef.current); };
  }, [wikiSearch]);
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const selectedNode = outline?.nodes ? findNode(outline.nodes, selectedNodeId) : null;
  const nodeList = outline?.nodes ? flatNodes(outline.nodes) : [];
  const chapterOrder = selectedNodeId ? nodeList.findIndex(n => n.id === selectedNodeId) : -1;

  // Load chapter on node select
  useEffect(() => {
    if (!selectedNodeId) { useChapterStore.getState().setChapter(null); return; }
    const pp = getProjectPath();
    if (!pp) return;
    bridge.pipelineGetChapter(pp, selectedNodeId).then(data => {
      if (data) useChapterStore.getState().setChapter(data as Chapter);
      else useChapterStore.getState().setChapter({ id: selectedNodeId, title: selectedNode?.title || '', content: '', wordCount: 0, order: Math.max(0, chapterOrder), status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }).catch(() => useChapterStore.getState().setChapter(null));
  }, [selectedNodeId]);

  // Load outline & wiki
  useEffect(() => {
    const pp = getProjectPath();
    if (!pp) return;
    bridge.pipelineGetOutline(pp).then(d => { if (d) useOutlineStore.getState().setOutline(d as Outline); }).catch(() => {});
    bridge.wikiSearch(pp, '').then(e => { if (e) useWikiStore.getState().setEntries(e as WikiEntry[]); }).catch(() => {});
  }, [activeProject, workspace]);

  // Save function (shared by auto-save and manual save)
  const doSave = useCallback(async () => {
    const pp = getProjectPath();
    const store = useChapterStore.getState();
    if (!pp || !selectedNodeId || !store.isDirty) return;
    setSaveStatus('saving');
    try {
      const ch: Chapter = {
        id: selectedNodeId,
        title: selectedNode?.title || '',
        content: store.content,
        wordCount: store.wordCount,
        order: Math.max(0, chapterOrder),
        status: store.currentChapter?.status || 'draft',
        createdAt: store.currentChapter?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await bridge.pipelineSaveChapter(pp, ch);
      useChapterStore.getState().markClean();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) { setSaveStatus('idle'); toast.error('保存失败: ' + (e as Error).message); }
  }, [selectedNodeId, selectedNode, chapterOrder]);

  // Auto-save with debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!isDirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(doSave, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [content, isDirty, doSave]);

  // Toggle pin for a wiki entry
  const togglePin = useCallback((entryId: string) => {
    setPinnedEntryIds(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }, []);

  // AI write — includes both auto-matched and pinned entries
  const getSelectedTemplate = useTemplateStore(s => s.getSelectedTemplate);
  const handleAIWrite = async () => {
    setAiGenerating(true);
    const startContent = useChapterStore.getState().content;
    let streamedText = '';
    const unsubChunk = bridge.onAIChunk((t: string) => { streamedText += t; setContent(startContent + streamedText); });
    const unsubDone = bridge.onAIDone(() => { unsubChunk(); unsubDone(); setAiGenerating(false); });
    const unsubError = bridge.onAIError((err: string) => { unsubChunk(); unsubDone(); unsubError(); setAiGenerating(false); if (streamedText) setContent(startContent + streamedText + '\n\n[中断: ' + err + ']'); });
    try {
      const autoMatched = wikiEntries.filter(e => { const t = selectedNode?.title || ''; return e.title.includes(t) || t.includes(e.title); });
      const pinned = wikiEntries.filter(e => pinnedEntryIds.has(e.id) && !autoMatched.some(a => a.id === e.id));
      const allContextEntries = [...autoMatched, ...pinned];
      const ctx = allContextEntries.map(e => `【${e.title}】${e.summary || e.content || ''}`).join('\n');
      const stage = startContent ? 'chapter:continue' : 'chapter:write';
      const template = getSelectedTemplate(stage);
      const sysPrompt = template?.content
        ? template.content.replace('{{chapterTitle}}', selectedNode?.title || '').replace('{{wikiContext}}', ctx).replace('{{existingContent}}', startContent.slice(-500))
        : `你是专业小说作家。${ctx ? '\nWiki:\n' + ctx : ''}`;
      await bridge.generateTextStream(startContent ? `续写: ${startContent.slice(-500)}` : `撰写: ${selectedNode?.title}`, sysPrompt, workspace?.path, stage);
    } catch { unsubChunk(); unsubDone(); unsubError(); setAiGenerating(false); }
  };

  // Auto-matched entries + pinned entries (deduplicated)
  const autoMatchedWiki = wikiEntries.filter(e => { const t = selectedNode?.title || ''; return e.title.includes(t) || t.includes(e.title) || e.aliases?.some((a: string) => t.includes(a)); });
  const pinnedOnly = wikiEntries.filter(e => pinnedEntryIds.has(e.id) && !autoMatchedWiki.some(a => a.id === e.id));
  const relevantWiki = [...autoMatchedWiki, ...pinnedOnly];
  // Entries available for search/pin (not already in relevantWiki)
  const searchableEntries = wikiEntries.filter(e => !relevantWiki.some(r => r.id === e.id));
  const filteredSearchEntries = wikiSearchDebounced.trim()
    ? searchableEntries.filter(e => e.title.toLowerCase().includes(wikiSearchDebounced.toLowerCase()) || e.summary?.toLowerCase().includes(wikiSearchDebounced.toLowerCase())).slice(0, 50)
    : [];
  const projectPath = getProjectPath();

  // Empty state
  if (!workspace || !activeProject || !projectPath) {
    return (
      <EmptyState
        variant="page"
        icon={<Icon name="writing" size={48} color="var(--text-muted)" />}
        title={!workspace ? '请先打开工作区' : '请先在左侧选择一个作品'}
      />
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Chapter list */}
      <div style={{ width: 160, minWidth: 120, backgroundColor: 'var(--bg-panel)', borderRight: '1px solid var(--border-subtle)', overflow: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>章节</div>
        {nodeList.map(n => (
          <div
            key={n.id}
            onClick={() => { if (renamingNodeId !== n.id) useOutlineStore.getState().selectNode(n.id); }}
            onDoubleClick={(e) => { e.stopPropagation(); setRenamingNodeId(n.id); setRenameValue(n.title || ''); setTimeout(() => renameInputRef.current?.select(), 0); }}
            onMouseEnter={() => setHoveredNodeId(n.id)}
            onMouseLeave={() => setHoveredNodeId(null)}
            style={{
              padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: n.id === selectedNodeId ? 'var(--text-inverse)' : 'var(--text-secondary)',
              backgroundColor: n.id === selectedNodeId ? 'var(--accent-dim)' : 'transparent',
              borderLeft: n.id === selectedNodeId ? '2px solid var(--accent)' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 4, position: 'relative',
            }}
          >
            {renamingNodeId === n.id ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { useOutlineStore.getState().updateNode(n.id, { title: renameValue.trim() || n.title }); setRenamingNodeId(null); }
                  if (e.key === 'Escape') setRenamingNodeId(null);
                }}
                onBlur={() => { useOutlineStore.getState().updateNode(n.id, { title: renameValue.trim() || n.title }); setRenamingNodeId(null); }}
                onClick={(e) => e.stopPropagation()}
                style={{ flex: 1, fontSize: 13, padding: '1px 4px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--accent)', borderRadius: 2, color: 'var(--text-primary)', outline: 'none' }}
              />
            ) : (
              <>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title || '未命名'}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    if (n.children.length > 0) {
                      toast.warning('该节点包含子节点，无法直接删除');
                    } else {
                      useOutlineStore.getState().removeNode(n.id);
                    }
                  }}
                  style={{ fontSize: 10, color: 'var(--text-muted)', cursor: 'pointer', opacity: hoveredNodeId === n.id ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0, padding: '0 2px' }}
                  title="删除节点"
                >✕</span>
              </>
            )}
          </div>
        ))}
        {nodeList.length === 0 && (
          <EmptyState variant="inline" title="暂无章节。切换到大纲模式创建大纲节点" />
        )}
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={selectedNodeId ? '开始写作...' : '请在左侧选择一个章节'}
            spellCheck={false}
            disabled={!selectedNodeId}
            style={{
              width: '100%', maxWidth: 700, height: '100%', padding: '32px 24px',
              backgroundColor: 'transparent', border: 'none', outline: 'none', resize: 'none',
              fontSize: 16, color: 'var(--text-primary)',
              fontFamily: '"Microsoft YaHei", "Noto Serif SC", Georgia, serif',
              lineHeight: 1.9, caretColor: 'var(--accent)',
            }}
          />
        </div>
        {/* Bottom toolbar */}
        <div style={{ display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ width: '100%', maxWidth: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 24px', fontSize: 11, color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span>{wordCount} 字</span>
              {saveStatus === 'saving' && <span style={{ color: 'var(--color-warning)' }}>保存中…</span>}
              {saveStatus === 'saved' && <span style={{ color: 'var(--color-success)' }}>已保存</span>}
              {saveStatus === 'idle' && isDirty && <span style={{ color: 'var(--color-warning)' }}>未保存</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <TemplateSelector stage="chapter:write" />
              <button onClick={handleAIWrite} disabled={!!aiGenerating || !selectedNodeId} style={{ padding: '4px 12px', fontSize: 11, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderRadius: 4, cursor: aiGenerating || !selectedNodeId ? 'not-allowed' : 'pointer', opacity: aiGenerating || !selectedNodeId ? 0.6 : 1 }}>{aiGenerating ? '生成中...' : 'AI 续写'}</button>
              <button onClick={doSave} disabled={!isDirty || !selectedNodeId} style={{ padding: '4px 12px', fontSize: 11, backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 4, cursor: !isDirty || !selectedNodeId ? 'not-allowed' : 'pointer', opacity: !isDirty || !selectedNodeId ? 0.5 : 1 }}>保存</button>
            </div>
          </div>
        </div>
      </div>

      {/* Wiki context — auto-matched + pinned */}
      <div style={{ width: 280, minWidth: 200, backgroundColor: 'var(--bg-panel)', borderLeft: '1px solid var(--border-subtle)', overflow: 'auto', flexShrink: 0, display: relevantWiki.length > 0 || pinnedEntryIds.size > 0 ? 'block' : 'none' }}>
        <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>参考</div>

        {/* Search to pin additional entries */}
        <div style={{ padding: '0 8px 6px' }}>
          <input
            value={wikiSearch}
            onChange={e => setWikiSearch(e.target.value)}
            placeholder="搜索 Wiki 条目以添加…"
            style={{ width: '100%', padding: '4px 8px', fontSize: 11, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 3, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
          />
          {filteredSearchEntries.length > 0 && (
            <div style={{ marginTop: 4, maxHeight: 120, overflow: 'auto', backgroundColor: 'var(--bg-base)', borderRadius: 3, border: '1px solid var(--border-subtle)' }}>
              {filteredSearchEntries.map(e => (
                <div
                  key={e.id}
                  onClick={() => { togglePin(e.id); setWikiSearch(''); }}
                  style={{ padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={ev => { (ev.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--accent-dim)'; }}
                  onMouseLeave={ev => { (ev.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
                >+ {e.title}</div>
              ))}
            </div>
          )}
        </div>

        {relevantWiki.map(e => {
          const isPinned = pinnedEntryIds.has(e.id);
          const isAuto = autoMatchedWiki.some(a => a.id === e.id);
          return (
            <div key={e.id} style={{ margin: '4px 8px', padding: '8px 10px', backgroundColor: isPinned ? 'var(--bg-control)' : 'var(--bg-base)', borderRadius: 4, border: isPinned ? '1px solid var(--accent)' : '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={() => togglePin(e.id)}
                  style={{ marginTop: 3, cursor: 'pointer', flexShrink: 0 }}
                  title={isPinned ? '取消固定' : '固定到 AI 上下文'}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>
                    {isPinned && <span style={{ marginRight: 4 }}>&#128204;</span>}
                    {e.title}
                    {isAuto && !isPinned && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>(自动匹配)</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{e.summary || e.content?.slice(0, 100)}</div>
                </div>
              </div>
            </div>
          );
        })}
        {relevantWiki.length === 0 && (
          <div style={{ padding: '12px 8px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            暂无参考条目。使用上方搜索框手动添加。
          </div>
        )}
      </div>
    </div>
  );
};
