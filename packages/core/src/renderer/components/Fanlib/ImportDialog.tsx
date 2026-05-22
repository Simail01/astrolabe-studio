import React, { useState } from 'react';
import { useFanlibStore } from '../../stores/fanlib.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { bridge } from '../../services/bridge';

const overlay: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
};
const dialog: React.CSSProperties = {
  width: 480, maxHeight: '80vh', overflow: 'auto', backgroundColor: '#252526', borderRadius: 8,
  padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', color: '#ccc',
};
const title: React.CSSProperties = { fontSize: 18, color: '#fff', marginBottom: 12 };
const subtitle: React.CSSProperties = { fontSize: 13, color: '#999', marginBottom: 16 };
const btn: React.CSSProperties = { padding: '6px 16px', fontSize: 13, border: 'none', borderRadius: 4, cursor: 'pointer', marginRight: 8 };
const btnPrimary: React.CSSProperties = { ...btn, backgroundColor: '#007acc', color: '#fff' };
const btnSecondary: React.CSSProperties = { ...btn, backgroundColor: '#3c3c3c', color: '#ccc' };
const btnAi: React.CSSProperties = { ...btn, backgroundColor: '#5a3e00', color: '#dcdcaa' };
const adaptItem: React.CSSProperties = {
  padding: '8px 12px', marginBottom: 6, backgroundColor: '#2d2d2d', borderRadius: 4, fontSize: 13,
};
const adaptField: React.CSSProperties = { color: '#dcdcaa', fontSize: 12, marginBottom: 2 };
const adaptChange: React.CSSProperties = { color: '#ccc', fontSize: 13, marginBottom: 2 };
const adaptReason: React.CSSProperties = { color: '#888', fontSize: 11, fontStyle: 'italic' };
const loadingBar: React.CSSProperties = {
  padding: '10px 16px', backgroundColor: '#094771', color: '#fff', fontSize: 13,
  display: 'flex', alignItems: 'center', gap: 8, borderRadius: 4, marginBottom: 12,
};

export const ImportDialog: React.FC = () => {
  const { importDialogOpen, importCardId, cards, closeImportDialog } = useFanlibStore();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const activeProject = useWorkspaceStore((s) => s.activeProject);
  const card = cards.find((c) => c.id === importCardId);
  const [importing, setImporting] = useState(false);
  const [adapting, setAdapting] = useState(false);
  const [adaptations, setAdaptations] = useState<any[] | null>(null);
  const [adaptedAttrs, setAdaptedAttrs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  if (!importDialogOpen || !card) return null;

  const projectPath = workspace && activeProject ? `${workspace.path}/${activeProject}` : null;

  const handleImport = async (useAdapted: boolean) => {
    if (!projectPath || !card) { setError('未选择目标作品'); return; }
    setImporting(true);
    setError('');
    try {
      const attrs: Record<string, string> = { 来源: card.source?.title || '' };
      if (useAdapted && adaptations) {
        for (const a of adaptations) {
          attrs[a.field] = adaptedAttrs[a.field] || a.adapted;
        }
      } else if (card.type === 'character') {
        const c = card as any;
        attrs['外貌'] = c.appearance || '';
        attrs['性格'] = c.personality || '';
        attrs['能力'] = (c.abilities || []).join('、');
      }
      await bridge.wikiSave(projectPath, {
        id: `wiki-fanlib-${Date.now()}`,
        type: 'person',
        title: useAdapted && adaptedAttrs['名称'] ? adaptedAttrs['名称'] : card.name,
        aliases: card.aliases || [],
        summary: useAdapted ? `平行宇宙改编自同人库卡片「${card.name}」` : (card as any).personality || '',
        content: (card as any).background || '',
        attributes: attrs,
        relations: [],
        sourceChapters: [],
        confidence: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        confirmedByUser: true,
      });
      closeImportDialog();
      setAdaptations(null);
      setAdaptedAttrs({});
    } catch (e) {
      setError('引入失败: ' + (e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const handleAdapt = async () => {
    if (!workspace || !projectPath || !card) { setError('缺少工作区或目标作品'); return; }
    setAdapting(true);
    setError('');
    try {
      const results = await bridge.fanlibAdapt(workspace.path, card.id, projectPath) as any[];
      if (!results || results.length === 0) {
        setError('AI 未返回改编建议，请重试');
        return;
      }
      setAdaptations(results);
      const attrs: Record<string, string> = {};
      for (const r of results) {
        attrs[r.field] = r.adapted;
      }
      setAdaptedAttrs(attrs);
    } catch (e) {
      setError('AI 改编失败: ' + (e as Error).message);
    } finally {
      setAdapting(false);
    }
  };

  return (
    <div style={overlay} onClick={closeImportDialog}>
      <div style={dialog} onClick={(e) => e.stopPropagation()}>
        <div style={title}>
          引入「{card.name}」
        </div>
        <div style={subtitle}>
          来源：{card.source?.title || card.source?.type || '原创'}
          {projectPath ? ` → 目标作品：${activeProject}` : ''}
        </div>

        {error && (
          <div style={{ ...loadingBar, backgroundColor: '#5a1d1d', color: '#f44747' }}>
            ✗ {error}
          </div>
        )}
        {!projectPath && !error && (
          <div style={{ ...loadingBar, backgroundColor: '#5a1d1d' }}>
            请先在左侧 Explorer 中选择一个作品
          </div>
        )}

        {adapting && (
          <div style={loadingBar}>
            AI 正在分析世界观，生成平行宇宙改编…
          </div>
        )}

        {adaptations && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: '#4ec9b0', marginBottom: 8, fontWeight: 600 }}>
              AI 平行宇宙改编建议
            </div>
            {adaptations.map((a, i) => (
              <div key={i} style={adaptItem}>
                <div style={adaptField}>{a.field}</div>
                <div style={adaptChange}>
                  <span style={{ color: '#888', textDecoration: 'line-through' }}>{a.original}</span>
                  {' → '}
                  <span style={{ color: '#4ec9b0' }}>{adaptedAttrs[a.field] || a.adapted}</span>
                </div>
                <div style={adaptReason}>{a.reason}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button style={btnSecondary} onClick={() => { closeImportDialog(); setAdaptations(null); setAdaptedAttrs({}); }}>取消</button>
          {projectPath && !adaptations && (
            <button style={btnAi} onClick={handleAdapt} disabled={adapting}>
              AI 改编
            </button>
          )}
          {projectPath && (
            <button style={btnPrimary} onClick={() => handleImport(!!adaptations)} disabled={importing}>
              {importing ? '引入中...' : adaptations ? '确认引入(改编版)' : '直接引入'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
