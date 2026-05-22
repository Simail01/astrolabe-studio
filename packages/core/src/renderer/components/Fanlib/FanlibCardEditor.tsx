import React from 'react';
import { useFanlibStore } from '../../stores/fanlib.store';
import type { CharacterCard } from '@astrolabe/shared';

const container: React.CSSProperties = { padding: 16, color: '#ccc', height: '100%', overflow: 'auto' };
const nameStyle: React.CSSProperties = { fontSize: 18, color: '#fff', marginBottom: 4 };
const field: React.CSSProperties = { marginBottom: 12 };
const fieldLabel: React.CSSProperties = { fontSize: 12, color: '#999', marginBottom: 4 };
const placeholder: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', fontSize: 14 };
const tag: React.CSSProperties = { display: 'inline-block', padding: '2px 6px', margin: '0 4px 4px 0', backgroundColor: '#3c3c3c', borderRadius: 3, fontSize: 11, color: '#ccc' };

export const FanlibCardEditor: React.FC = () => {
  const { cards, selectedCardId } = useFanlibStore();
  const card = cards.find((c) => c.id === selectedCardId);

  if (!card) return <div style={placeholder}>选择一张卡片查看详情</div>;

  const charCard = card.type === 'character' ? (card as CharacterCard) : null;

  return (
    <div style={container}>
      <div style={nameStyle}>{card.name}</div>

      {card.tags.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {card.tags.map((t) => <span key={t} style={tag}>{t}</span>)}
        </div>
      )}

      <div style={field}>
        <div style={fieldLabel}>来源</div>
        <div style={{ fontSize: 13 }}>{card.source.title || card.source.type}</div>
      </div>

      {charCard && (
        <>
          <div style={field}>
            <div style={fieldLabel}>外貌</div>
            <div style={{ fontSize: 13 }}>{charCard.appearance || '—'}</div>
          </div>
          <div style={field}>
            <div style={fieldLabel}>性格</div>
            <div style={{ fontSize: 13 }}>{charCard.personality || '—'}</div>
          </div>
          <div style={field}>
            <div style={fieldLabel}>能力</div>
            <div style={{ fontSize: 13 }}>{charCard.abilities.join('、') || '—'}</div>
          </div>
          <div style={field}>
            <div style={fieldLabel}>背景</div>
            <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{charCard.background || '—'}</div>
          </div>
        </>
      )}

      {card.type === 'worldview' && (
        <>
          <div style={field}><div style={fieldLabel}>规则</div><div style={{ fontSize: 13 }}>{(card as { rules: string[] }).rules.join('、') || '—'}</div></div>
        </>
      )}

      {card.type === 'item' && (
        <>
          <div style={field}><div style={fieldLabel}>分类</div><div style={{ fontSize: 13 }}>{(card as { category: string }).category || '—'}</div></div>
        </>
      )}
    </div>
  );
};
