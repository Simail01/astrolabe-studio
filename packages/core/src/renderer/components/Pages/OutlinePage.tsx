import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOutlineStore } from '../../stores/outline.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useTemplateStore } from '../../stores/template.store';
import { TemplateSelector } from '../Template/TemplateSelector';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';
import { bridge } from '../../services/bridge';
import type { OutlineNode, Outline } from '@astrolabe/shared';

const TreeNode: React.FC<{
  node: OutlineNode;
  depth: number;
  dragId: string | null;
  dropTarget: { nodeId: string; position: 'top' | 'bottom' } | null;
  onDragStartNode: (e: React.DragEvent, nodeId: string) => void;
  onDragOverNode: (e: React.DragEvent, nodeId: string) => void;
  onDropOnNode: (e: React.DragEvent, nodeId: string) => void;
  onDragLeaveNode: () => void;
  onDragEndNode: () => void;
}> = ({ node, depth, dragId, dropTarget, onDragStartNode, onDragOverNode, onDropOnNode, onDragLeaveNode, onDragEndNode }) => {
  const { selectedNodeId, expandedNodes, selectNode, toggleNode, addChildNode, removeNode, updateNode } = useOutlineStore();
  const isSelected = selectedNodeId === node.id;
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [editingSummary, setEditingSummary] = useState(false);
  const [editSummary, setEditSummary] = useState(node.summary || '');

  const isDragTarget = dropTarget?.nodeId === node.id;

  const handleSaveTitle = () => {
    if (editTitle.trim()) updateNode(node.id, { title: editTitle.trim() });
    setEditing(false);
  };

  const handleToggleSummary = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingSummary) setEditSummary(node.summary || '');
    setEditingSummary(!editingSummary);
  };

  const handleSaveSummary = () => {
    updateNode(node.id, { summary: editSummary.trim() });
    setEditingSummary(false);
  };

  return (
    <div>
      {isDragTarget && dropTarget?.position === 'top' && (
        <div style={{ height: 2, backgroundColor: 'var(--accent)', marginLeft: depth * 20 }} />
      )}
      <div
        onClick={() => selectNode(node.id)}
        onDoubleClick={() => { setEditing(true); setEditTitle(node.title); }}
        style={{
          display: 'flex', alignItems: 'center', padding: '4px 8px', cursor: 'pointer', borderRadius: 4, gap: 4,
          backgroundColor: isDragTarget ? 'var(--accent-dim)' : isSelected ? 'var(--accent-dim)' : 'transparent',
          color: isSelected ? 'var(--text-inverse)' : 'var(--text-primary)',
          fontSize: 14, marginLeft: depth * 20,
          outline: isDragTarget ? '2px solid var(--accent)' : 'none',
          outlineOffset: -2,
        }}
        draggable
        onDragStart={(e) => onDragStartNode(e, node.id)}
        onDragOver={(e) => onDragOverNode(e, node.id)}
        onDrop={(e) => onDropOnNode(e, node.id)}
        onDragLeave={onDragLeaveNode}
        onDragEnd={onDragEndNode}
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
        <button onClick={handleToggleSummary}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, padding: '0 4px', opacity: 0.5 }}
          title="编辑摘要">📝</button>
        <button onClick={e => { e.stopPropagation(); addChildNode(node.id, { id: `n-${Date.now()}`, title: '新章节', summary: '', children: [] }); }}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '0 4px', opacity: 0.5 }}
          title="添加子节点">+</button>
        <button onClick={e => { e.stopPropagation(); removeNode(node.id); }}
          style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: 14, padding: '0 4px', opacity: 0.5 }}
          title="删除">×</button>
      </div>
      {editingSummary && (
        <div style={{ padding: '2px 4px 4px', marginLeft: depth * 20 + 20 }}>
          <textarea
            value={editSummary}
            onChange={e => setEditSummary(e.target.value)}
            onBlur={handleSaveSummary}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSaveSummary(); if (e.key === 'Escape') setEditingSummary(false); }}
            placeholder="输入摘要…"
            autoFocus
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', minHeight: 40, fontSize: 12, padding: '4px 6px', resize: 'vertical',
              backgroundColor: 'var(--bg-input)', border: '1px solid var(--accent)', color: 'var(--text-primary)',
              borderRadius: 4, outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
      )}
      {!editingSummary && node.summary && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '0 4px 2px', marginLeft: depth * 20 + 20, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.summary}
        </div>
      )}
      {isDragTarget && dropTarget?.position === 'bottom' && (
        <div style={{ height: 2, backgroundColor: 'var(--accent)', marginLeft: depth * 20 }} />
      )}
      {isExpanded && hasChildren && node.children.map(c => <TreeNode key={c.id} node={c} depth={depth + 1} dragId={dragId} dropTarget={dropTarget} onDragStartNode={onDragStartNode} onDragOverNode={onDragOverNode} onDropOnNode={onDropOnNode} onDragLeaveNode={onDragLeaveNode} onDragEndNode={onDragEndNode} />)}
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
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ nodeId: string; position: 'top' | 'bottom' } | null>(null);
  const moveNode = useOutlineStore(s => s.moveNode);

  const handleDragStart = useCallback((e: React.DragEvent, nodeId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', nodeId);
    setDragId(nodeId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDropTarget({ nodeId, position: e.clientY < midY ? 'top' : 'bottom' });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetNodeId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetNodeId) { setDragId(null); setDropTarget(null); return; }

    const currentOutline = useOutlineStore.getState().outline;
    if (!currentOutline) { setDragId(null); setDropTarget(null); return; }

    const findParent = (nodes: OutlineNode[], id: string, parent: string | null = null): string | null | undefined => {
      for (const n of nodes) {
        if (n.id === id) return parent;
        const found = findParent(n.children, id, n.id);
        if (found !== undefined) return found;
      }
      return undefined;
    };

    const targetParentId = findParent(currentOutline.nodes, targetNodeId) ?? null;
    const dropPos = dropTarget?.position ?? 'bottom';
    let targetIndex = 0;
    if (targetParentId === null) {
      for (const n of currentOutline.nodes) {
        if (n.id === targetNodeId) break;
        if (n.id !== sourceId) targetIndex++;
      }
    } else {
      const findNode = (nodes: OutlineNode[]): OutlineNode | null => {
        for (const n of nodes) {
          if (n.id === targetParentId) return n;
          const f = findNode(n.children);
          if (f) return f;
        }
        return null;
      };
      const parent = findNode(currentOutline.nodes);
      if (parent) {
        for (const c of parent.children) {
          if (c.id === targetNodeId) break;
          if (c.id !== sourceId) targetIndex++;
        }
      }
    }
    if (dropPos === 'bottom') targetIndex++;

    moveNode(sourceId, targetParentId, targetIndex);
    setDragId(null);
    setDropTarget(null);
  }, [moveNode]);

  const handleDragLeave = useCallback(() => { setDropTarget(null); }, []);
  const handleDragEnd = useCallback(() => { setDragId(null); setDropTarget(null); }, []);

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

  const getSelectedTemplate = useTemplateStore(s => s.getSelectedTemplate);

  const handleAIGenerate = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) return;
    setGenerating(true); setGenError(''); setGenSuccess('');
    try {
      const template = getSelectedTemplate('outline:generate');
      const sysPrompt = template?.content
        ? template.content.replace('{{prompt}}', prompt)
        : '你是小说架构师。生成结构化大纲。每行一个节点，缩进表层级。格式：\n第一卷：标题\n  第1章：标题 — 概要\n  第2章：标题 — 概要';
      const result = await bridge.generateText(prompt, sysPrompt, workspace?.path, 'outline-generate') as string;
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
      <EmptyState
        variant="page"
        icon={<Icon name="outline" size={48} color="var(--text-muted)" />}
        title={!workspace ? '请先打开工作区' : '请先在左侧选择一个作品'}
      />
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
          <>
            <button onClick={() => setShowAI(true)}
              style={{ padding: '4px 12px', fontSize: 12, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              AI 生成
            </button>
            <TemplateSelector stage="outline:generate" />
          </>
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
      {genError && <div style={{ padding: '8px 16px', backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', fontSize: 13, display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}><span>✗ {genError}</span><button onClick={() => setGenError('')} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: 14 }}>✕</button></div>}
      {genSuccess && <div style={{ padding: '6px 16px', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', fontSize: 13, flexShrink: 0 }}>✓ {genSuccess}</div>}

      {/* Tree */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {outline?.nodes?.map(n => <TreeNode key={n.id} node={n} depth={0} dragId={dragId} dropTarget={dropTarget} onDragStartNode={handleDragStart} onDragOverNode={handleDragOver} onDropOnNode={handleDrop} onDragLeaveNode={handleDragLeave} onDragEndNode={handleDragEnd} />)}
        {(!outline || outline.nodes.length === 0) && !generating && (
          <EmptyState
            variant="inline"
            title='点击"+ 根节点"手动创建大纲，或"AI 生成"自动生成'
          />
        )}
      </div>
    </div>
  );
};
