import React from 'react';
import { useWikiStore } from '../../stores/wiki.store';

const panel: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: '#1e1e1e',
};

const header: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #3c3c3c',
};

const searchInput: React.CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  fontSize: 13,
  backgroundColor: '#3c3c3c',
  border: '1px solid #555',
  color: '#fff',
  borderRadius: 3,
  outline: 'none',
};

const list: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
};

const listItem: React.CSSProperties = {
  padding: '8px 12px',
  cursor: 'pointer',
  fontSize: 13,
  borderBottom: '1px solid #2d2d2d',
  color: '#ccc',
};

const listItemActive: React.CSSProperties = {
  ...listItem,
  backgroundColor: '#094771',
  color: '#fff',
};

const typeLabels: Record<string, string> = {
  person: '角色', location: '地点', faction: '势力',
  item: '物品', event: '事件', rule: '规则',
};

export const WikiPanel: React.FC = () => {
  const { filteredEntries, selectedEntryId, searchQuery, setSearchQuery, selectEntry } =
    useWikiStore();

  return (
    <div style={panel}>
      <div style={header}>
        <input
          style={searchInput}
          placeholder="搜索 Wiki 条目…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div style={list}>
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            style={entry.id === selectedEntryId ? listItemActive : listItem}
            onClick={() => selectEntry(entry.id)}
          >
            <span style={{ marginRight: 8, color: '#888', fontSize: 11 }}>
              [{typeLabels[entry.type] ?? entry.type}]
            </span>
            {entry.title}
            {!entry.confirmedByUser && (
              <span style={{ color: '#d4a72c', marginLeft: 6, fontSize: 11 }}>待确认</span>
            )}
          </div>
        ))}
        {filteredEntries.length === 0 && (
          <div style={{ padding: 16, color: '#666', fontSize: 13, textAlign: 'center' }}>
            暂无条目
          </div>
        )}
      </div>
    </div>
  );
};
