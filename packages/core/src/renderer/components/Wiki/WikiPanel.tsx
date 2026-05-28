import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useWikiStore, type EnrichResult, type ConsistencyResult, type RelationResult } from '../../stores/wiki.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { bridge } from '../../services/bridge';
import { toast } from '../../stores/toast.store';
import { EmptyState } from '../ui/EmptyState';
import { WikiEntryForm } from './WikiEntryForm';
import { Icon } from '../ui/Icon';
import type { WikiEntryType, WikiEntry } from '@astrolabe/shared';

const typeLabels: Record<WikiEntryType, string> = {
  person: '人物', location: '地点', faction: '势力', item: '物品', event: '事件', rule: '规则', foreshadow: '伏笔',
};
const types: WikiEntryType[] = ['person', 'location', 'faction', 'item', 'event', 'rule', 'foreshadow'];

const actionLabels: Record<string, string> = {
  append: '追加', overwrite: '覆盖', add: '新增',
};

const severityColors: Record<string, string> = {
  critical: 'var(--color-error)', warning: 'var(--color-warning, #e6a817)', info: 'var(--text-secondary)',
};

const btnAi: React.CSSProperties = {
  padding: '2px 8px', fontSize: 11, backgroundColor: 'var(--accent-dim)', color: 'var(--accent)',
  border: '1px solid var(--accent)', borderRadius: 3, cursor: 'pointer', whiteSpace: 'nowrap',
};

const resultCard: React.CSSProperties = {
  padding: '6px 8px', marginBottom: 4, borderRadius: 4,
  backgroundColor: 'var(--bg-control)', border: '1px solid var(--border-subtle)',
};

