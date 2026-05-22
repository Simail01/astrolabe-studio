import React, { useState, useEffect, useRef } from 'react';
import { useOutlineStore } from '../../stores/outline.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { bridge } from '../../services/bridge';
import type { OutlineNode, Outline } from '@astrolabe/shared';

const TreeNode: React.FC<{ node: OutlineNode; depth: number }> = ({ node, depth }) => {
  const { selectedNodeId, expandedNodes, selectNode, toggleNode, addChildNode, removeNode, updateNode } = useOutlineStore();
  const isSelected = selectedNodeId === node.id;
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);

  const handleSaveTitle = () => {
    if (editTitle.trim()) updateNode(node.id, { title: editTitle.trim() });
    setEditing(false);
  };

  return (
    <div>
      <div
        onClick={() => selectNode(node.id)}
        onDoubleClick={() => { setEditing(true); setEditTitle(node.title); }}
        style={{
          display: 'flex', alignItems: 'center', padding: '4px 8px', cursor: 'pointer', borderRadius: 4, gap: 4,
          backgroundColor: isSelected ? 'var(--accent-dim)' : 'transparent',
          color: isSelected ? 'var(--text-inverse)' : 'var(--text-primary)',
          fontSize: 14, marginLeft: depth * 20,
        }}
      >
        <span style={{ width: 16, textAlign: 'center', flexShrink: 0, color: 'var(--text-muted)', cursor: 'pointer' }}
          onClick={e => { e.stopPropagation(); if (hasChildren) toggleNode(node.id); }}>
          {hasChildren ? (isExpanded ? '▾' : '▸') : ''}
        </span>
        {editing ? (
          <input value={editTitle} onChange={e => setEditTitle(e.target.value)} onBlur={handleSaveTitle}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditing(false); }}
            style={{ flex: 1, fontSize: 14, padding: '2px 4px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--accent)', color: 'var(--text-primary)', borderRadius: 4, outline: 'none' }}
            autoFocus onClick={e => e.stopPropagation()} />
        ) : (
          <span style={{ flex: 1 }}>{node.title || '未命名'}</span>
        )}
        <button onClick={e => { e.stopPropagation(); addChildNode(node.id, { id: `n-${Date.now()}`, title: '新章节', summary: '', children: [] }); }}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '0 4px', opacity: 0.5 }}
          title="添加子节点">+</button>
        <button onClick={e => { e.stopPropagation(); removeNode(node.id); }}
          style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: 14, padding: '0 4px', opacity: 0.5 }}
          title="删除">×</button>
      </div>
      {isExpanded && hasChildren && node.children.map(c => <TreeNode key={c.id} node={c} depth={depth + 1} />)}
    </div>
  );
};

