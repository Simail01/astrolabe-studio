import React from 'react';
import { useFanlibStore } from '../../stores/fanlib.store';

const overlay: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
};
const dialog: React.CSSProperties = {
  width: 420, backgroundColor: '#252526', borderRadius: 6, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', color: '#ccc',
};
const title: React.CSSProperties = { fontSize: 16, color: '#fff', marginBottom: 16 };
const btn: React.CSSProperties = { padding: '6px 16px', fontSize: 13, border: 'none', borderRadius: 4, cursor: 'pointer', marginRight: 8 };
const btnPrimary: React.CSSProperties = { ...btn, backgroundColor: '#007acc', color: '#fff' };
const btnSecondary: React.CSSProperties = { ...btn, backgroundColor: '#3c3c3c', color: '#ccc' };

export const ImportDialog: React.FC = () => {
  const { importDialogOpen, importCardId, cards, closeImportDialog } = useFanlibStore();
  const card = cards.find((c) => c.id === importCardId);

  if (!importDialogOpen || !card) return null;

  return (
    <div style={overlay} onClick={closeImportDialog}>
      <div style={dialog} onClick={(e) => e.stopPropagation()}>
        <div style={title}>引入人物：{card.name}</div>
        <div style={{ fontSize: 13, marginBottom: 16, color: '#999' }}>
          此操作将基于同人库卡片 {card.name} 在当前作品中创建角色副本。
          修改不会影响原卡片（平行宇宙模式）。
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button style={btnSecondary} onClick={closeImportDialog}>取消</button>
          <button style={btnPrimary} onClick={closeImportDialog}>引入</button>
        </div>
      </div>
    </div>
  );
};