export const WikiPanel: React.FC = () => {
  const {
    filteredEntries, selectedEntryId, searchQuery, setSearchQuery, selectEntry,
    enrichResults, consistencyResults, relationResults,
    enrichLoading, consistencyLoading, relationsLoading,
    setEnrichResults, setConsistencyResults, setRelationResults,
    setEnrichLoading, setConsistencyLoading, setRelationsLoading,
    clearEnrichResults, clearConsistencyResults, clearRelationResults,
    addOrUpdateEntry,
  } = useWikiStore();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const activeProject = useWorkspaceStore((s) => s.activeProject);
  const getProjectPath = useWorkspaceStore((s) => s.getProjectPath);
  const [activeType, setActiveType] = useState<WikiEntryType | null>(null);
  const [formEntry, setFormEntry] = useState<WikiEntry | 'new' | null>(null);
  const [showResults, setShowResults] = useState<'enrich' | 'consistency' | 'relations' | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search (300ms)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  // Memoize filtered entries for performance
  const filteredEntriesMemo = useMemo(() => {
    const entries = useWikiStore.getState().entries;
    if (!debouncedQuery.trim()) return entries;
    const q = debouncedQuery.toLowerCase();
    return entries.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.summary?.toLowerCase().includes(q) ||
      e.aliases?.some((a: string) => a.toLowerCase().includes(q))
    ).slice(0, 100);
  }, [debouncedQuery, useWikiStore((s) => s.entries)]);

  const displayEntries = activeType ? filteredEntries.filter((e) => e.type === activeType) : filteredEntries;
  const selectedEntry = filteredEntries.find((e) => e.id === selectedEntryId) || null;

  const handleEnrich = async () => {
    const projectPath = getProjectPath();
    if (!projectPath || !selectedEntry) return;
    setEnrichLoading(true);
    clearEnrichResults();
    setShowResults('enrich');
    try {
      const results = await bridge.wikiEnrich(projectPath, selectedEntry.id, selectedEntry.title, selectedEntry.type) as EnrichResult[];
      setEnrichResults(results);
      if (results.length === 0) toast.info('未发现新的补充信息');
    } catch (e) {
      toast.error('AI 充实失败: ' + (e as Error).message);
      setShowResults(null);
    } finally {
      setEnrichLoading(false);
    }
  };

  const handleConsistency = async () => {
    const projectPath = getProjectPath();
    if (!projectPath) return;
    setConsistencyLoading(true);
    clearConsistencyResults();
    setShowResults('consistency');
    try {
      const results = await bridge.wikiConsistency(projectPath) as ConsistencyResult[];
      setConsistencyResults(results);
      if (results.length === 0) toast.info('未发现矛盾');
    } catch (e) {
      toast.error('一致性检查失败: ' + (e as Error).message);
      setShowResults(null);
    } finally {
      setConsistencyLoading(false);
    }
  };

  const handleRelations = async () => {
    const projectPath = getProjectPath();
    if (!projectPath) return;
    setRelationsLoading(true);
    clearRelationResults();
    setShowResults('relations');
    try {
      const results = await bridge.wikiRelations(projectPath) as RelationResult[];
      setRelationResults(results);
      if (results.length === 0) toast.info('未发现新关系');
    } catch (e) {
      toast.error('关系发现失败: ' + (e as Error).message);
      setShowResults(null);
    } finally {
      setRelationsLoading(false);
    }
  };

  const handleApplyRelation = async (item: RelationResult) => {
    const projectPath = getProjectPath();
    if (!projectPath) return;
    const { entries } = useWikiStore.getState();
    const sourceEntry = entries.find(e => e.title === item.sourceTitle);
    const targetEntry = entries.find(e => e.title === item.targetTitle);
    if (!sourceEntry || !targetEntry) {
      toast.error('未找到关联的 Wiki 条目，请先创建');
      return;
    }
    const updatedSource = {
      ...sourceEntry,
      relations: [
        ...sourceEntry.relations,
        { relationType: item.relationType, targetId: targetEntry.id, description: item.evidence },
      ],
      updatedAt: new Date().toISOString(),
    };
    try {
      await bridge.wikiSave(projectPath!, updatedSource);
      addOrUpdateEntry(updatedSource);
      toast.success(`已添加关系: ${item.sourceTitle} → ${item.targetTitle}`);
    } catch (e) {
      toast.error('应用关系失败: ' + (e as Error).message);
    }
  };

  const handleApplyEnrich = async (item: EnrichResult) => {
    const projectPath = getProjectPath();
    if (!projectPath || !selectedEntry) return;
    const updated = { ...selectedEntry, attributes: { ...selectedEntry.attributes } };
    if (item.action === 'add' || item.action === 'overwrite') {
      updated.attributes[item.field] = item.newValue;
    } else if (item.action === 'append') {
      const existing = updated.attributes[item.field];
      if (Array.isArray(existing)) {
        updated.attributes[item.field] = [...existing, item.newValue];
      } else if (existing) {
        updated.attributes[item.field] = existing + ', ' + item.newValue;
      } else {
        updated.attributes[item.field] = item.newValue;
      }
    }
    updated.updatedAt = new Date().toISOString();
    try {
      await bridge.wikiSave(projectPath!, updated);
      addOrUpdateEntry(updated);
      toast.success('已应用: ' + item.field);
    } catch (e) {
      toast.error('应用失败: ' + (e as Error).message);
    }
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
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div
          onClick={() => setActiveType(null)}
          style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: activeType === null ? 'var(--text-inverse)' : 'var(--text-secondary)', backgroundColor: activeType === null ? 'var(--accent-dim)' : 'transparent', borderRight: '1px solid var(--border-subtle)' }}
        >全部</div>
        {types.map((t) => (
          <div
            key={t}
            onClick={() => setActiveType(t)}
            style={{ padding: '6px 10px', fontSize: 12, cursor: 'pointer', color: activeType === t ? 'var(--text-inverse)' : 'var(--text-secondary)', backgroundColor: activeType === t ? 'var(--accent-dim)' : 'transparent', borderRight: '1px solid var(--border-subtle)' }}
          >{typeLabels[t]}</div>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={handleConsistency}
          disabled={consistencyLoading}
          style={{ ...btnAi, margin: 2, opacity: consistencyLoading ? 0.5 : 1 }}
        >{consistencyLoading ? '检查中…' : '一致性检查'}</button>
        <button
          onClick={handleRelations}
          disabled={relationsLoading}
          style={{ ...btnAi, margin: 2, opacity: relationsLoading ? 0.5 : 1 }}
        >{relationsLoading ? '发现中…' : '关系发现'}</button>
        <button
          onClick={() => setFormEntry('new')}
          style={{ padding: '4px 10px', fontSize: 11, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', cursor: 'pointer', margin: 2, borderRadius: 3 }}
        >+ 新建</button>
      </div>

      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="搜索 Wiki 条目…"
        style={{ width: '100%', padding: '4px 8px', fontSize: 13, backgroundColor: 'var(--bg-input)', border: 'none', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
      />

      <div style={{ flex: 1, overflow: 'auto' }}>
        {displayEntries.length === 0 ? (
          <EmptyState variant="inline" title="暂无 Wiki 条目" description="点击上方「+ 新建」创建第一个条目" />
        ) : (
          displayEntries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => selectEntry(entry.id)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: entry.id === selectedEntryId ? 'var(--accent-dim)' : 'transparent',
                color: entry.id === selectedEntryId ? 'var(--text-inverse)' : 'var(--text-primary)',
              }}
            >
              <span style={{ marginRight: 6, color: 'var(--text-muted)', fontSize: 11 }}>[{typeLabels[entry.type]}]</span>
              {entry.title}
              {entry.summary && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.summary}</div>}
            </div>
          ))
        )}
      </div>

      {selectedEntry && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 12, overflow: 'auto', maxHeight: '50%', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedEntry.title}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={handleEnrich}
                disabled={enrichLoading}
                style={{ ...btnAi, opacity: enrichLoading ? 0.5 : 1 }}
              >{enrichLoading ? '充实中…' : 'AI 充实'}</button>
              <button
                onClick={() => setFormEntry(selectedEntry)}
                style={{ padding: '2px 8px', fontSize: 11, backgroundColor: 'var(--bg-control)', color: 'var(--text-primary)', border: 'none', borderRadius: 3, cursor: 'pointer' }}
              >编辑</button>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{selectedEntry.summary}</div>
          {selectedEntry.content && <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 8, whiteSpace: 'pre-wrap' }}>{selectedEntry.content}</div>}
          {Object.keys(selectedEntry.attributes).length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {Object.entries(selectedEntry.attributes).map(([k, v]) => (
                <div key={k} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
                  <span style={{ color: 'var(--accent)' }}>{k}:</span> {Array.isArray(v) ? v.join(', ') : v}
                </div>
              ))}
            </div>
          )}
          {selectedEntry.relations.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>关联</div>
              {selectedEntry.relations.map((r, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
                  {r.relationType}: {r.description}
                </div>
              ))}
            </div>
          )}

          {showResults === 'enrich' && (
            <div style={{ marginTop: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>AI 充实建议</span>
                <button onClick={() => { setShowResults(null); clearEnrichResults(); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
              {enrichLoading ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>分析中，请稍候…</div>
              ) : enrichResults.length === 0 ? (
                <EmptyState variant="inline" title="暂无建议" />
              ) : (
                enrichResults.map((item, i) => (
                  <div key={i} style={resultCard}>
                    <div style={{ fontSize: 11, color: 'var(--text-primary)', marginBottom: 2 }}>
                      <span style={{ color: 'var(--accent)' }}>{item.field}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>[{actionLabels[item.action] || item.action}]</span>
                    </div>
                    {item.currentValue && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>当前: {item.currentValue}</div>}
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>新值: {item.newValue}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{item.evidence}（{item.sourceChapter}）</div>
                    <button
                      onClick={() => handleApplyEnrich(item)}
                      style={{ marginTop: 4, padding: '2px 8px', fontSize: 10, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderRadius: 3, cursor: 'pointer' }}
                    >应用</button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {showResults === 'consistency' && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 12, overflow: 'auto', maxHeight: '40%', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>一致性检查结果</span>
            <button onClick={() => { setShowResults(null); clearConsistencyResults(); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
          {consistencyLoading ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>检查中，请稍候…</div>
          ) : consistencyResults.length === 0 ? (
            <EmptyState variant="inline" title="未发现矛盾" description="所有设定与章节描述一致" />
          ) : (
            consistencyResults.map((item, i) => (
              <div key={i} style={resultCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{item.entryTitle}</span>
                  <span style={{ fontSize: 10, padding: '1px 4px', borderRadius: 2, backgroundColor: severityColors[item.severity], color: 'var(--text-inverse)' }}>{item.severity}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.field}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {item.chapterA}: {item.valueA}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {item.chapterB}: {item.valueB}
                </div>
                <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>建议: {item.suggestion}</div>
              </div>
            ))
          )}
        </div>
      )}

      {showResults === 'relations' && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 12, overflow: 'auto', maxHeight: '40%', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>发现的新关系</span>
            <button onClick={() => { setShowResults(null); clearRelationResults(); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
          {relationsLoading ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>分析中，请稍候…</div>
          ) : relationResults.length === 0 ? (
            <EmptyState variant="inline" title="未发现新关系" />
          ) : (
            relationResults.map((item, i) => (
              <div key={i} style={resultCard}>
                <div style={{ fontSize: 11, color: 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--accent)' }}>{item.sourceTitle}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>{item.relationType}</span>
                  <span style={{ color: 'var(--accent)' }}>{item.targetTitle}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  置信度: {Math.round(item.confidence * 100)}% | {item.evidence}（{item.sourceChapter}）
                </div>
                <button
                  onClick={() => handleApplyRelation(item)}
                  style={{ marginTop: 4, padding: '2px 8px', fontSize: 10, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderRadius: 3, cursor: 'pointer' }}
                >应用</button>
              </div>
            ))
          )}
        </div>
      )}

      {formEntry && (
        <WikiEntryForm
          entry={formEntry === 'new' ? null : formEntry}
          onClose={() => setFormEntry(null)}
        />
      )}
    </div>
  );
};
