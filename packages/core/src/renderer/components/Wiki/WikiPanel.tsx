import React, { useState } from 'react';
import { useWikiStore } from '../../stores/wiki.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import type { WikiEntryType } from '@astrolabe/shared';

const typeLabels: Record<WikiEntryType, string> = {
  person: '人物', location: '地点', faction: '势力', item: '物品', event: '事件', rule: '规则',
};
const types: WikiEntryType[] = ['person', 'location', 'faction', 'item', 'event', 'rule'];

export const WikiPanel: React.FC = () => {
  const { filteredEntries, selectedEntryId, searchQuery, setSearchQuery, selectEntry } = useWikiStore();
  const activeProject = useWorkspaceStore((s) => s.activeProject);
  const [activeType, setActiveType] = useState<WikiEntryType | null>(null);

  const displayEntries = activeType ? filteredEntries.filter((e) => e.type === activeType) : filteredEntries;
  const selectedEntry = filteredEntries.find((e) => e.id === selectedEntryId) || null;

  if (!activeProject) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: 'var(--bg-panel)', color: 'var(--text-muted)', gap: 8 }}>
        <div style={{ fontSize: 32, opacity: 0.3 }}>📚</div>
        <div style={{ fontSize: 13 }}>请先在左侧选择一个作品</div>
      </div>
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
      </div>
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="搜索 Wiki 条目…"
        style={{ width: '100%', padding: '4px 8px', fontSize: 13, backgroundColor: 'var(--bg-input)', border: 'none', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
      />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {displayEntries.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>暂无 Wiki 条目</div>
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
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{selectedEntry.title}</div>
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
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>关联</div>
              {selectedEntry.relations.map((r, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
                  {r.relationType}: {r.description}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
