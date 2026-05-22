import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useChapterStore } from '../../stores/chapter.store';
import { useOutlineStore } from '../../stores/outline.store';
import { bridge } from '../../services/bridge';
import type { OutlineNode } from '@astrolabe/shared';

const container: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#1e1e1e',
};
const toolbar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #3c3c3c', gap: 8,
};
const title: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, color: '#fff',
};
const info: React.CSSProperties = {
  fontSize: 12, color: '#999',
};
const textarea: React.CSSProperties = {
  flex: 1, padding: 16, backgroundColor: '#1e1e1e', color: '#ccc', border: 'none', outline: 'none', resize: 'none', fontSize: 14, fontFamily: '"Microsoft YaHei", "Noto Sans SC", sans-serif', lineHeight: 1.8,
};
const btn: React.CSSProperties = {
  padding: '4px 12px', fontSize: 12, backgroundColor: '#007acc', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer',
};
const btnDisabled: React.CSSProperties = { ...btn, opacity: 0.5, cursor: 'not-allowed' };

interface Props {
  projectPath?: string;
}

export const ChapterEditor: React.FC<Props> = () => {
  const { currentChapter, content, wordCount, isDirty, setContent } = useChapterStore();
  const selectedNodeId = useOutlineStore((s) => s.selectedNodeId);
  const outline = useOutlineStore((s) => s.outline);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  const selectedNode = outline?.nodes ? findNode(outline.nodes, selectedNodeId) : null;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, [setContent]);

  // Keyboard shortcut: Tab for indent
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; }, 0);
    }
  }, [content, setContent]);

  if (!currentChapter && !selectedNode) {
    return (
      <div style={{ ...container, alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 14 }}>
        在大纲中选择一个节点开始写作
      </div>
    );
  }

  const displayTitle = currentChapter?.title || selectedNode?.title || '未命名';

  return (
    <div style={container}>
      <div style={toolbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={title}>{displayTitle}</span>
          {isDirty && <span style={{ fontSize: 11, color: '#d4a72c' }}>● 未保存</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={info}>{wordCount} 字</span>
          <button
            style={aiGenerating ? btnDisabled : btn}
            disabled={aiGenerating}
            onClick={async () => {
              setAiGenerating(true);
              const startContent = useChapterStore.getState().content;
              let streamedText = '';

              // 先注册监听，再发起流式调用
              const unsubChunk = bridge.onAIChunk((text: string) => {
                streamedText += text;
                setContent(startContent + streamedText);
              });

              const unsubDone = bridge.onAIDone((_fullText: string) => {
                unsubChunk();
                unsubDone();
                unsubError();
                setAiGenerating(false);
              });

              const unsubError = bridge.onAIError((err: string) => {
                unsubChunk();
                unsubDone();
                unsubError();
                setAiGenerating(false);
                // 保留部分已生成的内容，不丢失
                if (streamedText) {
                  setContent(startContent + streamedText + '\n\n[AI 生成中断: ' + err + ']');
                }
              });

              try {
                const systemPrompt = `你是一位专业小说作家。请根据以下大纲节点续写章节内容。保持风格一致，适度展开。\n\n大纲节点：${selectedNode?.title}\n概要：${selectedNode?.summary || '无'}`;

                await bridge.generateTextStream(
                  startContent ? `请续写以下内容：\n\n${startContent.slice(-500)}` : `请撰写章节：${selectedNode?.title}`,
                  systemPrompt
                );
              } catch (_err) {
                unsubChunk();
                unsubDone();
                unsubError();
                setAiGenerating(false);
              }
            }}
          >
            {aiGenerating ? 'AI 撰写中...' : 'AI 续写'}
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        style={textarea}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="开始写作..."
        spellCheck={false}
      />
    </div>
  );
};

function findNode(nodes: OutlineNode[], id: string | null): OutlineNode | null {
  if (!id) return null;
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children.length > 0) {
      const found = findNode(n.children, id);
      if (found) return found;
    }
  }
  return null;
}
