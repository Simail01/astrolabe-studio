import React, { useState, useEffect } from 'react';
import { useWikiStore } from '../../stores/wiki.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { bridge } from '../../services/bridge';
import { toast } from '../../stores/toast.store';
import type { WikiEntry, WikiEntryType } from '@astrolabe/shared';

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const dialog: React.CSSProperties = {
  width: 520, maxHeight: '80vh', backgroundColor: 'var(--bg-panel)',
  border: '1px solid var(--border-subtle)', borderRadius: 8,
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};
const header: React.CSSProperties = {
  padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const body: React.CSSProperties = { flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 };
const footer: React.CSSProperties = {
  padding: '12px 16px', borderTop: '1px solid var(--border-subtle)',
  display: 'flex', justifyContent: 'flex-end', gap: 8,
};
const label: React.CSSProperties = { fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' };
const input: React.CSSProperties = {
  width: '100%', padding: '6px 8px', fontSize: 13,
  backgroundColor: 'var(--bg-control)', border: '1px solid var(--border-input)',
  color: 'var(--text-primary)', borderRadius: 4, outline: 'none',
};
const textarea: React.CSSProperties = { ...input, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' };
const select: React.CSSProperties = { ...input, cursor: 'pointer' };
const btnBase: React.CSSProperties = { padding: '6px 16px', fontSize: 12, borderRadius: 4, cursor: 'pointer', border: 'none' };
const btnPrimary: React.CSSProperties = { ...btnBase, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' };
const btnCancel: React.CSSProperties = { ...btnBase, backgroundColor: 'var(--bg-control)', color: 'var(--text-primary)' };
const btnDanger: React.CSSProperties = { ...btnBase, backgroundColor: 'transparent', color: 'var(--color-error-text)', border: '1px solid var(--color-error-text)' };

const typeLabels: Record<WikiEntryType, string> = {
  person: '人物', location: '地点', faction: '势力', item: '物品', event: '事件', rule: '规则', foreshadow: '伏笔',
};
const types: WikiEntryType[] = ['person', 'location', 'faction', 'item', 'event', 'rule', 'foreshadow'];

interface Props {
  entry?: WikiEntry | null;
  onClose: () => void;
  defaultTitle?: string;
  defaultType?: WikiEntryType;
}

export const WikiEntryForm: React.FC<Props> = ({ entry, onClose, defaultTitle, defaultType }) => {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const getProjectPath = useWorkspaceStore((s) => s.getProjectPath);
  const addOrUpdateEntry = useWikiStore((s) => s.addOrUpdateEntry);
  const removeEntry = useWikiStore((s) => s.removeEntry);

  const [type, setType] = useState<WikiEntryType>(entry?.type || defaultType || 'person');
  const [title, setTitle] = useState(entry?.title || defaultTitle || '');
  const [aliases, setAliases] = useState(entry?.aliases.join(', ') || '');
  const [summary, setSummary] = useState(entry?.summary || '');
  const [content, setContent] = useState(entry?.content || '');
  const [saving, setSaving] = useState(false);

  const isEdit = !!entry;

  const handleSave = async () => {
    const projectPath = getProjectPath();
    if (!projectPath || !title.trim()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const wikiEntry: WikiEntry = {
        id: entry?.id || `wiki-${Date.now()}`,
        type,
        title: title.trim(),
        aliases: aliases.split(',').map(a => a.trim()).filter(Boolean),
        summary: summary.trim(),
        content: content.trim(),
        attributes: entry?.attributes || {},
        relations: entry?.relations || [],
        sourceChapters: entry?.sourceChapters || [],
        confidence: entry?.confidence || 1,
        createdAt: entry?.createdAt || now,
        updatedAt: now,
        confirmedByUser: entry?.confirmedByUser ?? true,
      };
      await bridge.wikiSave(projectPath, wikiEntry);
      addOrUpdateEntry(wikiEntry);
      toast.success(isEdit ? '条目已更新' : '条目已创建');
      onClose();
    } catch (e) {
      toast.error('保存失败: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const projectPath = getProjectPath();
    if (!projectPath || !entry) return;
    if (!confirm(`确定删除"${entry.title}"？`)) return;
    try {
      await bridge.wikiDelete(projectPath, entry.type, entry.id);
      removeEntry(entry.id);
      toast.success('条目已删除');
      onClose();
    } catch (e) {
      toast.error('删除失败: ' + (e as Error).message);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={e => e.stopPropagation()}>
        <div style={header}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {isEdit ? '编辑条目' : '新建 Wiki 条目'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={body}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 140 }}>
              <label style={label}>类型</label>
              <select value={type} onChange={e => setType(e.target.value as WikiEntryType)} style={select}>
                {types.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>标题 *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="条目名称" style={input} autoFocus />
            </div>
          </div>
          <div>
            <label style={label}>别名（逗号分隔）</label>
            <input value={aliases} onChange={e => setAliases(e.target.value)} placeholder="别名1, 别名2" style={input} />
          </div>
          <div>
            <label style={label}>摘要</label>
            <input value={summary} onChange={e => setSummary(e.target.value)} placeholder="一句话描述" style={input} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={label}>详细内容</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="详细描述…" style={{ ...textarea, flex: 1, minHeight: 120 }} />
          </div>
        </div>
        <div style={footer}>
          <div style={{ flex: 1 }}>
            {isEdit && (
              <button onClick={handleDelete} style={btnDanger}>删除</button>
            )}
          </div>
          <button onClick={onClose} style={btnCancel}>取消</button>
          <button onClick={handleSave} disabled={saving || !title.trim()} style={{ ...btnPrimary, opacity: saving || !title.trim() ? 0.6 : 1 }}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};
