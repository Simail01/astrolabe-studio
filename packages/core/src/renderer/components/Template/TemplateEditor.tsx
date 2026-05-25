import React, { useState, useEffect } from 'react';
import { useTemplateStore } from '../../stores/template.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { TEMPLATE_STAGE_LABELS, type TemplateStage } from '@astrolabe/shared';

export const TemplateEditor: React.FC = () => {
  const editorOpen = useTemplateStore(s => s.editorOpen);
  const editingTemplate = useTemplateStore(s => s.editingTemplate);
  const closeEditor = useTemplateStore(s => s.closeEditor);
  const saveTemplate = useTemplateStore(s => s.saveTemplate);
  const deleteTemplate = useTemplateStore(s => s.deleteTemplate);
  const workspace = useWorkspaceStore(s => s.workspace);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState<TemplateStage>('storyboard:decompose');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingTemplate) {
      setName(editingTemplate.name);
      setDescription(editingTemplate.description);
      setStage(editingTemplate.stage);
      setContent(editingTemplate.content);
    } else {
      setName('');
      setDescription('');
      setStage('storyboard:decompose');
      setContent('');
    }
  }, [editingTemplate, editorOpen]);

  if (!editorOpen) return null;

  const handleSave = async () => {
    if (!workspace || !name.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const template = editingTemplate
        ? { ...editingTemplate, name: name.trim(), description: description.trim(), stage, content }
        : {
            id: `user-${Date.now()}`,
            name: name.trim(),
            description: description.trim(),
            stage,
            content,
            variables: [],
            isBuiltIn: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
      await saveTemplate(workspace.path, template);
      closeEditor();
    } catch (e) { alert('保存失败: ' + (e as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!workspace || !editingTemplate || editingTemplate.isBuiltIn) return;
    if (!confirm(`确定删除模板"${editingTemplate.name}"？`)) return;
    try {
      await deleteTemplate(workspace.path, editingTemplate.id);
      closeEditor();
    } catch (e) { alert('删除失败: ' + (e as Error).message); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={e => { if (e.target === e.currentTarget) closeEditor(); }}
    >
      <div style={{
        width: 640, maxHeight: '80vh', backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border-subtle)', borderRadius: 8,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {editingTemplate ? '编辑模板' : '新建自定义模板'}
          </span>
          <button onClick={closeEditor} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>模板名称</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="我的自定义模板"
                style={{ width: '100%', padding: '6px 8px', fontSize: 13, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 4, outline: 'none' }} />
            </div>
            <div style={{ width: 180 }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>适用功能</label>
              <select value={stage} onChange={e => setStage(e.target.value as TemplateStage)}
                disabled={!!editingTemplate}
                style={{ width: '100%', padding: '6px 8px', fontSize: 13, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 4, outline: 'none' }}>
                {Object.entries(TEMPLATE_STAGE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>描述</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="模板用途说明"
              style={{ width: '100%', padding: '6px 8px', fontSize: 13, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 4, outline: 'none' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>提示词内容</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="输入提示词模板内容..."
              spellCheck={false}
              style={{
                flex: 1, minHeight: 240, padding: 12, fontSize: 13, lineHeight: 1.6,
                backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)', borderRadius: 4, outline: 'none', resize: 'vertical',
                fontFamily: 'monospace',
              }} />
            <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-muted)' }}>
              使用 {'{{变量名}}'} 作为占位符，例如 {'{{chapterContent}}'}、{'{{characterDesigns}}'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {editingTemplate && !editingTemplate.isBuiltIn && (
              <button onClick={handleDelete}
                style={{ padding: '6px 16px', fontSize: 12, backgroundColor: 'transparent', color: 'var(--color-error)', border: '1px solid var(--color-error)', borderRadius: 4, cursor: 'pointer' }}>
                删除
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={closeEditor}
              style={{ padding: '6px 16px', fontSize: 12, backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 4, cursor: 'pointer' }}>
              取消
            </button>
            <button onClick={handleSave} disabled={saving || !name.trim() || !content.trim()}
              style={{ padding: '6px 16px', fontSize: 12, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving || !name.trim() || !content.trim() ? 0.6 : 1 }}>
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
