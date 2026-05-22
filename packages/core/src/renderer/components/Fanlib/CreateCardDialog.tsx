import React, { useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useFanlibStore } from '../../stores/fanlib.store';
import { bridge } from '../../services/bridge';
import type { CharacterCard } from '@astrolabe/shared';

const overlay: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200,
};
const dialog: React.CSSProperties = {
  backgroundColor: '#252526', borderRadius: 8, padding: 24, width: 420, color: '#ccc', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};
const title: React.CSSProperties = { fontSize: 18, color: '#fff', marginBottom: 16 };
const field: React.CSSProperties = { marginBottom: 12 };
const label: React.CSSProperties = { display: 'block', fontSize: 13, color: '#999', marginBottom: 4 };
const input: React.CSSProperties = {
  width: '100%', padding: '6px 10px', fontSize: 14, backgroundColor: '#3c3c3c', border: '1px solid #555', color: '#fff', borderRadius: 4, outline: 'none',
};
const textarea: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 60, fontFamily: 'inherit' };
const btnRow: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 };
const btn: React.CSSProperties = { padding: '8px 20px', fontSize: 13, borderRadius: 4, cursor: 'pointer', border: 'none' };
const btnPrimary: React.CSSProperties = { ...btn, backgroundColor: '#007acc', color: '#fff' };
const btnSecondary: React.CSSProperties = { ...btn, backgroundColor: '#3c3c3c', color: '#ccc' };

const sourceTypes = [
  { value: 'original', label: '原创' },
  { value: 'anime', label: '动漫' },
  { value: 'movie', label: '电影' },
  { value: 'novel', label: '小说' },
  { value: 'comic', label: '漫画' },
  { value: 'game', label: '游戏' },
  { value: 'real_person', label: '现实人物' },
  { value: 'real_world', label: '现实世界' },
];

interface Props {
  onClose: () => void;
}

export const CreateCardDialog: React.FC<Props> = ({ onClose }) => {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState('original');
  const [sourceTitle, setSourceTitle] = useState('');
  const [personality, setPersonality] = useState('');
  const [appearance, setAppearance] = useState('');
  const [background, setBackground] = useState('');
  const [abilities, setAbilities] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !workspace) return;
    setCreating(true);
    try {
      const card: CharacterCard = {
        id: `fc-${Date.now()}`,
        type: 'character',
        name: name.trim(),
        aliases: [],
        tags: [],
        source: { type: sourceType as any, title: sourceTitle },
        appearance,
        personality,
        abilities: abilities.split(',').map(s => s.trim()).filter(Boolean),
        background,
        relationships: [],
        designImages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await bridge.fanlibSave(workspace.path, card);
      useFanlibStore.getState().addOrUpdateCard(card);
      onClose();
    } catch (e) {
      console.error('Card creation failed:', e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={e => e.stopPropagation()}>
        <div style={title}>新建人物卡片</div>
        <div style={field}>
          <label style={label}>名称 *</label>
          <input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="角色名称" autoFocus />
        </div>
        <div style={field}>
          <label style={label}>来源类型</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {sourceTypes.map(st => (
              <button key={st.value} onClick={() => setSourceType(st.value)} style={{
                padding: '3px 10px', fontSize: 12, borderRadius: 12, cursor: 'pointer', border: '1px solid #555',
                backgroundColor: sourceType === st.value ? '#007acc' : 'transparent',
                color: sourceType === st.value ? '#fff' : '#999',
              }}>{st.label}</button>
            ))}
          </div>
        </div>
        <div style={field}>
          <label style={label}>来源作品</label>
          <input style={input} value={sourceTitle} onChange={e => setSourceTitle(e.target.value)} placeholder="如：三国演义" />
        </div>
        <div style={field}>
          <label style={label}>外貌</label>
          <input style={input} value={appearance} onChange={e => setAppearance(e.target.value)} placeholder="外貌描述" />
        </div>
        <div style={field}>
          <label style={label}>性格</label>
          <input style={input} value={personality} onChange={e => setPersonality(e.target.value)} placeholder="性格特征" />
        </div>
        <div style={field}>
          <label style={label}>能力（逗号分隔）</label>
          <input style={input} value={abilities} onChange={e => setAbilities(e.target.value)} placeholder="飞行, 超强力量" />
        </div>
        <div style={field}>
          <label style={label}>背景</label>
          <textarea style={textarea} value={background} onChange={e => setBackground(e.target.value)} placeholder="角色背景故事" />
        </div>
        <div style={btnRow}>
          <button style={btnSecondary} onClick={onClose}>取消</button>
          <button style={btnPrimary} onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? '创建中...' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
};
