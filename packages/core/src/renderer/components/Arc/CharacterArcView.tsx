import React, { useState, useEffect, useCallback } from 'react';
import { useArcStore } from '../../stores/arc.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useWikiStore } from '../../stores/wiki.store';
import { bridge } from '../../services/bridge';
import { toast } from '../../stores/toast.store';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';
import type { CharacterArc, CharacterArcState } from '@astrolabe/shared';

const btnPrimary: React.CSSProperties = {
  padding: '4px 12px', fontSize: 12, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)',
  border: 'none', borderRadius: 3, cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '4px 12px', fontSize: 12, backgroundColor: 'var(--bg-control)', color: 'var(--text-primary)',
  border: '1px solid var(--border-subtle)', borderRadius: 3, cursor: 'pointer',
};

const cardStyle: React.CSSProperties = {
  padding: '10px 12px', marginBottom: 8, borderRadius: 4,
  backgroundColor: 'var(--bg-control)', border: '1px solid var(--border-subtle)',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '4px 8px', fontSize: 12, backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-subtle)', borderRadius: 3, color: 'var(--text-primary)',
  outline: 'none', boxSizing: 'border-box',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit',
};

interface EditingState {
  chapterId: string;
  chapterTitle: string;
  goals: string[];
  relationships: { target: string; relation: string }[];
  mentalState: string;
  abilities: string[];
  summary: string;
}

const emptyState: EditingState = {
  chapterId: '', chapterTitle: '', goals: [], relationships: [],
  mentalState: '', abilities: [], summary: '',
};

