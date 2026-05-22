import React from 'react';
import { useLayoutStore } from '../../stores/layout.store';
import { useWikiStore } from '../../stores/wiki.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { bridge } from '../../services/bridge';
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
const suggBar: React.CSSProperties = {
  padding: '8px 12px', backgroundColor: '#094771', borderBottom: '1px solid #3c3c3c',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const suggItem: React.CSSProperties = {
  padding: '8px 12px', borderBottom: '1px solid #2d2d2d', fontSize: 13,
};
const suggTitle: React.CSSProperties = { color: '#fff', marginBottom: 4 };
const suggEvidence: React.CSSProperties = { color: '#888', fontSize: 11, marginBottom: 4, fontStyle: 'italic' };
const suggConfidence: React.CSSProperties = { fontSize: 11, marginBottom: 6 };
const suggBtns: React.CSSProperties = { display: 'flex', gap: 4 };
const smallBtn: React.CSSProperties = {
  padding: '2px 8px', fontSize: 11, borderRadius: 3, cursor: 'pointer', border: 'none',
};
const btnConfirm: React.CSSProperties = { ...smallBtn, backgroundColor: '#1d5a1d', color: '#4ec9b0' };
const btnReject: React.CSSProperties = { ...smallBtn, backgroundColor: '#3c3c3c', color: '#ccc' };

const typeLabels: Record<string, string> = {
  person: '角色', location: '地点', faction: '势力', item: '物品', event: '事件', rule: '规则',
};

export const RightPanel: React.FC = () => {
  const visible = useLayoutStore((s) => s.rightPanelVisible);
  const wiki = useWikiStore();
  const getProjectPath = useWorkspaceStore((s) => s.getProjectPath);

  const handleConfirm = async (index: number) => {
    const s = wiki.suggestions[index];
    if (!s || s.status !== 'pending') return;
    const projectPath = getProjectPath();
    if (!projectPath) return;

    const entry: WikiEntry = {
      id: `wiki-${Date.now()}-${index}`,
      type: s.type,
      title: s.title,
      aliases: [],
      summary: s.summary || '',
      content: s.content || '',
      attributes: s.attributes || {},
      relations: [],
      sourceChapters: [],
      confidence: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmedByUser: true,
    };
    try {
      await bridge.wikiSave(projectPath, entry);
      wiki.confirmSuggestion(index);
      wiki.addOrUpdateEntry(entry);
    } catch (e) {
      console.error('Wiki save failed:', e);
    }
  };
  const {
    filteredEntries, selectedEntryId, searchQuery, setSearchQuery, selectEntry,
    suggestions, confirmSuggestion, rejectSuggestion, clearSuggestions,
  } = wiki;
  const entry = wiki.entries.find((e) => e.id === selectedEntryId);
  const pendingCount = suggestions.filter(s => s.status === 'pending').length;
  const [showSuggestions, setShowSuggestions] = React.useState(true);

  if (!visible) return null;

  // Show suggestion queue when there are pending items
  if (pendingCount > 0 && showSuggestions) {
    return (
      <div style={panel}>
        <div style={{
          ...header,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>Wiki 建议</span>
          <button onClick={clearSuggestions} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
        <div style={suggBar} onClick={() => setShowSuggestions(!showSuggestions)}>
          <span style={{ color: '#fff', fontSize: 13 }}>🆕 发现 {pendingCount} 条新设定</span>
          <span style={{ color: '#888', fontSize: 11 }}>{showSuggestions ? '收起' : '展开'}</span>
        </div>
        {suggestions.map((s, i) => {
          if (s.status !== 'pending') return null;
          return (
            <div key={s.id} style={suggItem}>
              <div style={suggTitle}>
                <span style={{ color: '#888', fontSize: 10, marginRight: 6 }}>[{typeLabels[s.type] ?? s.type}]</span>
                {s.title}
              </div>
              {s.evidence && <div style={suggEvidence}>"{s.evidence}"</div>}
              <div style={{
                ...suggConfidence,
                color: s.confidence >= 0.8 ? '#4ec9b0' : s.confidence >= 0.6 ? '#dcdcaa' : '#d4a72c',
              }}>
                置信度: {Math.round(s.confidence * 100)}%
              </div>
              <div style={suggBtns}>
                <button style={btnConfirm} onClick={() => handleConfirm(i)}>确认</button>
                <button style={btnReject} onClick={() => rejectSuggestion(i)}>拒绝</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Normal Wiki view
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
