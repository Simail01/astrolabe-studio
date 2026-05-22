import React from 'react';
import { useFanlibStore } from '../../stores/fanlib.store';
import type { CharacterCard, WorldviewCard, ItemCard, FactionCard } from '@astrolabe/shared';

const container: React.CSSProperties = { padding: 16, color: '#ccc', height: '100%', overflow: 'auto' };
const nameStyle: React.CSSProperties = { fontSize: 18, color: '#fff', marginBottom: 4 };
const field: React.CSSProperties = { marginBottom: 12 };
const fieldLabel: React.CSSProperties = { fontSize: 12, color: '#999', marginBottom: 4 };
const fieldValue: React.CSSProperties = { fontSize: 13 };
const placeholder: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', fontSize: 14 };
const tag: React.CSSProperties = { display: 'inline-block', padding: '2px 6px', margin: '0 4px 4px 0', backgroundColor: '#3c3c3c', borderRadius: 3, fontSize: 11, color: '#ccc' };

export const FanlibCardEditor: React.FC = () => {
  const { cards, selectedCardId } = useFanlibStore();
  const card = cards.find((c) => c.id === selectedCardId);

  if (!card) return <div style={placeholder}>选择一张卡片查看详情</div>;

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
        <div style={fieldValue}>{card.source.title || card.source.type}</div>
      </div>

      {card.type === 'character' && (
        <>
          <div style={field}><div style={fieldLabel}>外貌</div><div style={fieldValue}>{(card as CharacterCard).appearance || '—'}</div></div>
          <div style={field}><div style={fieldLabel}>性格</div><div style={fieldValue}>{(card as CharacterCard).personality || '—'}</div></div>
          <div style={field}><div style={fieldLabel}>能力</div><div style={fieldValue}>{(card as CharacterCard).abilities.join('、') || '—'}</div></div>
          <div style={field}><div style={fieldLabel}>背景</div><div style={{ ...fieldValue, whiteSpace: 'pre-wrap' }}>{(card as CharacterCard).background || '—'}</div></div>
        </>
      )}

      {card.type === 'worldview' && (
        <>
          <div style={field}><div style={fieldLabel}>力量体系</div><div style={fieldValue}>{(card as WorldviewCard).powerSystem || '—'}</div></div>
          <div style={field}><div style={fieldLabel}>规则</div><div style={fieldValue}>{(card as WorldviewCard).rules.join('、') || '—'}</div></div>
          <div style={field}><div style={fieldLabel}>历史</div><div style={{ ...fieldValue, whiteSpace: 'pre-wrap' }}>{(card as WorldviewCard).history || '—'}</div></div>
          <div style={field}><div style={fieldLabel}>地理</div><div style={fieldValue}>{(card as WorldviewCard).geography || '—'}</div></div>
        </>
      )}

      {card.type === 'item' && (
        <>
          <div style={field}><div style={fieldLabel}>分类</div><div style={fieldValue}>{(card as ItemCard).category || '—'}</div></div>
          <div style={field}><div style={fieldLabel}>外观</div><div style={fieldValue}>{(card as ItemCard).appearance || '—'}</div></div>
          <div style={field}><div style={fieldLabel}>能力</div><div style={fieldValue}>{(card as ItemCard).abilities.join('、') || '—'}</div></div>
          <div style={field}><div style={fieldLabel}>来源</div><div style={fieldValue}>{(card as ItemCard).origin || '—'}</div></div>
          <div style={field}><div style={fieldLabel}>限制</div><div style={fieldValue}>{(card as ItemCard).limitations || '—'}</div></div>
        </>
      )}

      {card.type === 'faction' && (
        <>
          <div style={field}><div style={fieldLabel}>首领</div><div style={fieldValue}>{(card as FactionCard).leader || '—'}</div></div>
          <div style={field}><div style={fieldLabel}>成员</div><div style={fieldValue}>{(card as FactionCard).members.join('、') || '—'}</div></div>
          <div style={field}><div style={fieldLabel}>目标</div><div style={fieldValue}>{(card as FactionCard).goal || '—'}</div></div>
          <div style={field}><div style={fieldLabel}>势力范围</div><div style={fieldValue}>{(card as FactionCard).territory || '—'}</div></div>
          <div style={field}><div style={fieldLabel}>历史</div><div style={{ ...fieldValue, whiteSpace: 'pre-wrap' }}>{(card as FactionCard).history || '—'}</div></div>
        </>
      )}
    </div>
  );
};
