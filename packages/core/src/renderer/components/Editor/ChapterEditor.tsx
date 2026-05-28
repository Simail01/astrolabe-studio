import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useChapterStore } from '../../stores/chapter.store';
import { useOutlineStore } from '../../stores/outline.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { bridge } from '../../services/bridge';
import { useWikiStore } from '../../stores/wiki.store';
import { useLayoutStore } from '../../stores/layout.store';
import type { OutlineNode, Chapter, ChapterStatus, WikiEntry, WikiSuggestion } from '@astrolabe/shared';
import { toast } from '../../stores/toast.store';
import { EmptyState } from '../ui/EmptyState';

const container: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--editor-bg)',
};
const toolbar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid var(--border-default)', gap: 8,
};
const title: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, color: 'var(--text-inverse)',
};
const info: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-secondary)',
};
const textarea: React.CSSProperties = {
  flex: 1, padding: 16, backgroundColor: 'var(--editor-bg)', color: 'var(--text-primary)', border: 'none', outline: 'none', resize: 'none', fontSize: 14, fontFamily: '"Microsoft YaHei", "Noto Sans SC", sans-serif', lineHeight: 1.8,
};
const btn: React.CSSProperties = {
  padding: '4px 12px', fontSize: 12, backgroundColor: 'var(--accent-blue)', color: 'var(--text-inverse)', border: 'none', borderRadius: 3, cursor: 'pointer',
};
const btnDisabled: React.CSSProperties = { ...btn, opacity: 0.5, cursor: 'not-allowed' };

const STATUS_LABELS: Record<ChapterStatus, string> = {
  draft: '草稿',
  writing: '写作中',
  revision: '待修订',
  final: '已定稿',
};

const STATUS_COLORS: Record<ChapterStatus, string> = {
  draft: 'var(--text-secondary)',
  writing: 'var(--accent-blue)',
  revision: 'var(--color-warning-text)',
  final: 'var(--color-success-text)',
};

const statusBtnBase: React.CSSProperties = {
  padding: '2px 8px', fontSize: 11, border: '1px solid var(--border-default)', borderRadius: 3, cursor: 'pointer', backgroundColor: 'transparent',
};

interface Props {
  projectPath?: string;
}

