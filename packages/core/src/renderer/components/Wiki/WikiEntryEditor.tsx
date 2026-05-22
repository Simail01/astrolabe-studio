import React from 'react';
import { useWikiStore } from '../../stores/wiki.store';

const container: React.CSSProperties = {
  padding: 16,
  color: '#ccc',
  height: '100%',
  overflow: 'auto',
};

const titleStyle: React.CSSProperties = {
  fontSize: 18,
  color: '#fff',
  marginBottom: 4,
};

const field: React.CSSProperties = {
  marginBottom: 12,
};

const fieldLabel: React.CSSProperties = {
  fontSize: 12,
  color: '#999',
  marginBottom: 4,
};

const relationItem: React.CSSProperties = {
  padding: '6px 8px',
  marginBottom: 4,
  backgroundColor: '#2d2d2d',
  borderRadius: 3,
  fontSize: 13,
};

const placeholder: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: '#666',
  fontSize: 14,
};

export const WikiEntryEditor: React.FC = () => {
  const { entries, selectedEntryId } = useWikiStore();
  const entry = entries.find((e) => e.id === selectedEntryId);

  if (!entry) {
    return <div style={placeholder}>选择一个条目查看详情</div>;
  }

  return (
    <div style={container}>
      <div style={titleStyle}>{entry.title}</div>
      {entry.aliases.length > 0 && (
        <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
          别名: {entry.aliases.join('、')}
        </div>
      )}

      <div style={field}>
        <div style={fieldLabel}>摘要</div>
        <div style={{ fontSize: 13 }}>{entry.summary || '暂无摘要'}</div>
      </div>

      <div style={field}>
        <div style={fieldLabel}>详细描述</div>
        <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{entry.content || '暂无详细描述'}</div>
      </div>

      {Object.keys(entry.attributes).length > 0 && (
        <div style={field}>
          <div style={fieldLabel}>属性</div>
          {Object.entries(entry.attributes).map(([key, val]) => (
            <div key={key} style={{ fontSize: 13, marginBottom: 2 }}>
              <span style={{ color: '#888' }}>{key}:</span>{' '}
              {Array.isArray(val) ? val.join('、') : val}
            </div>
          ))}
        </div>
      )}

      {entry.relations.length > 0 && (
        <div style={field}>
          <div style={fieldLabel}>关联条目</div>
          {entry.relations.map((r, i) => (
            <div key={i} style={relationItem}>
              <span style={{ color: '#4ec9b0' }}>{r.relationType}</span>
              {' → '}
              <span style={{ color: '#dcdcaa' }}>{r.targetId}</span>
              {r.description && <span style={{ color: '#888', marginLeft: 8 }}>{r.description}</span>}
            </div>
          ))}
        </div>
      )}

      {entry.sourceChapters.length > 0 && (
        <div style={field}>
          <div style={fieldLabel}>信息来源</div>
          <div style={{ fontSize: 12, color: '#888' }}>{entry.sourceChapters.join('、')}</div>
        </div>
      )}
    </div>
  );
};
