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
  const [genPrompt, setGenPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  if (!card) return <div style={placeholder}>选择一张卡片查看详情</div>;

  const handleGenerateImage = async () => {
    if (!workspace) return;
    setGenerating(true);
    setGenError('');
    try {
      const model = await bridge.getAIKey('volcengine-image-model') || 'doubao-seedream-5-0-260128';
      const basePrompt = card.type === 'character'
        ? `角色设定图，全身像，正面站立，白色背景，高细节，动漫风格。名称：${card.name}。外貌：${(card as CharacterCard).appearance || ''}。性格：${(card as CharacterCard).personality || ''}。服饰特征：${(card as CharacterCard).background || ''}`
        : `设定图，${card.name}`;
      const prompt = genPrompt || basePrompt;
      const urls = await bridge.generateImage({ model, prompt, size: '2K' }) as string[];
      if (urls.length > 0) {
        const updated = { ...card, designImages: [...((card as any).designImages || []), ...urls], updatedAt: new Date().toISOString() };
        await bridge.fanlibSave(workspace.path, updated as any);
        useFanlibStore.getState().addOrUpdateCard(updated as any);
        setGenPrompt('');
      }
    } catch (e) {
      setGenError((e as Error).message || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

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

      {/* Design Images Section */}
      <div style={{ ...field, borderTop: '1px solid #3c3c3c', paddingTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={fieldLabel}>设定图</div>
        </div>
        {(card as any).designImages?.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(card as any).designImages.map((url: string, i: number) => (
              <img key={i} src={url} alt={`${card.name} 设定图 ${i + 1}`}
                style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4, border: '1px solid #444' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ))}
          </div>
        ) : (
          <div style={{ color: '#666', fontSize: 12 }}>暂无设定图</div>
        )}
        <div style={{ marginTop: 8 }}>
          <input
            value={genPrompt}
            onChange={e => setGenPrompt(e.target.value)}
            placeholder="自定义 prompt（可选，留空则自动生成）"
            style={{ ...editInput, marginBottom: 6 }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={handleGenerateImage}
              disabled={generating}
              style={{ padding: '4px 12px', fontSize: 12, backgroundColor: generating ? '#3c3c3c' : '#5a3e00', color: generating ? '#888' : '#dcdcaa', border: 'none', borderRadius: 3, cursor: generating ? 'not-allowed' : 'pointer' }}
            >
              {generating ? '生成中...' : 'AI 生成设定图'}
            </button>
            {genError && <span style={{ color: '#f44747', fontSize: 12 }}>{genError}</span>}
          </div>
          <div style={{ color: '#666', fontSize: 10, marginTop: 4 }}>需在设置中配置火山方舟 API Key 和图像模型接入点</div>
        </div>
      </div>
    </div>
  );
};
