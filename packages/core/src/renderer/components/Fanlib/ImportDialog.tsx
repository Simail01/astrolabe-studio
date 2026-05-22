import React, { useState } from 'react';
import { useFanlibStore } from '../../stores/fanlib.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { bridge } from '../../services/bridge';

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
  const getProjectPath = useWorkspaceStore((s) => s.getProjectPath);
  const [importing, setImporting] = useState(false);
  const card = cards.find((c) => c.id === importCardId);

  if (!importDialogOpen || !card) return null;

  const handleImport = async () => {
    const projectPath = getProjectPath();
    if (!projectPath || !card) return;
    setImporting(true);
    try {
      await bridge.wikiSave(projectPath, {
        id: `wiki-char-${Date.now()}`,
        type: 'person',
        title: card.name,
        aliases: card.aliases || [],
        summary: (card as any).personality || '',
        content: (card as any).background || '',
        attributes: card.type === 'character' ? {
          外貌: (card as any).appearance || '',
          性格: (card as any).personality || '',
          能力: ((card as any).abilities || []).join('、'),
          来源: card.source?.title || '',
        } : {},
        relations: [],
        sourceChapters: [],
        confidence: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        confirmedByUser: true,
      });
      closeImportDialog();
    } catch (e) {
      console.error('Import failed:', e);
    } finally {
      setImporting(false);
    }
  };

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
          <button style={btnPrimary} onClick={handleImport} disabled={importing}>{importing ? '引入中...' : '引入'}</button>
        </div>
      </div>
    </div>
  );
};
