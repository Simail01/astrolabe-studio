import React, { useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { bridge } from '../../services/bridge';
import type { AstrolabeConfig } from '@astrolabe/shared';

const overlay: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100,
};
const dialog: React.CSSProperties = {
  backgroundColor: 'var(--editor-panel)', borderRadius: 8, padding: 24, width: 420, color: 'var(--text-primary)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};
const dialogTitle: React.CSSProperties = { fontSize: 18, color: 'var(--text-inverse)', marginBottom: 16 };
const field: React.CSSProperties = { marginBottom: 14 };
const label: React.CSSProperties = { display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 };
const input: React.CSSProperties = {
  width: '100%', padding: '6px 10px', fontSize: 14, backgroundColor: 'var(--bg-control)', border: '1px solid var(--border-input)', color: 'var(--text-inverse)', borderRadius: 4, outline: 'none',
};
const textarea: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 60, fontFamily: 'inherit' };
const btnRow: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 };
const btn: React.CSSProperties = { padding: '8px 20px', fontSize: 13, borderRadius: 4, cursor: 'pointer', border: 'none' };
const btnPrimary: React.CSSProperties = { ...btn, backgroundColor: 'var(--accent-blue)', color: 'var(--text-inverse)' };
const btnSecondary: React.CSSProperties = { ...btn, backgroundColor: 'var(--bg-control)', color: 'var(--text-primary)' };

const genreOptions = ['玄幻', '武侠', '都市', '科幻', '历史', '悬疑', '言情', '轻小说', '其他'];

interface Props {
  onClose: () => void;
  onCreated: (project: AstrolabeConfig) => void;
}

export const CreateProjectDialog: React.FC<Props> = ({ onClose, onCreated }) => {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const [name, setName] = useState('');
  const [genre, setGenre] = useState('');
  const [premise, setPremise] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !workspace) return;
    setCreating(true);
    try {
      const project = await bridge.createProject(workspace.path, name.trim()) as AstrolabeConfig;
      project.tags = genre ? [genre] : [];
      onCreated(project);
      onClose();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={(e) => e.stopPropagation()}>
        <div style={dialogTitle}>新建作品</div>

        <div style={field}>
          <label style={label}>作品标题 *</label>
          <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="输入作品名称" autoFocus />
        </div>

        <div style={field}>
          <label style={label}>类型</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {genreOptions.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g === genre ? '' : g)}
                style={{
                  padding: '3px 10px', fontSize: 12, borderRadius: 12, cursor: 'pointer', border: '1px solid var(--border-input)',
                  backgroundColor: genre === g ? 'var(--accent-blue)' : 'transparent',
                  color: genre === g ? 'var(--text-inverse)' : 'var(--text-secondary)',
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div style={field}>
          <label style={label}>一句话梗概</label>
          <textarea style={textarea} value={premise} onChange={(e) => setPremise(e.target.value)} placeholder="简单描述故事的核心创意..." />
        </div>

        <div style={btnRow}>
          <button style={btnSecondary} onClick={onClose}>取消</button>
          <button style={btnPrimary} onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? '创建中...' : '创建作品'}
          </button>
        </div>
      </div>
    </div>
  );
};
