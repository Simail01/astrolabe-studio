import React, { useState, useEffect, useCallback } from 'react';
import { useTimelineStore } from '../../stores/timeline.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useOutlineStore } from '../../stores/outline.store';
import { bridge } from '../../services/bridge';
import { toast } from '../../stores/toast.store';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';
import { WikiEntryForm } from '../Wiki/WikiEntryForm';
import { randomUUID } from '../../utils/uuid';
import type { TimelineEvent, Outline, OutlineNode } from '@astrolabe/shared';

interface ForeshadowWikiEntry {
  id: string;
  type: string;
  title: string;
  aliases: string[];
}

const typeLabels: Record<TimelineEvent['type'], string> = {
  plot: '剧情',
  character: '角色',
  world: '世界观',
  foreshadow: '伏笔',
};

const typeColors: Record<TimelineEvent['type'], string> = {
  plot: 'var(--accent)',
  character: 'var(--color-success, #4caf50)',
  world: 'var(--color-info, #2196f3)',
  foreshadow: 'var(--color-warning, #e6a817)',
};

interface EventFormData {
  title: string;
  description: string;
  type: TimelineEvent['type'];
  chapterId: string;
  chapterTitle: string;
}

const emptyForm: EventFormData = { title: '', description: '', type: 'plot', chapterId: '', chapterTitle: '' };

function flatNodes(nodes: OutlineNode[]): OutlineNode[] {
  return nodes.reduce<OutlineNode[]>((acc, n) => { acc.push(n); if (n.children.length > 0) acc.push(...flatNodes(n.children)); return acc; }, []);
}

