import React from 'react';
import { useLayoutStore } from '../../stores/layout.store';
import { useWikiStore } from '../../stores/wiki.store';
import type { WikiEntry } from '@astrolabe/shared';

const panel: React.CSSProperties = {
  width: 280, minWidth: 200, backgroundColor: '#252526', borderLeft: '1px solid #3c3c3c',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
};
const header: React.CSSProperties = {
  padding: '8px 12px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#999',
  letterSpacing: 1, borderBottom: '1px solid #3c3c3c',
};
const searchBox: React.CSSProperties = {
  margin: 8, padding: '4px 8px', fontSize: 12, backgroundColor: '#3c3c3c', border: '1px solid #555',
  color: '#fff', borderRadius: 3, outline: 'none',
};
const list: React.CSSProperties = { flex: 1, overflow: 'auto' };
const listItem: React.CSSProperties = {
  padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#ccc', borderBottom: '1px solid #2d2d2d',
};
const listItemActive: React.CSSProperties = { ...listItem, backgroundColor: '#094771', color: '#fff' };
const detail: React.CSSProperties = { padding: 12, overflow: 'auto', flex: 1 };
const field: React.CSSProperties = { marginBottom: 10 };
const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#888', marginBottom: 2 };
const fieldValue: React.CSSProperties = { fontSize: 13, color: '#ccc', whiteSpace: 'pre-wrap' };
const placeholder: React.CSSProperties = { padding: 16, color: '#666', fontSize: 13, textAlign: 'center' };

const typeLabels: Record<string, string> = {
  person: '角色', location: '地点', faction: '势力', item: '物品', event: '事件', rule: '规则',
};

export const RightPanel: React.FC = () => {
  const visible = useLayoutStore((s) => s.rightPanelVisible);
  const { filteredEntries, selectedEntryId, searchQuery, setSearchQuery, selectEntry } = useWikiStore();
  const entries = useWikiStore((s) => s.entries);
  const entry = entries.find((e) => e.id === selectedEntryId);

  if (!visible) return null;

  return (
    <div style={panel}>
      <div style={header}>Wiki 知识库</div>
      <input
        style={searchBox}
        placeholder="搜索条目…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <div style={list}>
        {filteredEntries.map((e) => (
          <div
            key={e.id}
            style={e.id === selectedEntryId ? listItemActive : listItem}
            onClick={() => selectEntry(e.id)}
          >
            <span style={{ color: '#888', fontSize: 10, marginRight: 6 }}>[{typeLabels[e.type] ?? e.type}]</span>
            {e.title}
          </div>
        ))}
        {filteredEntries.length === 0 && (
          <div style={{ padding: 12, color: '#666', fontSize: 12 }}>
            {searchQuery ? '无匹配结果' : '暂无 Wiki 条目'}
          </div>
        )}
      </div>
      {entry && (
        <div style={{ ...detail, borderTop: '1px solid #3c3c3c' }}>
          <div style={{ fontSize: 15, color: '#fff', marginBottom: 8 }}>{entry.title}</div>
          {entry.summary && (
            <div style={field}>
              <div style={fieldLabel}>摘要</div>
              <div style={fieldValue}>{entry.summary}</div>
            </div>
          )}
          {entry.content && (
            <div style={field}>
              <div style={fieldLabel}>详情</div>
              <div style={fieldValue}>{entry.content}</div>
            </div>
          )}
          {entry.relations?.length > 0 && (
            <div style={field}>
              <div style={fieldLabel}>关联</div>
              {entry.relations.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: '#4ec9b0', marginBottom: 2 }}>
                  {r.relationType} → {r.targetId}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
