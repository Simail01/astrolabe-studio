import React, { useState, useRef, useEffect } from 'react';
import { useTemplateStore } from '../../stores/template.store';
import type { TemplateStage } from '@astrolabe/shared';

interface Props {
  stage: TemplateStage;
  onSelect?: (templateId: string | null) => void;
}

export const TemplateSelector: React.FC<Props> = ({ stage, onSelect }) => {
  const templates = useTemplateStore(s => s.templates.filter(t => t.stage === stage));
  const selectedTemplates = useTemplateStore(s => s.selectedTemplates);
  const selectTemplate = useTemplateStore(s => s.selectTemplate);
  const openEditor = useTemplateStore(s => s.openEditor);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedId = selectedTemplates[stage] || null;
  const selected = selectedId ? templates.find(t => t.id === selectedId) : templates.find(t => t.isBuiltIn);
  const userTemplates = templates.filter(t => !t.isBuiltIn);
  const builtInTemplates = templates.filter(t => t.isBuiltIn);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const handleSelect = (id: string | null) => {
    selectTemplate(stage, id);
    onSelect?.(id);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '3px 8px', fontSize: 11, borderRadius: 3, cursor: 'pointer',
          border: '1px solid var(--border-subtle)',
          backgroundColor: selectedId ? 'var(--accent-dim)' : 'var(--bg-input)',
          color: selectedId ? 'var(--accent)' : 'var(--text-secondary)',
          maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
        title={selected?.name || '选择模板'}
      >
        {selected?.name || '默认模板'}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          minWidth: 240, maxHeight: 320, overflow: 'auto',
          backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-subtle)',
          borderRadius: 4, padding: '4px 0', zIndex: 1100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {/* Built-in templates */}
          <div style={{ padding: '4px 12px', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>内置模板</div>
          {builtInTemplates.map(t => (
            <div key={t.id}
              onClick={() => handleSelect(t.id)}
              style={{
                padding: '6px 12px', fontSize: 12, cursor: 'pointer',
                color: selected?.id === t.id ? 'var(--accent)' : 'var(--text-primary)',
                backgroundColor: selected?.id === t.id ? 'var(--accent-dim)' : 'transparent',
              }}
              onMouseEnter={e => { if (selected?.id !== t.id) e.currentTarget.style.backgroundColor = 'var(--bg-input)'; }}
              onMouseLeave={e => { if (selected?.id !== t.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {t.name}
            </div>
          ))}

          {/* User templates */}
          {userTemplates.length > 0 && (
            <>
              <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '4px 8px' }} />
              <div style={{ padding: '4px 12px', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>自定义模板</div>
              {userTemplates.map(t => (
                <div key={t.id}
                  onClick={() => handleSelect(t.id)}
                  style={{
                    padding: '6px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    color: selected?.id === t.id ? 'var(--accent)' : 'var(--text-primary)',
                    backgroundColor: selected?.id === t.id ? 'var(--accent-dim)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (selected?.id !== t.id) e.currentTarget.style.backgroundColor = 'var(--bg-input)'; }}
                  onMouseLeave={e => { if (selected?.id !== t.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <span>{t.name}</span>
                </div>
              ))}
            </>
          )}

          {/* Actions */}
          <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '4px 8px' }} />
          <div
            onClick={() => { setOpen(false); openEditor(); }}
            style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--accent)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--accent-dim)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            + 新建自定义模板
          </div>
          <div
            onClick={() => handleSelect(null)}
            style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-input)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            重置为默认
          </div>
        </div>
      )}
    </div>
  );
};
