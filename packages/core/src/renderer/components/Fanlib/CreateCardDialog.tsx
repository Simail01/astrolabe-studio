import React, { useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useFanlibStore } from '../../stores/fanlib.store';
import { bridge } from '../../services/bridge';
import type { FanlibCardType, FanlibCard } from '@astrolabe/shared';

const overlay: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200,
};
const dialog: React.CSSProperties = {
  backgroundColor: 'var(--editor-panel)', borderRadius: 8, padding: 24, width: 440, maxHeight: '80vh', overflow: 'auto', color: 'var(--text-primary)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};
const title: React.CSSProperties = { fontSize: 18, color: 'var(--text-inverse)', marginBottom: 16 };
const typeBar: React.CSSProperties = { display: 'flex', marginBottom: 16, borderBottom: '1px solid var(--bg-control)' };
const typeTab: React.CSSProperties = { padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)', borderBottom: '2px solid transparent' };
const typeTabActive: React.CSSProperties = { ...typeTab, color: 'var(--text-inverse)', borderBottomColor: 'var(--accent-blue)' };
const field: React.CSSProperties = { marginBottom: 12 };
const label: React.CSSProperties = { display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 };
const input: React.CSSProperties = { width: '100%', padding: '6px 10px', fontSize: 14, backgroundColor: 'var(--bg-control)', border: '1px solid var(--border-input)', color: 'var(--text-inverse)', borderRadius: 4, outline: 'none' };
const textarea: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 50, fontFamily: 'inherit' };
const btnRow: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 };
const btn: React.CSSProperties = { padding: '8px 20px', fontSize: 13, borderRadius: 4, cursor: 'pointer', border: 'none' };
const btnPrimary: React.CSSProperties = { ...btn, backgroundColor: 'var(--accent-blue)', color: 'var(--text-inverse)' };
const btnSecondary: React.CSSProperties = { ...btn, backgroundColor: 'var(--bg-control)', color: 'var(--text-primary)' };

const cardTypes: { key: FanlibCardType; label: string }[] = [
  { key: 'character', label: '人物' },
  { key: 'worldview', label: '世界观' },
  { key: 'item', label: '物品' },
  { key: 'faction', label: '势力' },
];

const sourceTypes = [
  { value: 'original', label: '原创' }, { value: 'anime', label: '动漫' },
  { value: 'movie', label: '电影' }, { value: 'novel', label: '小说' },
  { value: 'comic', label: '漫画' }, { value: 'game', label: '游戏' },
  { value: 'real_person', label: '现实人物' }, { value: 'real_world', label: '现实世界' },
];

interface Props { onClose: () => void; }