export const CharacterArcView: React.FC = () => {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const activeProject = useWorkspaceStore((s) => s.activeProject);
  const { entries: wikiEntries, setEntries: setWikiEntries } = useWikiStore();
  const { arcs, selectedEntryId, summarizing, setArc, selectEntry, setSummarizing } = useArcStore();

  const [personEntries, setPersonEntries] = useState<{ id: string; title: string }[]>([]);
  const [chapters, setChapters] = useState<{ id: string; title: string }[]>([]);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const projectPath = activeProject && workspace ? `${workspace.path}/${activeProject}` : null;

  const loadPersonEntries = useCallback(async () => {
    if (!projectPath) return;
    try {
      const list = await bridge.wikiList(projectPath, 'person') as { id: string; title: string }[];
      setPersonEntries(list);
      if (wikiEntries.length === 0) {
        const all = await bridge.wikiList(projectPath) as any[];
        setWikiEntries(all as any);
      }
    } catch (e) {
      toast.error('加载人物列表失败');
    }
  }, [projectPath, wikiEntries.length, setWikiEntries]);

  const loadChapters = useCallback(async () => {
    if (!projectPath) return;
    try {
      const list = await bridge.pipelineListChapters(projectPath) as string[];
      const chapterInfos = list.map(id => ({ id, title: id.replace(/\.json$/, '') }));
      setChapters(chapterInfos);
    } catch (e) {
      setChapters([]);
    }
  }, [projectPath]);

  const loadArc = useCallback(async (entryId: string) => {
    if (!projectPath) return;
    try {
      const arc = await bridge.arcGet(projectPath, entryId) as CharacterArc | null;
      if (arc) setArc(arc);
    } catch (e) {
      toast.error('加载角色弧光失败');
    }
  }, [projectPath, setArc]);

  useEffect(() => {
    loadPersonEntries();
    loadChapters();
  }, [loadPersonEntries, loadChapters]);

  useEffect(() => {
    if (selectedEntryId) loadArc(selectedEntryId);
  }, [selectedEntryId, loadArc]);

  const currentArc = selectedEntryId ? arcs.get(selectedEntryId) : null;
  const selectedPerson = personEntries.find(p => p.id === selectedEntryId);

  const handleSummarize = async () => {
    if (!projectPath || !selectedEntryId || !selectedPerson) return;
    setSummarizing(true);
    try {
      const summary = await bridge.arcSummarize(projectPath, selectedEntryId, selectedPerson.title);
      if (currentArc) {
        setArc({ ...currentArc, aiSummary: summary });
      }
      toast.success('AI 总结完成');
    } catch (e) {
      toast.error('AI 总结失败: ' + (e as Error).message);
    } finally {
      setSummarizing(false);
    }
  };

  const handleSaveState = async () => {
    if (!projectPath || !selectedEntryId || !editing) return;
    const state: CharacterArcState = {
      chapterId: editing.chapterId,
      chapterTitle: editing.chapterTitle,
      goals: editing.goals,
      relationships: editing.relationships,
      mentalState: editing.mentalState,
      abilities: editing.abilities,
      summary: editing.summary,
      updatedAt: new Date().toISOString(),
    };
    try {
      const arc = await bridge.arcAddState(projectPath, selectedEntryId, state) as CharacterArc;
      setArc(arc);
      setEditing(null);
      setShowAddForm(false);
      toast.success('状态已保存');
    } catch (e) {
      toast.error('保存失败: ' + (e as Error).message);
    }
  };

  const handleEditState = (state: CharacterArcState) => {
    setEditing({
      chapterId: state.chapterId,
      chapterTitle: state.chapterTitle,
      goals: [...state.goals],
      relationships: state.relationships.map(r => ({ ...r })),
      mentalState: state.mentalState,
      abilities: [...state.abilities],
      summary: state.summary,
    });
    setShowAddForm(true);
  };

  const handleAddNew = () => {
    setEditing({ ...emptyState });
    setShowAddForm(true);
  };

  const handleChapterSelect = (chapterId: string, chapterTitle: string) => {
    if (editing) {
      setEditing({ ...editing, chapterId, chapterTitle });
    }
  };

  const updateGoals = (value: string) => {
    if (!editing) return;
    setEditing({ ...editing, goals: value.split('\n').filter(Boolean) });
  };

  const updateAbilities = (value: string) => {
    if (!editing) return;
    setEditing({ ...editing, abilities: value.split('\n').filter(Boolean) });
  };

  const updateRelationship = (index: number, field: 'target' | 'relation', value: string) => {
    if (!editing) return;
    const rels = [...editing.relationships];
    rels[index] = { ...rels[index], [field]: value };
    setEditing({ ...editing, relationships: rels });
  };

  const addRelationship = () => {
    if (!editing) return;
    setEditing({ ...editing, relationships: [...editing.relationships, { target: '', relation: '' }] });
  };

  const removeRelationship = (index: number) => {
    if (!editing) return;
    const rels = editing.relationships.filter((_, i) => i !== index);
    setEditing({ ...editing, relationships: rels });
  };

  if (!activeProject) {
    return (
      <EmptyState
        variant="page"
        icon={<Icon name="wiki" size={48} color="var(--text-muted)" />}
        title="请先在左侧选择一个作品"
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-panel)' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, alignItems: 'center', padding: '0 8px' }}>
        <select
          value={selectedEntryId || ''}
          onChange={(e) => selectEntry(e.target.value || null)}
          style={{ ...inputStyle, width: 'auto', minWidth: 150, margin: '6px 0', border: 'none', backgroundColor: 'var(--bg-panel)' }}
        >
          <option value="">选择角色…</option>
          {personEntries.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        {selectedEntryId && (
          <>
            <button
              onClick={handleSummarize}
              disabled={summarizing}
              style={{ ...btnSecondary, margin: '6px 4px', opacity: summarizing ? 0.5 : 1 }}
            >
              {summarizing ? '总结中…' : 'AI 总结'}
            </button>
            <button onClick={handleAddNew} style={{ ...btnPrimary, margin: '6px 4px' }}>
              + 添加状态
            </button>
          </>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {!selectedEntryId ? (
          <EmptyState
            variant="panel"
            title="请选择一个角色"
            description="从上方下拉菜单选择人物 Wiki 条目以查看其弧光"
          />
        ) : !currentArc || currentArc.states.length === 0 ? (
          <EmptyState
            variant="panel"
            title="暂无角色弧光数据"
            description="点击「添加状态」记录角色在各章节的状态变化"
            action={{ label: '添加状态', onClick: handleAddNew }}
          />
        ) : (
          <>
            {currentArc.aiSummary && (
              <div style={{ ...cardStyle, marginBottom: 12, borderLeft: '3px solid var(--accent)' }}>
                <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4, fontWeight: 600 }}>AI 总结</div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {currentArc.aiSummary}
                </div>
              </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              角色状态时间线（共 {currentArc.states.length} 个节点）
            </div>

            {currentArc.states.map((state, i) => (
              <div key={state.chapterId} style={{ ...cardStyle, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    <span style={{ color: 'var(--accent)', marginRight: 6 }}>{i + 1}.</span>
                    {state.chapterTitle}
                  </div>
                  <button
                    onClick={() => handleEditState(state)}
                    style={{ ...btnSecondary, padding: '2px 8px', fontSize: 10 }}
                  >编辑</button>
                </div>

                {state.goals.length > 0 && (
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--accent)' }}>目标: </span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{state.goals.join('、')}</span>
                  </div>
                )}

                {state.relationships.length > 0 && (
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--accent)' }}>关系: </span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {state.relationships.map(r => `${r.target}(${r.relation})`).join('、')}
                    </span>
                  </div>
                )}

                {state.mentalState && (
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--accent)' }}>心态: </span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{state.mentalState}</span>
                  </div>
                )}

                {state.abilities.length > 0 && (
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--accent)' }}>能力: </span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{state.abilities.join('、')}</span>
                  </div>
                )}

                {state.summary && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                    {state.summary}
                  </div>
                )}

                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                  更新于 {new Date(state.updatedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {showAddForm && editing && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'var(--bg-panel)', borderRadius: 8, padding: 20, width: 500, maxHeight: '80vh',
            overflow: 'auto', border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              {editing.chapterId ? '编辑角色状态' : '添加角色状态'}
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>章节</label>
              <select
                value={editing.chapterId}
                onChange={(e) => {
                  const ch = chapters.find(c => c.id === e.target.value);
                  handleChapterSelect(e.target.value, ch?.title || '');
                }}
                style={inputStyle}
              >
                <option value="">选择章节…</option>
                {chapters.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>目标（每行一个）</label>
              <textarea
                value={editing.goals.join('\n')}
                onChange={(e) => updateGoals(e.target.value)}
                style={textareaStyle}
                placeholder="击败魔王\n拯救公主"
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>心态</label>
              <input
                value={editing.mentalState}
                onChange={(e) => setEditing({ ...editing, mentalState: e.target.value })}
                style={inputStyle}
                placeholder="坚定、迷茫、愤怒…"
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>能力（每行一个）</label>
              <textarea
                value={editing.abilities.join('\n')}
                onChange={(e) => updateAbilities(e.target.value)}
                style={textareaStyle}
                placeholder="火球术 Lv3\n治愈术 Lv1"
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>人际关系</label>
                <button onClick={addRelationship} style={{ ...btnSecondary, padding: '2px 8px', fontSize: 10 }}>+ 添加</button>
              </div>
              {editing.relationships.map((rel, i) => (
                <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <input
                    value={rel.target}
                    onChange={(e) => updateRelationship(i, 'target', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="对象"
                  />
                  <input
                    value={rel.relation}
                    onChange={(e) => updateRelationship(i, 'relation', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="关系"
                  />
                  <button
                    onClick={() => removeRelationship(i)}
                    style={{ ...btnSecondary, padding: '2px 6px', fontSize: 10, color: 'var(--color-error)' }}
                  >删除</button>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>状态摘要</label>
              <textarea
                value={editing.summary}
                onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                style={textareaStyle}
                placeholder="简要描述角色在本章的状态…"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button onClick={() => { setEditing(null); setShowAddForm(false); }} style={btnSecondary}>取消</button>
              <button onClick={handleSaveState} style={btnPrimary} disabled={!editing.chapterId}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
