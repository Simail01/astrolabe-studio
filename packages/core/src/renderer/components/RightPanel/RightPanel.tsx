import React, { useState } from 'react';
import { useLayoutStore } from '../../stores/layout.store';
import { useWikiStore } from '../../stores/wiki.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { bridge } from '../../services/bridge';
import { FanlibPanel } from '../Fanlib/FanlibPanel';
import { FanlibCardEditor } from '../Fanlib/FanlibCardEditor';
import { ImportDialog } from '../Fanlib/ImportDialog';
import { CreateCardDialog } from '../Fanlib/CreateCardDialog';
import type { WikiEntry } from '@astrolabe/shared';

const panel: React.CSSProperties = {
  width: 280, minWidth: 200, backgroundColor: '#252526', borderLeft: '1px solid #3c3c3c',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
};
const header: React.CSSProperties = {
  padding: '8px 12px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#999',
  letterSpacing: 1, borderBottom: '1px solid #3c3c3c',
};
const searchBox: React.CSSProperties = {
  margin: 8, padding: '4px 8px', fontSize: 12, backgroundColor: '#3c3c3c', border: '1px solid #555',
  color: '#fff', borderRadius: 3, outline: 'none',
};
const list: React.CSSProperties = { flex: 1, overflow: 'auto' };
const listItem: React.CSSProperties = {
  padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#ccc', borderBottom: '1px solid #2d2d2d',
};
const listItemActive: React.CSSProperties = { ...listItem, backgroundColor: '#094771', color: '#fff' };
const detail: React.CSSProperties = { padding: 12, overflow: 'auto', flex: 1 };
const field: React.CSSProperties = { marginBottom: 10 };
const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#888', marginBottom: 2 };
const fieldValue: React.CSSProperties = { fontSize: 13, color: '#ccc', whiteSpace: 'pre-wrap' };
const suggBar: React.CSSProperties = {
  padding: '8px 12px', backgroundColor: '#094771', borderBottom: '1px solid #3c3c3c',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const suggItem: React.CSSProperties = {
  padding: '8px 12px', borderBottom: '1px solid #2d2d2d', fontSize: 13,
};
const suggTitle: React.CSSProperties = { color: '#fff', marginBottom: 4 };
const suggEvidence: React.CSSProperties = { color: '#888', fontSize: 11, marginBottom: 4, fontStyle: 'italic' };
const suggConfidence: React.CSSProperties = { fontSize: 11, marginBottom: 6 };
const suggBtns: React.CSSProperties = { display: 'flex', gap: 4 };
const smallBtn: React.CSSProperties = {
  padding: '2px 8px', fontSize: 11, borderRadius: 3, cursor: 'pointer', border: 'none',
};
const btnConfirm: React.CSSProperties = { ...smallBtn, backgroundColor: '#1d5a1d', color: '#4ec9b0' };
const btnReject: React.CSSProperties = { ...smallBtn, backgroundColor: '#3c3c3c', color: '#ccc' };

const typeLabels: Record<string, string> = {
  person: '角色', location: '地点', faction: '势力', item: '物品', event: '事件', rule: '规则',
};

// Inline Wiki detail with edit/delete/design images
const WikiDetail: React.FC<{ entry: WikiEntry }> = ({ entry: initialEntry }) => {
  const getProjectPath = useWorkspaceStore((s) => s.getProjectPath);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialEntry.title);
  const [summary, setSummary] = useState(initialEntry.summary || '');
  const [content, setContent] = useState(initialEntry.content || '');
  const [saving, setSaving] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  const handleSave = async () => {
    const projectPath = getProjectPath();
    if (!projectPath) return;
    setSaving(true);
    try {
      const updated = { ...initialEntry, title, summary, content, updatedAt: new Date().toISOString() };
      await bridge.wikiSave(projectPath, updated);
      useWikiStore.getState().addOrUpdateEntry(updated);
      setEditing(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`确定删除条目「${initialEntry.title}」？`)) return;
    const projectPath = getProjectPath();
    if (!projectPath) return;
    try {
      await bridge.wikiDelete(projectPath, initialEntry.type, initialEntry.id);
      useWikiStore.getState().removeEntry(initialEntry.id);
    } catch (e) { console.error(e); }
  };

  const handleGenerateImage = async () => {
    const projectPath = getProjectPath();
    if (!projectPath) { setGenError('未选择项目'); return; }
    const volcKey = await bridge.getAIKey('volcengine').catch(() => null);
    if (!volcKey) { setGenError('请先配置火山方舟 API Key'); return; }
    setGenerating(true); setGenError('');
    try {
      const model = await bridge.getAIKey('volcengine-image-model') || 'doubao-seedream-5-0-260128';
      const attrStr = Object.entries(initialEntry.attributes || {}).map(([k,v]) => `${k}：${Array.isArray(v)?v.join('、'):v}`).join('。');
      const prompt = genPrompt || `角色设定图，${initialEntry.title}，${attrStr}，${initialEntry.summary||''}`;
      const urls = await bridge.generateImage({ model, prompt, size: '2K' }) as string[];
      if (!urls || urls.length === 0) { setGenError('AI 未返回图片'); return; }
      const designImages = [...(initialEntry.attributes?.designImages as string[] || []), ...urls];
      const updated = { ...initialEntry, attributes: { ...initialEntry.attributes, designImages } as any, updatedAt: new Date().toISOString() };
      await bridge.wikiSave(projectPath, updated);
      useWikiStore.getState().addOrUpdateEntry(updated);
      setGenPrompt('');
    } catch (e) { setGenError((e as Error).message || '生成失败'); }
    finally { setGenerating(false); }
  };

  if (editing) {
    return (
      <div style={{ ...detail, borderTop: '1px solid #3c3c3c' }}>
        <div style={field}><div style={fieldLabel}>标题</div><input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '4px 6px', fontSize: 13, backgroundColor: '#3c3c3c', border: '1px solid #555', color: '#fff', borderRadius: 3, outline: 'none' }} /></div>
        <div style={field}><div style={fieldLabel}>摘要</div><input value={summary} onChange={e => setSummary(e.target.value)} style={{ width: '100%', padding: '4px 6px', fontSize: 13, backgroundColor: '#3c3c3c', border: '1px solid #555', color: '#fff', borderRadius: 3, outline: 'none' }} /></div>
        <div style={field}><div style={fieldLabel}>详情</div><textarea value={content} onChange={e => setContent(e.target.value)} style={{ width: '100%', padding: '4px 6px', fontSize: 13, backgroundColor: '#3c3c3c', border: '1px solid #555', color: '#fff', borderRadius: 3, outline: 'none', resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }} /></div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handleSave} disabled={saving} style={{ padding: '4px 12px', fontSize: 12, backgroundColor: '#007acc', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}>{saving ? '保存中...' : '保存'}</button>
          <button onClick={() => setEditing(false)} style={{ padding: '4px 12px', fontSize: 12, backgroundColor: '#3c3c3c', color: '#ccc', border: 'none', borderRadius: 3, cursor: 'pointer' }}>取消</button>
        </div>
      </div>
    );
  }

  const designImages = (initialEntry.attributes?.designImages as string[]) || [];
  const attrs = initialEntry.attributes || {};

  return (
    <div style={{ ...detail, borderTop: '1px solid #3c3c3c' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 15, color: '#fff' }}>{initialEntry.title}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => { setTitle(initialEntry.title); setSummary(initialEntry.summary || ''); setContent(initialEntry.content || ''); setEditing(true); }} style={{ padding: '2px 8px', fontSize: 11, backgroundColor: '#3c3c3c', color: '#ccc', border: 'none', borderRadius: 3, cursor: 'pointer' }}>编辑</button>
          <button onClick={handleDelete} style={{ padding: '2px 8px', fontSize: 11, backgroundColor: '#5a1d1d', color: '#f44747', border: 'none', borderRadius: 3, cursor: 'pointer' }}>删除</button>
        </div>
      </div>
      {initialEntry.summary && <div style={field}><div style={fieldLabel}>摘要</div><div style={fieldValue}>{initialEntry.summary}</div></div>}
      {initialEntry.content && <div style={field}><div style={fieldLabel}>详情</div><div style={fieldValue}>{initialEntry.content}</div></div>}
      {Object.keys(attrs).length > 0 && (
        <div style={field}>
          <div style={fieldLabel}>属性</div>
          {Object.entries(attrs).filter(([k]) => k !== 'designImages').map(([key, val]) => (
            <div key={key} style={{ fontSize: 12, marginBottom: 2 }}>
              <span style={{ color: '#888' }}>{key}:</span>{' '}
              <span style={{ color: '#ccc' }}>{Array.isArray(val) ? val.join('、') : String(val)}</span>
            </div>
          ))}
        </div>
      )}
      {initialEntry.relations?.length > 0 && (
        <div style={field}><div style={fieldLabel}>关联</div>
          {initialEntry.relations.map((r, i) => <div key={i} style={{ fontSize: 12, color: '#4ec9b0', marginBottom: 2 }}>{r.relationType} → {r.targetId}</div>)}
        </div>
      )}
      {/* Design Images */}
      <div style={{ ...field, borderTop: '1px solid #3c3c3c', paddingTop: 8 }}>
        <div style={{ ...fieldLabel, marginBottom: 4 }}>设定图</div>
        {designImages.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {designImages.map((url: string, i: number) => (
              <img key={i} src={url} alt={`设定图 ${i+1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, border: '1px solid #444' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ))}
          </div>
        ) : <div style={{ color: '#666', fontSize: 11, marginBottom: 6 }}>暂无设定图</div>}
        <input value={genPrompt} onChange={e => setGenPrompt(e.target.value)} placeholder="自定义 prompt（可选）" style={{ width: '100%', padding: '3px 6px', fontSize: 11, backgroundColor: '#3c3c3c', border: '1px solid #555', color: '#fff', borderRadius: 3, outline: 'none', marginBottom: 4 }} />
        <button onClick={handleGenerateImage} disabled={generating} style={{ padding: '3px 10px', fontSize: 11, backgroundColor: generating ? '#3c3c3c' : '#5a3e00', color: generating ? '#888' : '#dcdcaa', border: 'none', borderRadius: 3, cursor: generating ? 'not-allowed' : 'pointer' }}>{generating ? '生成中...' : 'AI 生成设定图'}</button>
        {genError && <span style={{ color: '#f44747', fontSize: 11, marginLeft: 8 }}>{genError}</span>}
      </div>
    </div>
  );
};

export const RightPanel: React.FC = () => {
  const visible = useLayoutStore((s) => s.rightPanelVisible);
  const rightPanelMode = useLayoutStore((s) => s.rightPanelMode);
  const wiki = useWikiStore();
  const getProjectPath = useWorkspaceStore((s) => s.getProjectPath);
  const [showCreateCard, setShowCreateCard] = useState(false);

  const handleConfirm = async (index: number) => {
    const s = wiki.suggestions[index];
    if (!s || s.status !== 'pending') return;
    const projectPath = getProjectPath();
    if (!projectPath) return;

    const entry: WikiEntry = {
      id: `wiki-${Date.now()}-${index}`,
      type: s.type,
      title: s.title,
      aliases: [],
      summary: s.summary || '',
      content: s.content || '',
      attributes: s.attributes || {},
      relations: [],
      sourceChapters: [],
      confidence: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmedByUser: true,
    };
    try {
      await bridge.wikiSave(projectPath, entry);
      wiki.confirmSuggestion(index);
      wiki.addOrUpdateEntry(entry);
    } catch (e) {
      console.error('Wiki save failed:', e);
    }
  };

  const handleEnrich = async () => {
    const projectPath = getProjectPath();
    const entry = wiki.entries.find(e => e.id === selectedEntryId);
    if (!projectPath || !entry) return;
    setAiWorking('enrich');
    try {
      const results = await bridge.wikiEnrich(projectPath, entry.id, entry.title, entry.type) as any[];
      setEnrichResults(results);
    } catch(e) { console.error(e); }
    finally { setAiWorking(''); }
  };

  const handleConsistency = async () => {
    const projectPath = getProjectPath();
    if (!projectPath) return;
    setAiWorking('consistency');
    try {
      const results = await bridge.wikiConsistency(projectPath) as any[];
      setConsistencyResults(results);
    } catch(e) { console.error(e); }
    finally { setAiWorking(''); }
  };

  const handleRelations = async () => {
    const projectPath = getProjectPath();
    if (!projectPath) return;
    setAiWorking('relations');
    try {
      const results = await bridge.wikiRelations(projectPath) as any[];
      setRelationResults(results);
    } catch(e) { console.error(e); }
    finally { setAiWorking(''); }
  };

  const {
    filteredEntries, selectedEntryId, searchQuery, setSearchQuery, selectEntry,
    suggestions, confirmSuggestion, rejectSuggestion, clearSuggestions,
  } = wiki;
  const entry = wiki.entries.find((e) => e.id === selectedEntryId);
  const pendingCount = suggestions.filter(s => s.status === 'pending').length;
  const [showSuggestions, setShowSuggestions] = React.useState(true);
  const [enrichResults, setEnrichResults] = useState<any[] | null>(null);
  const [consistencyResults, setConsistencyResults] = useState<any[] | null>(null);
  const [relationResults, setRelationResults] = useState<any[] | null>(null);
  const [aiWorking, setAiWorking] = useState('');

  if (!visible) return null;

  // Fanlib mode
  if (rightPanelMode === 'fanlib') {
    return (
      <div style={panel}>
        <div style={{ ...header, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>同人库</span>
          <button onClick={() => setShowCreateCard(true)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 16 }}>+</button>
        </div>
        <FanlibPanel />
        <FanlibCardEditor />
        <ImportDialog />
        {showCreateCard && <CreateCardDialog onClose={() => setShowCreateCard(false)} />}
      </div>
    );
  }

  // Show suggestion queue when there are pending items
  if (pendingCount > 0 && showSuggestions) {
    return (
      <div style={panel}>
        <div style={{
          ...header,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>Wiki 建议</span>
          <button onClick={clearSuggestions} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
        <div style={suggBar} onClick={() => setShowSuggestions(!showSuggestions)}>
          <span style={{ color: '#fff', fontSize: 13 }}>🆕 发现 {pendingCount} 条新设定</span>
          <span style={{ color: '#888', fontSize: 11 }}>{showSuggestions ? '收起' : '展开'}</span>
        </div>
        {suggestions.map((s, i) => {
          if (s.status !== 'pending') return null;
          return (
            <div key={s.id} style={suggItem}>
              <div style={suggTitle}>
                <span style={{ color: '#888', fontSize: 10, marginRight: 6 }}>[{typeLabels[s.type] ?? s.type}]</span>
                {s.title}
              </div>
              {s.evidence && <div style={suggEvidence}>"{s.evidence}"</div>}
              <div style={{
                ...suggConfidence,
                color: s.confidence >= 0.8 ? '#4ec9b0' : s.confidence >= 0.6 ? '#dcdcaa' : '#d4a72c',
              }}>
                置信度: {Math.round(s.confidence * 100)}%
              </div>
              <div style={suggBtns}>
                <button style={btnConfirm} onClick={() => handleConfirm(i)}>确认</button>
                <button style={btnReject} onClick={() => rejectSuggestion(i)}>拒绝</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Normal Wiki view
  return (
    <div style={panel}>
      <div style={header}>Wiki 知识库</div>
      <input
        style={searchBox}
        placeholder="搜索条目…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 4, padding: '4px 8px', flexWrap: 'wrap' }}>
        <button style={{
          padding: '4px 10px', fontSize: 11, backgroundColor: '#0e639c', color: '#fff',
          border: 'none', borderRadius: 3, cursor: 'pointer', opacity: selectedEntryId ? 1 : 0.5,
        }} onClick={handleEnrich} disabled={!selectedEntryId} title="AI 补充当前选中条目">
          补充条目
        </button>
        <button style={{
          padding: '4px 10px', fontSize: 11, backgroundColor: '#0e639c', color: '#fff',
          border: 'none', borderRadius: 3, cursor: 'pointer',
        }} onClick={handleConsistency} title="AI 扫描全文检查一致性">
          一致性检查
        </button>
        <button style={{
          padding: '4px 10px', fontSize: 11, backgroundColor: '#5a3e00', color: '#dcdcaa',
          border: 'none', borderRadius: 3, cursor: 'pointer',
        }} onClick={handleRelations} title="AI 分析条目间关系">
          分析关系
        </button>
      </div>
      {aiWorking && (
        <div style={{ padding: '8px 12px', backgroundColor: '#094771', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} />
          AI 正在分析...
        </div>
      )}
      {enrichResults && (
        <div style={{ padding: 8, borderBottom: '1px solid #3c3c3c', maxHeight: 200, overflow: 'auto' }}>
          <div style={{ fontSize: 12, color: '#4ec9b0', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>发现 {enrichResults.length} 条补充</span>
            <button onClick={() => setEnrichResults(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 12 }}>x</button>
          </div>
          {enrichResults.map((r: any, i: number) => (
            <div key={i} style={{ padding: '4px 0', fontSize: 12, color: '#ccc' }}>
              <span style={{ color: '#dcdcaa' }}>{r.field}</span>: {r.currentValue ? `${r.currentValue} -> ` : ''}{r.newValue}
              <span style={{ color: '#888', marginLeft: 8, fontSize: 10 }}>({r.sourceChapter})</span>
              <span style={{ marginLeft: 8, color: r.action === 'overwrite' ? '#f44747' : r.action === 'append' ? '#4ec9b0' : '#dcdcaa', fontSize: 10 }}>[{r.action}]</span>
            </div>
          ))}
        </div>
      )}
      {consistencyResults && (
        <div style={{ padding: 8, borderBottom: '1px solid #3c3c3c', maxHeight: 200, overflow: 'auto' }}>
          <div style={{ fontSize: 12, color: '#d4a72c', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>发现 {consistencyResults.length} 处矛盾</span>
            <button onClick={() => setConsistencyResults(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 12 }}>x</button>
          </div>
          {consistencyResults.map((r: any, i: number) => (
            <div key={i} style={{ padding: '4px 0', fontSize: 12, color: '#ccc', borderBottom: '1px solid #333', paddingBottom: 6, marginBottom: 4 }}>
              <span style={{ color: r.severity === 'critical' ? '#f44747' : r.severity === 'warning' ? '#dcdcaa' : '#888', fontWeight: 600 }}>
                {r.severity === 'critical' ? '严重' : r.severity === 'warning' ? '警告' : '提示'}
              </span>
              <div style={{ marginTop: 2 }}>{r.entryTitle}.{r.field}</div>
              <div style={{ color: '#888', fontSize: 11 }}>{r.chapterA}: "{r.valueA}" &lt;-&gt; {r.chapterB}: "{r.valueB}"</div>
              <div style={{ color: '#888', fontSize: 11 }}>建议: {r.suggestion}</div>
            </div>
          ))}
        </div>
      )}
      {relationResults && (
        <div style={{ padding: 8, borderBottom: '1px solid #3c3c3c', maxHeight: 200, overflow: 'auto' }}>
          <div style={{ fontSize: 12, color: '#4ec9b0', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>发现 {relationResults.length} 条关系</span>
            <button onClick={() => setRelationResults(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 12 }}>x</button>
          </div>
          {relationResults.map((r: any, i: number) => (
            <div key={i} style={{ padding: '4px 0', fontSize: 12, color: '#ccc' }}>
              <span style={{ color: '#dcdcaa' }}>{r.sourceTitle}</span>
              {' <- '}<span style={{ color: '#4ec9b0' }}>{r.relationType}</span>{' -> '}
              <span style={{ color: '#dcdcaa' }}>{r.targetTitle}</span>
              <span style={{ color: '#888', marginLeft: 8, fontSize: 10 }}>({Math.round(r.confidence * 100)}%{r.sourceChapter ? ', ' + r.sourceChapter : ''})</span>
            </div>
          ))}
        </div>
      )}
      <div style={list}>
        {filteredEntries.map((e) => (
          <div
            key={e.id}
            style={e.id === selectedEntryId ? listItemActive : listItem}
            onClick={() => selectEntry(e.id)}
          >
            <span style={{ color: '#888', fontSize: 10, marginRight: 6 }}>[{typeLabels[e.type] ?? e.type}]</span>
            {e.title}
          </div>
        ))}
        {filteredEntries.length === 0 && (
          <div style={{ padding: 12, color: '#666', fontSize: 12 }}>
            {searchQuery ? '无匹配结果' : '暂无 Wiki 条目'}
          </div>
        )}
      </div>
      {entry && (
        <WikiDetail entry={entry} />
      )}
    </div>
  );
};