export const CreateCardDialog: React.FC<Props> = ({ onClose }) => {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const [cardType, setCardType] = useState<FanlibCardType>('character');
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState('original');
  const [sourceTitle, setSourceTitle] = useState('');
  // Character
  const [personality, setPersonality] = useState('');
  const [appearance, setAppearance] = useState('');
  const [background, setBackground] = useState('');
  const [abilities, setAbilities] = useState('');
  // Worldview
  const [powerSystem, setPowerSystem] = useState('');
  const [rules, setRules] = useState('');
  const [history, setHistory] = useState('');
  const [geography, setGeography] = useState('');
  // Item
  const [category, setCategory] = useState('');
  const [itemAppearance, setItemAppearance] = useState('');
  const [itemAbilities, setItemAbilities] = useState('');
  const [origin, setOrigin] = useState('');
  const [limitations, setLimitations] = useState('');
  // Faction
  const [leader, setLeader] = useState('');
  const [members, setMembers] = useState('');
  const [goal, setGoal] = useState('');
  const [territory, setTerritory] = useState('');
  const [factionHistory, setFactionHistory] = useState('');
  const [creating, setCreating] = useState(false);

  const buildCard = (): FanlibCard => {
    const base = {
      id: `fc-${Date.now()}`,
      name: name.trim(),
      aliases: [] as string[],
      tags: [] as string[],
      source: { type: sourceType, title: sourceTitle } as FanlibCard['source'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as FanlibCard;

    switch (cardType) {
      case 'character':
        return { ...base, type: 'character', appearance, personality, abilities: split(abilities), background, relationships: [], designImages: [] } as FanlibCard;
      case 'worldview':
        return { ...base, type: 'worldview', powerSystem, rules: split(rules), history, geography, factions: [] } as FanlibCard;
      case 'item':
        return { ...base, type: 'item', category, appearance: itemAppearance, abilities: split(itemAbilities), origin, limitations } as FanlibCard;
      case 'faction':
        return { ...base, type: 'faction', leader, members: split(members), goal, territory, history: factionHistory } as FanlibCard;
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !workspace) return;
    setCreating(true);
    try {
      const card = buildCard();
      await bridge.fanlibSave(workspace.path, card as unknown as Record<string, unknown>);
      (useFanlibStore.getState() as any).addOrUpdateCard(card);
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
        <div style={title}>新建卡片</div>
        <div style={typeBar}>
          {cardTypes.map(ct => (
            <div key={ct.key} style={cardType === ct.key ? typeTabActive : typeTab} onClick={() => setCardType(ct.key)}>
              {ct.label}
            </div>
          ))}
        </div>
        <div style={field}><label style={label}>名称 *</label><input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="卡片名称" autoFocus /></div>
        <div style={field}>
          <label style={label}>来源类型</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {sourceTypes.map(st => (
              <button key={st.value} onClick={() => setSourceType(st.value)} style={{
                padding: '3px 10px', fontSize: 12, borderRadius: 12, cursor: 'pointer', border: '1px solid var(--border-input)',
                backgroundColor: sourceType === st.value ? 'var(--accent-blue)' : 'transparent', color: sourceType === st.value ? 'var(--text-inverse)' : 'var(--text-secondary)',
              }}>{st.label}</button>
            ))}
          </div>
        </div>
        <div style={field}><label style={label}>来源作品</label><input style={input} value={sourceTitle} onChange={e => setSourceTitle(e.target.value)} placeholder="如：三国演义" /></div>

        {cardType === 'character' && (<>
          <div style={field}><label style={label}>外貌</label><input style={input} value={appearance} onChange={e => setAppearance(e.target.value)} placeholder="外貌描述" /></div>
          <div style={field}><label style={label}>性格</label><input style={input} value={personality} onChange={e => setPersonality(e.target.value)} placeholder="性格特征" /></div>
          <div style={field}><label style={label}>能力（逗号分隔）</label><input style={input} value={abilities} onChange={e => setAbilities(e.target.value)} placeholder="飞行, 超强力量" /></div>
          <div style={field}><label style={label}>背景</label><textarea style={textarea} value={background} onChange={e => setBackground(e.target.value)} placeholder="角色背景故事" /></div>
        </>)}

        {cardType === 'worldview' && (<>
          <div style={field}><label style={label}>力量体系</label><input style={input} value={powerSystem} onChange={e => setPowerSystem(e.target.value)} placeholder="如：修真/魔法/科技" /></div>
          <div style={field}><label style={label}>规则（逗号分隔）</label><input style={input} value={rules} onChange={e => setRules(e.target.value)} placeholder="规则1, 规则2" /></div>
          <div style={field}><label style={label}>历史</label><textarea style={textarea} value={history} onChange={e => setHistory(e.target.value)} placeholder="世界观历史背景" /></div>
          <div style={field}><label style={label}>地理</label><input style={input} value={geography} onChange={e => setGeography(e.target.value)} placeholder="地理版图描述" /></div>
        </>)}

        {cardType === 'item' && (<>
          <div style={field}><label style={label}>分类</label><input style={input} value={category} onChange={e => setCategory(e.target.value)} placeholder="武器/法宝/载具/…" /></div>
          <div style={field}><label style={label}>外观</label><input style={input} value={itemAppearance} onChange={e => setItemAppearance(e.target.value)} placeholder="外观描述" /></div>
          <div style={field}><label style={label}>能力（逗号分隔）</label><input style={input} value={itemAbilities} onChange={e => setItemAbilities(e.target.value)} placeholder="能力1, 能力2" /></div>
          <div style={field}><label style={label}>来源</label><input style={input} value={origin} onChange={e => setOrigin(e.target.value)} placeholder="制造者/出处" /></div>
          <div style={field}><label style={label}>限制</label><input style={input} value={limitations} onChange={e => setLimitations(e.target.value)} placeholder="使用限制或代价" /></div>
        </>)}

        {cardType === 'faction' && (<>
          <div style={field}><label style={label}>首领</label><input style={input} value={leader} onChange={e => setLeader(e.target.value)} placeholder="势力首领" /></div>
          <div style={field}><label style={label}>成员（逗号分隔）</label><input style={input} value={members} onChange={e => setMembers(e.target.value)} placeholder="成员1, 成员2" /></div>
          <div style={field}><label style={label}>目标</label><input style={input} value={goal} onChange={e => setGoal(e.target.value)} placeholder="势力宗旨/目标" /></div>
          <div style={field}><label style={label}>势力范围</label><input style={input} value={territory} onChange={e => setTerritory(e.target.value)} placeholder="控制区域" /></div>
          <div style={field}><label style={label}>历史</label><textarea style={textarea} value={factionHistory} onChange={e => setFactionHistory(e.target.value)} placeholder="势力历史" /></div>
        </>)}

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

function split(s: string): string[] {
  return s.split(',').map(x => x.trim()).filter(Boolean);
}
