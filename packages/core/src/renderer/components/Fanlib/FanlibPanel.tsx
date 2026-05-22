import React from 'react';
import { useFanlibStore } from '../../stores/fanlib.store';

const panel: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#1e1e1e',
};
const typeBar: React.CSSProperties = {
  display: 'flex', borderBottom: '1px solid #3c3c3c',
};
const typeTab: React.CSSProperties = {
  padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: '#999', borderRight: '1px solid #3c3c3c',
};
const typeTabActive: React.CSSProperties = { ...typeTab, color: '#fff', backgroundColor: '#252526' };
const searchInput: React.CSSProperties = {
  width: '100%', padding: '4px 8px', fontSize: 13, backgroundColor: '#3c3c3c', border: 'none', borderBottom: '1px solid #555', color: '#fff', outline: 'none',
};
const list: React.CSSProperties = { flex: 1, overflow: 'auto' };
const listItem: React.CSSProperties = {
  padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #2d2d2d', color: '#ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const listItemActive: React.CSSProperties = { ...listItem, backgroundColor: '#094771', color: '#fff' };
const importBtn: React.CSSProperties = {
  padding: '2px 8px', fontSize: 11, backgroundColor: '#007acc', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer',
};

const typeLabels: Record<string, string> = { character: '人物', worldview: '世界观', item: '物品', event: '事件' };
const types = ['character', 'worldview', 'item', 'event'] as const;

export const FanlibPanel: React.FC = () => {
  const { filteredCards, selectedCardId, searchQuery, setSearchQuery, selectCard, openImportDialog } = useFanlibStore();
  const [activeType, setActiveType] = React.useState<string | null>(null);

  const displayCards = activeType ? filteredCards.filter((c) => c.type === activeType) : filteredCards;

  return (
    <div style={panel}>
      <div style={typeBar}>
        <div style={activeType === null ? typeTabActive : typeTab} onClick={() => setActiveType(null)}>全部</div>
        {types.map((t) => (
          <div key={t} style={activeType === t ? typeTabActive : typeTab} onClick={() => setActiveType(t)}>{typeLabels[t]}</div>
        ))}
      </div>
      <input style={searchInput} placeholder="搜索卡片…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      <div style={list}>
        {displayCards.map((card) => (
          <div key={card.id} style={card.id === selectedCardId ? listItemActive : listItem} onClick={() => selectCard(card.id)}>
            <div>
              <span style={{ marginRight: 6, color: '#888', fontSize: 11 }}>[{typeLabels[card.type] ?? card.type}]</span>
              {card.name}
            </div>
            <button style={importBtn} onClick={(e) => { e.stopPropagation(); openImportDialog(card.id); }}>引入</button>
          </div>
        ))}
      </div>
    </div>
  );
};
