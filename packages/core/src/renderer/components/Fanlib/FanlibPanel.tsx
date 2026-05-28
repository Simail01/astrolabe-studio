import React from 'react';
import { useFanlibStore } from '../../stores/fanlib.store';
import { CreateCardDialog } from './CreateCardDialog';

const panel: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--editor-bg)',
};
const typeBar: React.CSSProperties = {
  display: 'flex', borderBottom: '1px solid var(--border-default)',
};
const typeTab: React.CSSProperties = {
  padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)', borderRight: '1px solid var(--border-default)',
};
const typeTabActive: React.CSSProperties = { ...typeTab, color: 'var(--text-inverse)', backgroundColor: 'var(--editor-panel)' };
const searchInput: React.CSSProperties = {
  width: '100%', padding: '4px 8px', fontSize: 13, backgroundColor: 'var(--bg-hover)', border: 'none', borderBottom: '1px solid var(--border-input)', color: 'var(--text-inverse)', outline: 'none',
};
const list: React.CSSProperties = { flex: 1, overflow: 'auto' };
const listItem: React.CSSProperties = {
  padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--bg-panel)', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const listItemActive: React.CSSProperties = { ...listItem, backgroundColor: 'var(--accent-blue-dim)', color: 'var(--text-inverse)' };
const importBtn: React.CSSProperties = {
  padding: '2px 8px', fontSize: 11, backgroundColor: 'var(--accent-blue)', color: 'var(--text-inverse)', border: 'none', borderRadius: 3, cursor: 'pointer',
};

const typeLabels: Record<string, string> = { character: '人物', worldview: '世界观', item: '物品', faction: '势力' };
const types = ['character', 'worldview', 'item', 'faction'] as const;

export const FanlibPanel: React.FC = () => {
  const { filteredCards, selectedCardId, searchQuery, setSearchQuery, selectCard, openImportDialog, openCreateCardDialog, createCardDialogOpen, closeCreateCardDialog } = useFanlibStore();
  const [activeType, setActiveType] = React.useState<string | null>(null);

  const displayCards = activeType ? filteredCards.filter((c) => c.type === activeType) : filteredCards;

  return (
    <div style={panel}>
      <div style={{ ...typeBar, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex' }}>
          <div style={activeType === null ? typeTabActive : typeTab} onClick={() => setActiveType(null)}>全部</div>
          {types.map((t) => (
            <div key={t} style={activeType === t ? typeTabActive : typeTab} onClick={() => setActiveType(t)}>{typeLabels[t]}</div>
          ))}
        </div>
        <div style={{ ...typeTab, borderRight: 'none', fontWeight: 600 }} onClick={openCreateCardDialog} title="新建卡片">+</div>
      </div>
      <input style={searchInput} placeholder="搜索卡片…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      <div style={list}>
        {displayCards.map((card) => (
          <div key={card.id} style={card.id === selectedCardId ? listItemActive : listItem} onClick={() => selectCard(card.id)}>
            <div>
              <span style={{ marginRight: 6, color: 'var(--text-tertiary)', fontSize: 11 }}>[{typeLabels[card.type] ?? card.type}]</span>
              {card.name}
            </div>
            <button style={importBtn} onClick={(e) => { e.stopPropagation(); openImportDialog(card.id); }}>引入</button>
          </div>
        ))}
      </div>
      {createCardDialogOpen && <CreateCardDialog onClose={closeCreateCardDialog} />}
    </div>
  );
};