export const TimelineView: React.FC = () => {
  const { events, loading, extractLoading, setEvents, addEvents, updateEvent, removeEvent, addEvent, setLoading, setExtractLoading } = useTimelineStore();
  const getProjectPath = useWorkspaceStore((s) => s.getProjectPath);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const activeProject = useWorkspaceStore((s) => s.activeProject);
  const outline = useOutlineStore((s) => s.outline);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormData>(emptyForm);
  const [filterType, setFilterType] = useState<TimelineEvent['type'] | null>(null);
  const [foreshadowWikiEntries, setForeshadowWikiEntries] = useState<ForeshadowWikiEntry[]>([]);
  const [showWikiForm, setShowWikiForm] = useState(false);
  const [wikiFormTitle, setWikiFormTitle] = useState('');

  const nodeList = outline?.nodes ? flatNodes(outline.nodes) : [];

  const loadTimeline = useCallback(async () => {
    const pp = getProjectPath();
    if (!pp) return;
    setLoading(true);
    try {
      const data = (await bridge.timelineGet(pp)) as { events: TimelineEvent[] };
      setEvents(data.events || []);
    } catch { } finally {
      setLoading(false);
    }
  }, [getProjectPath]);

  useEffect(() => { loadTimeline(); }, [loadTimeline]);

  useEffect(() => {
    const pp = getProjectPath();
    if (!pp) return;
    bridge.wikiList(pp, 'foreshadow').then((entries) => {
      setForeshadowWikiEntries(entries as ForeshadowWikiEntry[]);
    }).catch(() => {});
  }, [activeProject, workspace]);

  useEffect(() => {
    const pp = getProjectPath();
    if (!pp) return;
    bridge.pipelineGetOutline(pp).then(d => { if (d) useOutlineStore.getState().setOutline(d as Outline); }).catch(() => {});
  }, [activeProject, workspace]);

  const handleSave = async () => {
    const pp = getProjectPath();
    if (!pp) return;
    if (!form.title.trim()) { toast.warning('请输入事件标题'); return; }

    if (editingId) {
      const updated: TimelineEvent = {
        ...events.find((e) => e.id === editingId)!,
        title: form.title,
        description: form.description,
        type: form.type,
        chapterId: form.chapterId,
        chapterTitle: form.chapterTitle,
      };
      updateEvent(updated);
      await bridge.timelineSave(pp, { events: events.map((e) => (e.id === editingId ? updated : e)), updatedAt: new Date().toISOString() });
      toast.success('事件已更新');
    } else {
      const newEvent: TimelineEvent = {
        id: randomUUID(),
        title: form.title,
        description: form.description,
        type: form.type,
        chapterId: form.chapterId,
        chapterTitle: form.chapterTitle,
        relatedEntries: [],
        order: events.length,
      };
      addEvent(newEvent);
      await bridge.timelineSave(pp, { events: [...events, newEvent], updatedAt: new Date().toISOString() });
      toast.success('事件已添加');
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (ev: TimelineEvent) => {
    setEditingId(ev.id);
    setForm({ title: ev.title, description: ev.description, type: ev.type, chapterId: ev.chapterId, chapterTitle: ev.chapterTitle });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const pp = getProjectPath();
    if (!pp) return;
    removeEvent(id);
    const updated = events.filter((e) => e.id !== id);
    await bridge.timelineSave(pp, { events: updated, updatedAt: new Date().toISOString() });
    toast.success('事件已删除');
  };

  const handleExtract = async () => {
    const pp = getProjectPath();
    if (!pp) return;
    if (nodeList.length === 0) { toast.warning('暂无章节，请先创建大纲'); return; }

    setExtractLoading(true);
    try {
      let allNew: TimelineEvent[] = [];
      for (const node of nodeList) {
        const chData = (await bridge.pipelineGetChapter(pp, node.id)) as { content?: string } | null;
        const content = chData?.content;
        if (!content) continue;
        const result = (await bridge.timelineExtract(pp, node.id, content, node.title)) as TimelineEvent[];
        allNew = [...allNew, ...result];
      }
      if (allNew.length > 0) {
        addEvents(allNew);
        await bridge.timelineSave(pp, { events: [...events, ...allNew], updatedAt: new Date().toISOString() });
        toast.success(`AI 提取了 ${allNew.length} 个事件`);
      } else {
        toast.info('未提取到新事件');
      }
    } catch (e) {
      toast.error('AI 提取失败: ' + (e as Error).message);
    } finally {
      setExtractLoading(false);
    }
  };

  const handleExtractChapter = async (node: OutlineNode) => {
    const pp = getProjectPath();
    if (!pp) return;
    setExtractLoading(true);
    try {
      const chData = (await bridge.pipelineGetChapter(pp, node.id)) as { content?: string } | null;
      const content = chData?.content;
      if (!content) { toast.warning('该章节暂无内容'); return; }
      const result = (await bridge.timelineExtract(pp, node.id, content, node.title)) as TimelineEvent[];
      if (result.length > 0) {
        addEvents(result);
        await bridge.timelineSave(pp, { events: [...events, ...result], updatedAt: new Date().toISOString() });
        toast.success(`从「${node.title}」提取了 ${result.length} 个事件`);
      } else {
        toast.info('未提取到新事件');
      }
    } catch (e) {
      toast.error('AI 提取失败: ' + (e as Error).message);
    } finally {
      setExtractLoading(false);
    }
  };

  const filteredEvents = filterType ? events.filter((e) => e.type === filterType) : events;
  const groupedByChapter = filteredEvents.reduce<Record<string, TimelineEvent[]>>((acc, ev) => {
    const key = ev.chapterTitle || '未分组';
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  const projectPath = getProjectPath();

  if (!workspace || !activeProject || !projectPath) {
    return (
      <EmptyState
        variant="page"
        icon={<Icon name="outline" size={48} color="var(--text-muted)" />}
        title={!workspace ? '请先打开工作区' : '请先在左侧选择一个作品'}
      />
    );
  }

  return (
    <>
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', gap: 8, borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, backgroundColor: 'var(--bg-panel)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>时间线</span>
          <div style={{ flex: 1 }} />
          <button onClick={handleExtract} disabled={extractLoading} style={{ padding: '4px 12px', fontSize: 11, backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 3, cursor: extractLoading ? 'not-allowed' : 'pointer', opacity: extractLoading ? 0.5 : 1 }}>{extractLoading ? '提取中…' : 'AI 全量提取'}</button>
          <button onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }} style={{ padding: '4px 12px', fontSize: 11, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderRadius: 3, cursor: 'pointer' }}>+ 新建事件</button>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: '6px 16px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          <span onClick={() => setFilterType(null)} style={{ padding: '2px 8px', fontSize: 11, cursor: 'pointer', borderRadius: 3, color: filterType === null ? 'var(--text-inverse)' : 'var(--text-secondary)', backgroundColor: filterType === null ? 'var(--accent-dim)' : 'transparent' }}>全部</span>
          {(Object.keys(typeLabels) as TimelineEvent['type'][]).map((t) => (
            <span key={t} onClick={() => setFilterType(t)} style={{ padding: '2px 8px', fontSize: 11, cursor: 'pointer', borderRadius: 3, color: filterType === t ? 'var(--text-inverse)' : 'var(--text-secondary)', backgroundColor: filterType === t ? typeColors[t] : 'transparent' }}>{typeLabels[t]}</span>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
          {loading ? (
            <EmptyState variant="inline" title="加载中…" />
          ) : filteredEvents.length === 0 ? (
            <EmptyState variant="panel" title="暂无时间线事件" description="点击「AI 全量提取」从章节中自动提取，或手动添加事件" action={{ label: '手动添加', onClick: () => { setEditingId(null); setForm(emptyForm); setShowForm(true); } }} />
          ) : (
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 2, backgroundColor: 'var(--border-subtle)' }} />
              {Object.entries(groupedByChapter).map(([chapterTitle, chapterEvents]) => (
                <div key={chapterTitle} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 12, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: -20, top: 4, width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--accent)', border: '2px solid var(--bg-base)' }} />
                    {chapterTitle}
                    <button onClick={() => { const node = nodeList.find(n => n.title === chapterTitle); if (node) handleExtractChapter(node); }} disabled={extractLoading} style={{ marginLeft: 8, padding: '1px 6px', fontSize: 10, backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 2, cursor: extractLoading ? 'not-allowed' : 'pointer', opacity: extractLoading ? 0.5 : 1 }}>AI</button>
                  </div>
                  {chapterEvents.sort((a, b) => a.order - b.order).map((ev) => (
                    <div key={ev.id} style={{ marginBottom: 12, padding: '10px 14px', backgroundColor: 'var(--bg-control)', borderRadius: 6, border: '1px solid var(--border-subtle)', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: -20, top: 14, width: 8, height: 8, borderRadius: '50%', backgroundColor: typeColors[ev.type], border: '2px solid var(--bg-base)' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 2, backgroundColor: typeColors[ev.type], color: 'var(--text-inverse)' }}>{typeLabels[ev.type]}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{ev.title}</span>
                        <div style={{ flex: 1 }} />
                        <button onClick={() => handleEdit(ev)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, padding: '0 4px' }}>编辑</button>
                        <button onClick={() => handleDelete(ev.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, padding: '0 4px' }}>删除</button>
                      </div>
                      {ev.type === 'foreshadow' && (() => {
                        const matched = foreshadowWikiEntries.some(w => w.title === ev.title || w.aliases.includes(ev.title));
                        return matched ? (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 2, backgroundColor: 'var(--color-success, #4caf50)', color: 'var(--text-inverse)', marginLeft: 8, whiteSpace: 'nowrap' }}>
                            &#10003; 已记录
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 2, backgroundColor: 'var(--color-warning, #e6a817)', color: 'var(--text-inverse)', whiteSpace: 'nowrap' }}>
                              &#9888; 未记录
                            </span>
                            <button
                              onClick={() => { setWikiFormTitle(ev.title); setShowWikiForm(true); }}
                              style={{ fontSize: 10, padding: '1px 6px', borderRadius: 2, backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >创建 Wiki 条目</button>
                          </span>
                        );
                      })()}
                      {ev.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ev.description}</div>}
                      {ev.relatedEntries.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                          {ev.relatedEntries.map((entry, i) => (
                            <span key={i} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 2, backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>{entry}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{ width: 320, borderLeft: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{editingId ? '编辑事件' : '新建事件'}</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>标题</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="事件标题" style={{ width: '100%', padding: '6px 8px', fontSize: 13, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 4, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }} />

            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>描述</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="事件描述" rows={4} style={{ width: '100%', padding: '6px 8px', fontSize: 13, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 4, outline: 'none', marginBottom: 12, resize: 'vertical', boxSizing: 'border-box' }} />

            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>类型</label>
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {(Object.keys(typeLabels) as TimelineEvent['type'][]).map((t) => (
                <span key={t} onClick={() => setForm({ ...form, type: t })} style={{ padding: '4px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 3, color: form.type === t ? 'var(--text-inverse)' : 'var(--text-secondary)', backgroundColor: form.type === t ? typeColors[t] : 'var(--bg-control)', border: `1px solid ${form.type === t ? typeColors[t] : 'var(--border-subtle)'}` }}>{typeLabels[t]}</span>
              ))}
            </div>

            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>所属章节</label>
            <select value={form.chapterId} onChange={(e) => { const node = nodeList.find(n => n.id === e.target.value); setForm({ ...form, chapterId: e.target.value, chapterTitle: node?.title || '' }); }} style={{ width: '100%', padding: '6px 8px', fontSize: 13, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 4, outline: 'none', marginBottom: 12 }}>
              <option value="">选择章节</option>
              {nodeList.map((n) => (<option key={n.id} value={n.id}>{n.title || '未命名'}</option>))}
            </select>
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ padding: '6px 14px', fontSize: 12, backgroundColor: 'var(--bg-control)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 4, cursor: 'pointer' }}>取消</button>
            <button onClick={handleSave} style={{ padding: '6px 14px', fontSize: 12, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>{editingId ? '保存' : '添加'}</button>
          </div>
        </div>
      )}
    </div>

      {showWikiForm && (
        <WikiEntryForm
          entry={null}
          defaultTitle={wikiFormTitle}
          defaultType="foreshadow"
          onClose={() => {
            setShowWikiForm(false);
            setWikiFormTitle('');
            // Refresh foreshadow wiki entries after creating a new one
            const pp = getProjectPath();
            if (pp) {
              bridge.wikiList(pp, 'foreshadow').then((entries) => {
                setForeshadowWikiEntries(entries as ForeshadowWikiEntry[]);
              }).catch(() => {});
            }
          }}
        />
      )}
    </>
  );
};