export const ChapterEditor: React.FC<Props> = () => {
  const { currentChapter, content, wordCount, isDirty, setContent, updateStatus } = useChapterStore();
  const selectedNodeId = useOutlineStore((s) => s.selectedNodeId);
  const outline = useOutlineStore((s) => s.outline);
  const getProjectPath = useWorkspaceStore((s) => s.getProjectPath);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');

  const selectedNode = outline?.nodes ? findNode(outline.nodes, selectedNodeId) : null;

  // Load chapter content when selected node changes
  useEffect(() => {
    if (!selectedNodeId) {
      useChapterStore.getState().setChapter(null);
      return;
    }
    const projectPath = getProjectPath();
    if (!projectPath) return;
    bridge.pipelineGetChapter(projectPath, selectedNodeId).then((data) => {
      if (data) {
        useChapterStore.getState().setChapter(data as Chapter);
      } else {
        useChapterStore.getState().setChapter({
          id: selectedNodeId,
          title: selectedNode?.title || '未命名',
          content: '',
          wordCount: 0,
          order: 0,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }).catch((e) => {
      console.error('Load chapter failed:', e);
      toast.error(e.message || '加载章节失败');
      useChapterStore.getState().setChapter(null);
    });
  }, [selectedNodeId]);

  // Save function — reads all state from store at call time, not closure
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const doSave = useCallback(async () => {
    const projectPath = getProjectPath();
    const store = useChapterStore.getState();
    const nodeId = useOutlineStore.getState().selectedNodeId;
    const node = findNode(useOutlineStore.getState().outline?.nodes || [], nodeId);
    if (!projectPath || !nodeId || !store.isDirty) return;
    setSaveStatus('saving');
    try {
      const ch: Chapter = {
        id: nodeId,
        title: node?.title || '未命名',
        content: store.content,
        wordCount: store.wordCount,
        order: 0,
        status: store.currentChapter?.status || 'draft',
        createdAt: store.currentChapter?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await bridge.pipelineSaveChapter(projectPath, ch);
      useChapterStore.getState().markClean();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e: any) {
      console.error('Save failed:', e);
      toast.error(e.message || '保存失败');
      setSaveStatus('idle');
    }
  }, [getProjectPath]);

  // Auto-save: debounce 2s after content change
  useEffect(() => {
    if (!isDirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(doSave, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [content, isDirty, doSave]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, [setContent]);

  // Keyboard shortcut: Ctrl+S save, Tab indent
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      doSave();
      return;
    }
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
  }, [content, setContent, doSave]);

  if (!currentChapter && !selectedNode) {
    return (
      <EmptyState variant="inline" title="在大纲中选择一个节点开始写作" />
    );
  }

  const displayTitle = currentChapter?.title || selectedNode?.title || '未命名';

  return (
    <div style={container}>
      <div style={toolbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={title}>{displayTitle}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {(Object.keys(STATUS_LABELS) as ChapterStatus[]).map((s) => (
              <button
                key={s}
                style={{
                  ...statusBtnBase,
                  color: currentChapter?.status === s ? STATUS_COLORS[s] : 'var(--text-secondary)',
                  borderColor: currentChapter?.status === s ? STATUS_COLORS[s] : 'var(--border-default)',
                  fontWeight: currentChapter?.status === s ? 600 : 400,
                }}
                onClick={() => {
                  updateStatus(s);
                  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                  saveTimerRef.current = setTimeout(doSave, 500);
                }}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          {saveStatus === 'saving' && <span style={{ fontSize: 11, color: 'var(--color-warning-text)' }}>◉ 保存中…</span>}
          {saveStatus === 'saved' && <span style={{ fontSize: 11, color: 'var(--color-success-text)' }}>✓ 已保存</span>}
          {saveStatus === 'idle' && isDirty && <span style={{ fontSize: 11, color: 'var(--color-unsaved)' }}>● 未保存</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={info}>{wordCount} 字</span>
          <button
            style={{ ...btn, backgroundColor: isDirty ? 'var(--color-unsaved)' : 'var(--bg-hover)' }}
            onClick={() => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); doSave(); }}
            title="保存 (Ctrl+S)"
          >
            保存
          </button>
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
                // Assemble Wiki context
                const wikiEntries = useWikiStore.getState().entries;
                const nodeTitle = selectedNode?.title || '';
                const relevantWiki = wikiEntries.filter((e: WikiEntry) =>
                  e.title.includes(nodeTitle) ||
                  nodeTitle.includes(e.title) ||
                  e.aliases.some((a: string) => nodeTitle.includes(a))
                );
                const wikiContext = relevantWiki.length > 0
                  ? '\n\n## Wiki 知识库参考\n' + relevantWiki.map((e: WikiEntry) =>
                      `【${e.title}】(${e.type})\n${e.summary || e.content || ''}`
                    ).join('\n\n')
                  : '';

                const systemPrompt = `你是一位专业小说作家。请根据以下大纲节点续写章节内容。保持风格一致，适度展开。\n\n大纲节点：${selectedNode?.title}\n概要：${selectedNode?.summary || '无'}${wikiContext}`;

                await bridge.generateTextStream(
                  startContent ? `请续写以下内容：\n\n${startContent.slice(-500)}` : `请撰写章节：${selectedNode?.title}`,
                  systemPrompt,
                  workspace?.path,
                  startContent ? 'chapter:continue' : 'chapter:write'
                );
              } catch (err: any) {
                console.error('AI generation failed:', err);
                toast.error(err.message || 'AI 生成失败');
                unsubChunk();
                unsubDone();
                unsubError();
                setAiGenerating(false);
              }
            }}
          >
            {aiGenerating ? 'AI 撰写中...' : 'AI 续写'}
          </button>
          <button
            style={{ ...btn, backgroundColor: extracting ? 'var(--bg-hover)' : 'var(--accent-blue-dark)' }}
            disabled={!!extracting || !selectedNodeId}
            onClick={async () => {
              setExtracting(true);
              try {
                const projectPath = getProjectPath();
                if (!projectPath) return;
                const store = useChapterStore.getState();
                const suggestions = await bridge.wikiExtract(
                  projectPath,
                  store.content,
                  selectedNode?.title || '未命名'
                ) as WikiSuggestion[];
                if (suggestions && suggestions.length > 0) {
                  useWikiStore.getState().setSuggestions(suggestions);
                  useLayoutStore.getState().openRightPanel();
                }
              } catch (e: any) {
                console.error('Wiki extraction failed:', e);
                toast.error(e.message || 'Wiki 提取失败');
              } finally {
                setExtracting(false);
              }
            }}
          >
            Wiki 提取
          </button>
          <button
            style={{ ...btn, backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
            onClick={async () => {
              const projectPath = getProjectPath();
              if (!projectPath || !selectedNodeId) return;
              try {
                await bridge.exportChapter(projectPath, selectedNodeId, 'txt');
              } catch (e: any) {
                if (e.message !== '用户取消导出') {
                  toast.error(e.message || '导出失败');
                }
              }
            }}
          >
            导出
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
