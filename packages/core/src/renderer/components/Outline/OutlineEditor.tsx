import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOutlineStore } from '../../stores/outline.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { bridge } from '../../services/bridge';
import type { OutlineNode, Outline } from '@astrolabe/shared';

const container: React.CSSProperties = {
  color: 'var(--text-primary)', fontSize: 13, height: '100%', overflow: 'auto', padding: 4,
};
const nodeRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '3px 4px', cursor: 'pointer', borderRadius: 3, gap: 4,
};
const nodeRowActive: React.CSSProperties = { ...nodeRow, backgroundColor: 'var(--accent-blue-dim)' };
const toggle: React.CSSProperties = { width: 16, textAlign: 'center', flexShrink: 0, color: 'var(--text-tertiary)', cursor: 'pointer' };
const addBtn: React.CSSProperties = {
  marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 14, padding: '0 4px', visibility: 'hidden' as 'hidden',
};
const nodeRowDragOver: React.CSSProperties = { ...nodeRow, outline: '2px solid var(--accent-blue)', outlineOffset: -2 };
const nodeRowActiveDragOver: React.CSSProperties = { ...nodeRowActive, outline: '2px solid var(--accent-blue)', outlineOffset: -2 };
const header: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid var(--bg-control)', gap: 8,
};
const headerBtn: React.CSSProperties = {
  padding: '2px 8px', fontSize: 11, backgroundColor: 'var(--bg-control)', color: 'var(--text-primary)', border: 'none', borderRadius: 3, cursor: 'pointer',
};

interface TreeNodeProps {
  node: OutlineNode;
  depth: number;
  dragId: string | null;
  dropTarget: { nodeId: string; position: 'top' | 'bottom' } | null;
  onDragStartNode: (e: React.DragEvent, nodeId: string) => void;
  onDragOverNode: (e: React.DragEvent, nodeId: string) => void;
  onDropOnNode: (e: React.DragEvent, nodeId: string) => void;
  onDragLeaveNode: () => void;
  onDragEndNode: () => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth, dragId, dropTarget, onDragStartNode, onDragOverNode, onDropOnNode, onDragLeaveNode, onDragEndNode }) => {
  const { selectedNodeId, expandedNodes, selectNode, toggleNode, addChildNode, removeNode, updateNode } = useOutlineStore();
  const isSelected = selectedNodeId === node.id;
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [editingSummary, setEditingSummary] = useState(false);
  const [editSummary, setEditSummary] = useState(node.summary || '');

  const isDragTarget = dropTarget?.nodeId === node.id;
  const rowStyle = isDragTarget
    ? (isSelected ? nodeRowActiveDragOver : nodeRowDragOver)
    : (isSelected ? nodeRowActive : nodeRow);

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = `node-${Date.now()}`;
    addChildNode(node.id, {
      id: newId,
      title: '新章节',
      summary: '',
      children: [],
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeNode(node.id);
  };

  const handleDoubleClick = () => {
    setEditing(true);
    setEditTitle(node.title);
  };

  const handleSaveTitle = () => {
    if (editTitle.trim()) {
      updateNode(node.id, { title: editTitle.trim() });
    }
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
        <div style={{ height: 2, backgroundColor: 'var(--accent-blue)', marginLeft: depth * 16 }} />
      )}
      <div
        style={rowStyle}
        onClick={() => selectNode(node.id)}
        onDoubleClick={handleDoubleClick}
        draggable
        onDragStart={(e) => onDragStartNode(e, node.id)}
        onDragOver={(e) => onDragOverNode(e, node.id)}
        onDrop={(e) => onDropOnNode(e, node.id)}
        onDragLeave={onDragLeaveNode}
        onDragEnd={onDragEndNode}
      >
        <span style={{ paddingLeft: depth * 16 }} />
        {hasChildren ? (
          <span style={toggle} onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}>
            {isExpanded ? '▾' : '▸'}
          </span>
        ) : (
          <span style={toggle} />
        )}
        {editing ? (
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditing(false); }}
            style={{ flex: 1, backgroundColor: 'var(--bg-control)', border: '1px solid var(--accent-blue)', color: 'var(--text-inverse)', fontSize: 13, padding: '1px 4px', outline: 'none' }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span style={{ flex: 1 }}>{node.title || '未命名'}</span>
        )}
        <button style={{ ...addBtn, visibility: 'visible' } as React.CSSProperties} onClick={handleToggleSummary} title="编辑摘要">
          <span style={{ fontSize: 12 }}>📝</span>
        </button>
        <button style={{ ...addBtn, visibility: 'visible' } as React.CSSProperties} onClick={handleAddChild} title="添加子节点">+</button>
        <button style={{ ...addBtn, visibility: 'visible' } as React.CSSProperties} onClick={handleDelete} title="删除">×</button>
      </div>
      {editingSummary && (
        <div style={{ padding: '2px 4px 4px', marginLeft: depth * 16 + 20 }}>
          <textarea
            value={editSummary}
            onChange={(e) => setEditSummary(e.target.value)}
            onBlur={handleSaveSummary}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleSaveSummary(); if (e.key === 'Escape') setEditingSummary(false); }}
            placeholder="输入摘要…"
            autoFocus
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', minHeight: 40, fontSize: 11, padding: '4px 6px', resize: 'vertical',
              backgroundColor: 'var(--bg-control)', border: '1px solid var(--accent-blue)', color: 'var(--text-primary)',
              borderRadius: 3, outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
      )}
      {!editingSummary && node.summary && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 4px 2px', marginLeft: depth * 16 + 20, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.summary}
        </div>
      )}
      {isDragTarget && dropTarget?.position === 'bottom' && (
        <div style={{ height: 2, backgroundColor: 'var(--accent-blue)', marginLeft: depth * 16 }} />
      )}
      {isExpanded && hasChildren && node.children.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth + 1} dragId={dragId} dropTarget={dropTarget} onDragStartNode={onDragStartNode} onDragOverNode={onDragOverNode} onDropOnNode={onDropOnNode} onDragLeaveNode={onDragLeaveNode} onDragEndNode={onDragEndNode} />
      ))}
    </div>
  );
};

