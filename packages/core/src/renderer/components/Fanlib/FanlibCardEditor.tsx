import React, { useState } from 'react';
import { useFanlibStore } from '../../stores/fanlib.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { bridge } from '../../services/bridge';
import type { CharacterCard, WorldviewCard, ItemCard, FactionCard } from '@astrolabe/shared';

const container: React.CSSProperties = { padding: 16, color: '#ccc', height: '100%', overflow: 'auto' };
const nameStyle: React.CSSProperties = { fontSize: 18, color: '#fff', marginBottom: 4 };
const field: React.CSSProperties = { marginBottom: 12 };
const fieldLabel: React.CSSProperties = { fontSize: 12, color: '#999', marginBottom: 4 };
const fieldValue: React.CSSProperties = { fontSize: 13 };
const placeholder: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', fontSize: 14 };
const tag: React.CSSProperties = { display: 'inline-block', padding: '2px 6px', margin: '0 4px 4px 0', backgroundColor: '#3c3c3c', borderRadius: 3, fontSize: 11, color: '#ccc' };
const editInput: React.CSSProperties = { width: '100%', padding: '3px 6px', fontSize: 13, backgroundColor: '#3c3c3c', border: '1px solid #555', color: '#fff', borderRadius: 3, outline: 'none' };

export const FanlibCardEditor: React.FC = () => {
  const { cards, selectedCardId, removeCard } = useFanlibStore();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const card = cards.find((c) => c.id === selectedCardId);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPersonality, setEditPersonality] = useState('');
  const [editAppearance, setEditAppearance] = useState('');
  const [editBackground, setEditBackground] = useState('');

  if (!card) return <div style={placeholder}>选择一张卡片查看详情</div>;

  const handleSave = async () => {
    if (!workspace) return;
    try {
      const updated = { ...card, name: editName || card.name, updatedAt: new Date().toISOString() } as any;
      if (card.type === 'character') {
        updated.personality = editPersonality || (card as CharacterCard).personality;
        updated.appearance = editAppearance || (card as CharacterCard).appearance;
        updated.background = editBackground || (card as CharacterCard).background;
      }
      await bridge.fanlibSave(workspace.path, updated);
      useFanlibStore.getState().addOrUpdateCard(updated);
      setEditing(false);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!confirm(`确定删除卡片「${card.name}」？`) || !workspace) return;
    try {
      await bridge.fanlibDelete(workspace.path, card.type, card.id);
      removeCard(card.id);
    } catch (e) { console.error(e); }
  };

  const startEdit = () => {
    setEditName(card.name);
    if (card.type === 'character') {
      setEditPersonality((card as CharacterCard).personality || '');
      setEditAppearance((card as CharacterCard).appearance || '');
      setEditBackground((card as CharacterCard).background || '');
    }
    setEditing(true);
  };

  if (editing) {
    return (
      <div style={container}>
        <div style={field}><div style={fieldLabel}>名称</div><input value={editName} onChange={e => setEditName(e.target.value)} style={editInput} /></div>
        {card.type === 'character' && (<>
          <div style={field}><div style={fieldLabel}>外貌</div><input value={editAppearance} onChange={e => setEditAppearance(e.target.value)} style={editInput} /></div>
          <div style={field}><div style={fieldLabel}>性格</div><input value={editPersonality} onChange={e => setEditPersonality(e.target.value)} style={editInput} /></div>
          <div style={field}><div style={fieldLabel}>背景</div><input value={editBackground} onChange={e => setEditBackground(e.target.value)} style={editInput} /></div>
        </>)}
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          <button onClick={handleSave} style={{ padding: '4px 12px', fontSize: 12, backgroundColor: '#007acc', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}>保存</button>
          <button onClick={() => setEditing(false)} style={{ padding: '4px 12px', fontSize: 12, backgroundColor: '#3c3c3c', color: '#ccc', border: 'none', borderRadius: 3, cursor: 'pointer' }}>取消</button>
        </div>
      </div>
    );
  }

  return (
    <div style={container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={nameStyle}>{card.name}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={startEdit} style={{ padding: '2px 8px', fontSize: 11, backgroundColor: '#3c3c3c', color: '#ccc', border: 'none', borderRadius: 3, cursor: 'pointer' }}>编辑</button>
          <button onClick={handleDelete} style={{ padding: '2px 8px', fontSize: 11, backgroundColor: '#5a1d1d', color: '#f44747', border: 'none', borderRadius: 3, cursor: 'pointer' }}>删除</button>
        </div>
      </div>

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