export const OutlinePage: React.FC = () => {
  const outline = useOutlineStore(s => s.outline);
  const setOutline = useOutlineStore(s => s.setOutline);
  const getProjectPath = useWorkspaceStore(s => s.getProjectPath);
  const workspace = useWorkspaceStore(s => s.workspace);
  const activeProject = useWorkspaceStore(s => s.activeProject);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAI, setShowAI] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [genSuccess, setGenSuccess] = useState('');

  const projectPath = getProjectPath();

  // Load outline on project change
  useEffect(() => {
    if (!projectPath) return;
    bridge.pipelineGetOutline(projectPath).then(d => {
      if (d) setOutline(d as Outline);
    }).catch(() => {});
  }, [activeProject, workspace]);

  // Auto-save outline on change
  const outlineRef = useRef(outline);
  outlineRef.current = outline;
  useEffect(() => {
    const timer = setTimeout(() => {
      const cur = outlineRef.current;
      if (!cur || !projectPath || !cur.nodes.length) return;
      bridge.pipelineSaveOutline(projectPath, cur as any).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [outline]);

  const handleAddRoot = () => {
    const current = useOutlineStore.getState().outline;
    if (!current) {
      setOutline({ id: 'outline-1', title: '', premise: '', genre: [], nodes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      return;
    }
    const nodes = [...current.nodes, { id: `n-${Date.now()}`, title: '新卷', summary: '', children: [] }];
    setOutline({ ...current, nodes, updatedAt: new Date().toISOString() } as any);
  };

  const handleAIGenerate = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) return;
    setGenerating(true); setGenError(''); setGenSuccess('');
    try {
      const sysPrompt = '你是小说架构师。生成结构化大纲。每行一个节点，缩进表层级。格式：\n第一卷：标题\n  第1章：标题 — 概要\n  第2章：标题 — 概要';
      const result = await bridge.generateText(prompt, sysPrompt) as string;
      if (!result?.trim()) throw new Error('AI 返回空内容');
      const lines = result.split('\n').filter(l => l.trim());
      const nodes: OutlineNode[] = [];
      const stack: { node: OutlineNode; depth: number }[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]; const indent = line.search(/\S/);
        const depth = indent < 0 ? 0 : Math.floor(indent / 2);
        const newNode: OutlineNode = { id: `n-${Date.now()}-${i}`, title: line.trim(), summary: '', children: [] };
        while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
        if (stack.length === 0) nodes.push(newNode);
        else stack[stack.length - 1].node.children.push(newNode);
        stack.push({ node: newNode, depth });
      }
      setOutline({ id: 'outline-1', title: '', premise: prompt, genre: [], nodes, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      setShowAI(false); setAiPrompt('');
      setGenSuccess(`生成完成，共 ${nodes.length} 个根节点`);
      setTimeout(() => setGenSuccess(''), 3000);
    } catch (e) { setGenError((e as Error).message || '生成失败'); }
    finally { setGenerating(false); }
  };

  if (!workspace || !activeProject || !projectPath) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 12 }}>
        <div style={{ fontSize: 48, opacity: 0.3 }}>🗂️</div>
        <div style={{ fontSize: 16 }}>{!workspace ? '请先打开工作区' : '请先在左侧选择一个作品'}</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>大纲</span>
        <button onClick={handleAddRoot}
          style={{ padding: '4px 12px', fontSize: 12, backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 4, cursor: 'pointer' }}>
          + 根节点
        </button>
        {!showAI ? (
          <button onClick={() => setShowAI(true)}
            style={{ padding: '4px 12px', fontSize: 12, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            AI 生成
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 4, flex: 1, maxWidth: 500 }}>
            <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
              placeholder="输入故事梗概，回车生成…"
              onKeyDown={e => { if (e.key === 'Enter') handleAIGenerate(); if (e.key === 'Escape') setShowAI(false); }}
              style={{ flex: 1, fontSize: 13, padding: '4px 8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--accent)', color: 'var(--text-primary)', borderRadius: 4, outline: 'none' }}
              autoFocus />
            <button onClick={handleAIGenerate} disabled={generating || !aiPrompt.trim()}
              style={{ padding: '4px 12px', fontSize: 12, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderRadius: 4, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1 }}>
              {generating ? '…' : '生成'}
            </button>
            <button onClick={() => setShowAI(false)}
              style={{ padding: '4px 12px', fontSize: 12, backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 4, cursor: 'pointer' }}>
              取消
            </button>
          </div>
        )}
      </div>

      {/* Status messages */}
      {generating && <div style={{ padding: '8px 16px', backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>AI 正在生成大纲…</div>}
      {genError && <div style={{ padding: '8px 16px', backgroundColor: '#3a1a1a', color: 'var(--color-error)', fontSize: 13, display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}><span>✗ {genError}</span><button onClick={() => setGenError('')} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: 14 }}>✕</button></div>}
      {genSuccess && <div style={{ padding: '6px 16px', backgroundColor: '#1a3a1a', color: 'var(--color-success)', fontSize: 13, flexShrink: 0 }}>✓ {genSuccess}</div>}

      {/* Tree */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {outline?.nodes?.map(n => <TreeNode key={n.id} node={n} depth={0} />)}
        {(!outline || outline.nodes.length === 0) && !generating && (
          <div style={{ padding: 32, color: 'var(--text-muted)', fontSize: 14, textAlign: 'center' }}>
            点击"+ 根节点"手动创建大纲，或"AI 生成"自动生成
          </div>
        )}
      </div>
    </div>
  );
};