interface Props {
  projectPath?: string;
}

export const OutlineEditor: React.FC<Props> = ({ projectPath }) => {
  const outline = useOutlineStore((s) => s.outline);
  const setOutline = useOutlineStore((s) => s.setOutline);
  const getProjectPath = useWorkspaceStore((s) => s.getProjectPath);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [genSuccess, setGenSuccess] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ nodeId: string; position: 'top' | 'bottom' } | null>(null);
  const moveNode = useOutlineStore((s) => s.moveNode);

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

    const findParent = (nodes: OutlineNode[], id: string, parent: string | null = null): string | null => {
      for (const n of nodes) {
        if (n.id === id) return parent;
        const found = findParent(n.children, id, n.id);
        if (found !== undefined) return found;
      }
      return undefined as any;
    };

    const targetParentId = findParent(currentOutline.nodes, targetNodeId);
    const dropPos = dropTarget?.position ?? 'bottom';
    let targetIndex = 0;
    if (targetParentId === null) {
      for (const n of currentOutline.nodes) {
        if (n.id === targetNodeId) break;
        if (n.id !== sourceId) targetIndex++;
      }
    } else {
      const parent = (() => { const find = (nodes: OutlineNode[]): OutlineNode | null => { for (const n of nodes) { if (n.id === targetParentId) return n; const f = find(n.children); if (f) return f; } return null; }; return find(currentOutline.nodes); })();
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

  // Auto-save outline when it changes (debounced)
  const outlineRef = useRef(outline);
  outlineRef.current = outline;
  useEffect(() => {
    const timer = setTimeout(() => {
      const current = outlineRef.current;
      const projectPath = getProjectPath();
      if (!current || !current.nodes.length || !projectPath) return;
      const outlineData: Outline = {
        id: current.id,
        title: current.title || '',
        premise: current.premise || '',
        genre: current.genre || [],
        nodes: current.nodes,
        createdAt: current.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: current.history || [],
      };
      bridge.pipelineSaveOutline(projectPath, outlineData).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [outline]);

  const ensureOutline = () => {
    const current = useOutlineStore.getState().outline;
    if (!current) {
      useOutlineStore.getState().setOutline({
        id: 'outline-1', title: '', premise: '', genre: [],
        nodes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        history: [],
      } as any);
    }
  };

  const handleAddRoot = () => {
    ensureOutline();
    const nodeId = `node-${Date.now()}`;
    const current = useOutlineStore.getState().outline;
    if (current) {
      const nodes = [...current.nodes, {
        id: nodeId,
        title: '新卷',
        summary: '',
        children: [],
      }];
      useOutlineStore.getState().setOutline({ ...current, nodes, updatedAt: new Date().toISOString() } as any);
    }
  };

  const handleAIGenerate = async () => {
    const promptText = aiPrompt.trim();
    if (!promptText) return;
    setGenerating(true);
    setGenError('');
    setGenSuccess(false);
    try {
      const systemPrompt = '你是一位经验丰富的小说架构师。根据创作意图生成结构化大纲。输出格式：每行一个节点，用缩进表示层级。例如：\n第一卷：标题\n  第1章：标题 — 概要\n  第2章：标题 — 概要';
      const result = await bridge.generateText(promptText, systemPrompt) as string;
      if (!result || result.trim().length === 0) {
        throw new Error('AI 返回了空内容，请重试');
      }
      const lines = result.split('\n').filter(l => l.trim());
      const nodes: OutlineNode[] = [];
      const stack: { node: OutlineNode; depth: number }[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const indent = line.search(/\S/);
        const depth = indent < 0 ? 0 : Math.floor(indent / 2);
        const text = line.trim();
        const newNode: OutlineNode = { id: `node-${Date.now()}-${i}`, title: text, summary: '', children: [] };
        while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
        if (stack.length === 0) {
          nodes.push(newNode);
        } else {
          stack[stack.length - 1].node.children.push(newNode);
        }
        stack.push({ node: newNode, depth });
      }
      setOutline({
        id: 'outline-1', title: '', premise: promptText, genre: [], nodes,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), history: [],
      } as any);
      setShowPromptInput(false);
      setAiPrompt('');
      setGenSuccess(true);
      setTimeout(() => setGenSuccess(false), 3000);
    } catch (err) {
      setGenError((err as Error).message || '生成失败，请检查 API Key 和网络连接');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={container}>
      <div style={header}>
        <span style={{ fontWeight: 600, fontSize: 12 }}>大纲</span>
        <button style={headerBtn} onClick={handleAddRoot}>+ 根节点</button>
        {!showPromptInput ? (
          <button style={{ ...headerBtn, backgroundColor: 'var(--accent-blue)' }} onClick={() => setShowPromptInput(true)}>
            AI 生成
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="输入故事梗概…"
              style={{
                flex: 1, fontSize: 12, padding: '2px 6px', backgroundColor: 'var(--bg-control)',
                border: '1px solid var(--accent-blue)', color: 'var(--text-inverse)', borderRadius: 3, outline: 'none',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAIGenerate(); if (e.key === 'Escape') setShowPromptInput(false); }}
              autoFocus
            />
            <button style={{ ...headerBtn, backgroundColor: 'var(--accent-blue)' }} onClick={handleAIGenerate} disabled={generating || !aiPrompt.trim()}>
              {generating ? '…' : '生成'}
            </button>
            <button style={headerBtn} onClick={() => setShowPromptInput(false)}>取消</button>
          </div>
        )}
      </div>

      {/* 状态提示 */}
      {generating && (
        <div style={{ padding: '12px 16px', backgroundColor: 'var(--accent-blue-dim)', color: 'var(--text-inverse)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid var(--text-inverse)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          AI 正在生成大纲，请稍候…
        </div>
      )}
      {genError && (
        <div style={{ padding: '10px 16px', backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error-text)', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✗ {genError}</span>
          <button onClick={() => setGenError('')} style={{ background: 'none', border: 'none', color: 'var(--color-error-text)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      )}
      {genSuccess && (
        <div style={{ padding: '8px 16px', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success-text)', fontSize: 13 }}>
          ✓ 大纲生成成功！共 {outline?.nodes?.length ?? 0} 个根节点
        </div>
      )}

      {outline?.nodes?.map((node) => (
        <TreeNode key={node.id} node={node} depth={0} dragId={dragId} dropTarget={dropTarget} onDragStartNode={handleDragStart} onDragOverNode={handleDragOver} onDropOnNode={handleDrop} onDragLeaveNode={handleDragLeave} onDragEndNode={handleDragEnd} />
      ))}
      {(!outline || outline.nodes.length === 0) && !generating && (
        <div style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>
          点击"+ 根节点"手动创建，或"AI 生成"自动生成大纲
        </div>
      )}
    </div>
  );
};
