import React, { useState, useEffect, useRef } from 'react';
import { useOutlineStore } from '../../stores/outline.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { bridge } from '../../services/bridge';
import type { OutlineNode, Outline } from '@astrolabe/shared';

const container: React.CSSProperties = {
  color: '#ccc', fontSize: 13, height: '100%', overflow: 'auto', padding: 4,
};
const nodeRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '3px 4px', cursor: 'pointer', borderRadius: 3, gap: 4,
};
const nodeRowActive: React.CSSProperties = { ...nodeRow, backgroundColor: '#094771' };
const toggle: React.CSSProperties = { width: 16, textAlign: 'center', flexShrink: 0, color: '#888', cursor: 'pointer' };
const addBtn: React.CSSProperties = {
  marginLeft: 'auto', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, padding: '0 4px', visibility: 'hidden' as 'hidden',
};
const nodeRowHover: React.CSSProperties = {  };
const header: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #3c3c3c', gap: 8,
};
const headerBtn: React.CSSProperties = {
  padding: '2px 8px', fontSize: 11, backgroundColor: '#3c3c3c', color: '#ccc', border: 'none', borderRadius: 3, cursor: 'pointer',
};

interface TreeNodeProps {
  node: OutlineNode;
  depth: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth }) => {
  const { selectedNodeId, expandedNodes, selectNode, toggleNode, addChildNode, removeNode, updateNode } = useOutlineStore();
  const isSelected = selectedNodeId === node.id;
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);

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

  return (
    <div>
      <div
        style={isSelected ? nodeRowActive : nodeRow}
        onClick={() => selectNode(node.id)}
        onDoubleClick={handleDoubleClick}
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
            style={{ flex: 1, backgroundColor: '#3c3c3c', border: '1px solid #007acc', color: '#fff', fontSize: 13, padding: '1px 4px', outline: 'none' }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span style={{ flex: 1 }}>{node.title || '未命名'}</span>
        )}
        <button style={{ ...addBtn, visibility: 'visible' } as React.CSSProperties} onClick={handleAddChild} title="添加子节点">+</button>
        <button style={{ ...addBtn, visibility: 'visible' } as React.CSSProperties} onClick={handleDelete} title="删除">×</button>
      </div>
      {isExpanded && hasChildren && node.children.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth + 1} />
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
          <button style={{ ...headerBtn, backgroundColor: '#007acc' }} onClick={() => setShowPromptInput(true)}>
            AI 生成
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="输入故事梗概…"
              style={{
                flex: 1, fontSize: 12, padding: '2px 6px', backgroundColor: '#3c3c3c',
                border: '1px solid #007acc', color: '#fff', borderRadius: 3, outline: 'none',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAIGenerate(); if (e.key === 'Escape') setShowPromptInput(false); }}
              autoFocus
            />
            <button style={{ ...headerBtn, backgroundColor: '#007acc' }} onClick={handleAIGenerate} disabled={generating || !aiPrompt.trim()}>
              {generating ? '…' : '生成'}
            </button>
            <button style={headerBtn} onClick={() => setShowPromptInput(false)}>取消</button>
          </div>
        )}
      </div>

      {/* 状态提示 */}
      {generating && (
        <div style={{ padding: '12px 16px', backgroundColor: '#094771', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          AI 正在生成大纲，请稍候…
        </div>
      )}
      {genError && (
        <div style={{ padding: '10px 16px', backgroundColor: '#5a1d1d', color: '#f44747', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✗ {genError}</span>
          <button onClick={() => setGenError('')} style={{ background: 'none', border: 'none', color: '#f44747', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      )}
      {genSuccess && (
        <div style={{ padding: '8px 16px', backgroundColor: '#1d5a1d', color: '#4ec9b0', fontSize: 13 }}>
          ✓ 大纲生成成功！共 {outline?.nodes?.length ?? 0} 个根节点
        </div>
      )}

      {outline?.nodes?.map((node) => (
        <TreeNode key={node.id} node={node} depth={0} />
      ))}
      {(!outline || outline.nodes.length === 0) && !generating && (
        <div style={{ padding: 20, color: '#666', textAlign: 'center', fontSize: 13 }}>
          点击"+ 根节点"手动创建，或"AI 生成"自动生成大纲
        </div>
      )}
    </div>
  );
};
