import React, { useState } from 'react';
import { useOutlineStore } from '../../stores/outline.store';
import { bridge } from '../../services/bridge';
import type { OutlineNode } from '@astrolabe/shared';

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
  const { outline, setOutline } = useOutlineStore();
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleAddRoot = () => {
    if (!outline) {
      setOutline({
        id: 'outline-1',
        title: '',
        premise: '',
        genre: [],
        nodes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [],
      } as any);
    }
    const { addChildNode } = useOutlineStore.getState();
    // Create a root-level node
    if (outline && outline.nodes.length === 0) {
      const newOutline = { ...outline };
      // Add to nodes directly
    }
  };

  return (
    <div style={container}>
      <div style={header}>
        <span style={{ fontWeight: 600, fontSize: 12 }}>大纲</span>
        <button style={headerBtn} onClick={() => {
          // Create new outline if none exists
          if (!outline?.nodes.length) {
            const { setOutline, addChildNode } = useOutlineStore.getState();
            if (!outline) {
              setOutline({
                id: 'outline-1', title: '', premise: '', genre: [], nodes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), history: [],
              } as any);
            }
          }
        }}>+ 根节点</button>
        <button style={{ ...headerBtn, backgroundColor: '#007acc' }} onClick={async () => {
          if (!aiPrompt) {
            const p = prompt('请输入故事梗概或创作意图：');
            if (!p) return;
            setAiPrompt(p);
          }
          setGenerating(true);
          try {
            const systemPrompt = '你是一位经验丰富的小说架构师。根据创作意图生成结构化大纲。输出格式：每行一个节点，用缩进表示层级。例：\n第一卷：标题\n  第1章：标题 — 概要\n  第2章：标题 — 概要';
            const result = await bridge.generateText(aiPrompt || '生成一个故事大纲', systemPrompt) as string;
            // Parse AI output into nodes
            const lines = result.split('\n').filter(l => l.trim());
            const nodes: OutlineNode[] = [];
            const stack: { node: OutlineNode; depth: number }[] = [];
            for (const line of lines) {
              const indent = line.search(/\S/);
              const depth = indent < 0 ? 0 : Math.floor(indent / 2);
              const text = line.trim();
              const newNode: OutlineNode = { id: `node-${Date.now()}-${nodes.length}`, title: text, summary: '', children: [] };
              while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
              if (stack.length === 0) {
                nodes.push(newNode);
              } else {
                stack[stack.length - 1].node.children.push(newNode);
              }
              stack.push({ node: newNode, depth });
            }
            const { setOutline } = useOutlineStore.getState();
            setOutline({
              id: 'outline-1', title: '', premise: aiPrompt, genre: [], nodes, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), history: [],
            } as any);
          } catch (err) {
            console.error('AI generation failed:', err);
          } finally {
            setGenerating(false);
          }
        }} disabled={generating}>
          {generating ? '生成中...' : 'AI 生成'}
        </button>
      </div>
      {outline?.nodes?.map((node) => (
        <TreeNode key={node.id} node={node} depth={0} />
      ))}
      {(!outline || outline.nodes.length === 0) && (
        <div style={{ padding: 20, color: '#666', textAlign: 'center', fontSize: 13 }}>
          暂无大纲节点，点击"AI 生成"或"+ 根节点"开始
        </div>
      )}
    </div>
  );
};
