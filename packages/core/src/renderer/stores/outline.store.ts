import { create } from 'zustand';
import type { Outline, OutlineNode } from '@astrolabe/shared';

interface OutlineState {
  outline: Outline | null;
  selectedNodeId: string | null;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  setOutline: (outline: Outline) => void;
  selectNode: (id: string | null) => void;
  updateNode: (nodeId: string, updates: Partial<OutlineNode>) => void;
  addChildNode: (parentId: string, node: OutlineNode) => void;
  removeNode: (nodeId: string) => void;
}

let nextId = 1;
const genId = () => `node-${nextId++}`;

export const useOutlineStore = create<OutlineState>((set) => ({
  outline: null,
  selectedNodeId: null,
  expandedNodes: new Set<string>(),

  toggleNode: (id) =>
    set((state) => {
      const next = new Set(state.expandedNodes);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { expandedNodes: next };
    }),

  setOutline: (outline) => set({ outline, expandedNodes: new Set() }),

  selectNode: (id) => set({ selectedNodeId: id }),

  updateNode: (nodeId, updates) =>
    set((state) => {
      if (!state.outline) return state;
      const nodes = [...state.outline.nodes];
      const update = (list: OutlineNode[]): boolean => {
        for (const n of list) {
          if (n.id === nodeId) { Object.assign(n, updates); return true; }
          if (n.children.length > 0 && update(n.children)) return true;
        }
        return false;
      };
      update(nodes);
      return { outline: { ...state.outline, nodes } };
    }),

  addChildNode: (parentId, node) =>
    set((state) => {
      if (!state.outline) return state;
      const nodes = [...state.outline.nodes];
      const add = (list: OutlineNode[]): boolean => {
        for (const n of list) {
          if (n.id === parentId) { n.children.push(node); return true; }
          if (n.children.length > 0 && add(n.children)) return true;
        }
        return false;
      };
      add(nodes);
      const next = new Set(state.expandedNodes);
      next.add(parentId);
      return { outline: { ...state.outline, nodes }, expandedNodes: next };
    }),

  removeNode: (nodeId) =>
    set((state) => {
      if (!state.outline) return state;
      const remove = (list: OutlineNode[]): OutlineNode[] =>
        list.filter((n) => n.id !== nodeId).map((n) => ({ ...n, children: remove(n.children) }));
      return {
        outline: { ...state.outline, nodes: remove([...state.outline.nodes]) },
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      };
    }),
}));
