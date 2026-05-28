import React, { useState } from 'react';
import { useChapterStore } from '../../stores/chapter.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useWikiStore } from '../../stores/wiki.store';
import { useTemplateStore } from '../../stores/template.store';
import { bridge } from '../../services/bridge';
import { toast } from '../../stores/toast.store';
import { Icon } from '../ui/Icon';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';

type AIOperation = 'continue' | 'rewrite' | 'polish' | 'expand' | 'compress' | 'enhance' | 'style';

const operations: { key: AIOperation; icon: React.ReactNode; label: string }[] = [
  { key: 'continue', icon: <Icon name="edit" size={16} />, label: '续写' },
  { key: 'rewrite', icon: <Icon name="refresh" size={16} />, label: '改写' },
  { key: 'polish', icon: <Icon name="sparkle" size={16} />, label: '润色' },
  { key: 'expand', icon: <Icon name="book" size={16} />, label: '扩写' },
  { key: 'compress', icon: <Icon name="writing" size={16} />, label: '精简' },
  { key: 'enhance', icon: <Icon name="fire" size={16} />, label: '增强情感' },
  { key: 'style', icon: <Icon name="refresh" size={16} />, label: '风格转换' },
];

export const AIBubble: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [operating, setOperating] = useState<AIOperation | null>(null);
  const [showStyleInput, setShowStyleInput] = useState(false);
  const [styleTarget, setStyleTarget] = useState('');
  const [confirmOp, setConfirmOp] = useState<AIOperation | null>(null);
  const [pendingSelection, setPendingSelection] = useState<SelectionInfo | null>(null);
  const content = useChapterStore((s) => s.content);
  const setContent = useChapterStore((s) => s.setContent);
  const getProjectPath = useWorkspaceStore((s) => s.getProjectPath);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const entries = useWikiStore((s) => s.entries);
  const getSelectedTemplate = useTemplateStore((s) => s.getSelectedTemplate);

  const buildWikiContext = (): string => {
    if (entries.length === 0) return '';
    const refs = entries.slice(0, 10).map(e => `${e.title}: ${e.summary}`).join('\n');
    return `\n\n## 参考设定\n${refs}`;
  };

  interface SelectionInfo { text: string; start: number; end: number }

  /** 获取编辑器选中文本，优先读取 textarea 选区 */
  const getSelection = (): SelectionInfo => {
    const el = document.activeElement;
    if (el instanceof HTMLTextAreaElement) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start !== end) {
        return { text: el.value.substring(start, end).trim(), start, end };
      }
    }
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      return { text: sel.toString().trim(), start: -1, end: -1 };
    }
    return { text: '', start: -1, end: -1 };
  };

  /** 精确替换选区文本 */
  const replaceContent = (sel: SelectionInfo, result: string) => {
    if (sel.start >= 0) {
      setContent(content.slice(0, sel.start) + result + content.slice(sel.end));
    } else if (sel.text) {
      setContent(content.replace(sel.text, result));
    } else {
      setContent(result);
    }
  };

  /** 获取模板 prompt，无模板时使用硬编码 fallback */
  const getPrompt = (op: AIOperation, text: string, targetStyle?: string): string => {
    const stageMap: Record<string, string> = {
      rewrite: 'writing:rewrite',
      polish: 'writing:polish',
      expand: 'writing:expand',
      compress: 'writing:compress',
      enhance: 'writing:enhance',
      style: 'writing:style',
    };
    const stage = stageMap[op];
    if (stage) {
      const template = getSelectedTemplate(stage);
      if (template?.content) {
        return template.content
          .replace(/\{\{content\}\}/g, text)
          .replace(/\{\{text\}\}/g, text)
          .replace(/\{\{targetStyle\}\}/g, targetStyle || '');
      }
    }
    const fallbackMap: Record<string, string> = {
      rewrite: '请对以下段落进行改写，保持原意但改善表达。保持原文风格基调，直接输出改写后的文本。',
      polish: '请对以下段落进行润色，优化遣词造句，增强画面感和氛围感，不过度修饰。直接输出润色后的文本。',
      expand: '请对以下段落进行扩写，补充环境描写、心理活动、感官细节，扩写幅度约 1.5-2 倍。直接输出扩写后的文本。',
      compress: '请对以下段落进行压缩精简，删除冗余，保留核心情节，压缩至原文 50-70%。直接输出压缩后的文本。',
      enhance: '请增强以下段落的情感表现力，强化人物情绪和心理描写，增强场景氛围。直接输出增强后的文本。',
    };
    return (fallbackMap[op] || '') + '\n\n' + text;
  };

  const executeOperation = async (op: AIOperation, sel: SelectionInfo) => {
    const projectPath = getProjectPath();
    if (!projectPath) { toast.error('请先选择作品'); return; }

    if (op === 'continue') {
      if (!content.trim()) { toast.warning('当前章节为空，请先写一些内容'); return; }
      setOperating(op);
      setOpen(false);
      try {
        const wikiCtx = buildWikiContext();
        const sysPrompt = `你是一位资深小说家。请根据前文内容自然续写，保持风格一致。${wikiCtx}`;
        const startContent = content;
        let streamedText = '';
        const unsubChunk = bridge.onAIChunk((t: string) => { streamedText += t; setContent(startContent + streamedText); });
        const unsubDone = bridge.onAIDone(() => { unsubChunk(); unsubDone(); setOperating(null); toast.success('续写完成'); });
        const unsubError = bridge.onAIError((err: string) => { unsubChunk(); unsubDone(); unsubError(); setOperating(null); if (streamedText) setContent(startContent + streamedText); toast.error('续写中断: ' + err); });
        await bridge.generateTextStream(`续写: ${startContent.slice(-500)}`, sysPrompt, workspace?.path, 'writing-continue');
      } catch (e) {
        toast.error('续写失败: ' + (e as Error).message);
        setOperating(null);
      }
      return;
    }

    if (op === 'style') {
      if (!content.trim()) { toast.warning('当前章节为空'); return; }
      setPendingSelection(sel);
      setOpen(false);
      setShowStyleInput(true);
      return;
    }

    const text = sel.text || content;
    if (!text.trim()) { toast.warning('当前章节为空'); return; }

    // 无选区时弹确认框
    if (!sel.text) {
      setConfirmOp(op);
      setOpen(false);
      return;
    }

    setOperating(op);
    setOpen(false);
    try {
      const wikiCtx = buildWikiContext();
      const sysPrompt = `你是一位资深文学编辑。${wikiCtx}`;
      const prompt = getPrompt(op, text);
      const result = await bridge.generateText(prompt, sysPrompt, workspace?.path, `writing-${op}`);
      if (result) {
        replaceContent(sel, result);
        toast.success(`${operations.find(o => o.key === op)?.label}完成`);
      }
    } catch (e) {
      toast.error('AI 操作失败: ' + (e as Error).message);
    } finally {
      setOperating(null);
    }
  };

  const handleOperation = (op: AIOperation) => {
    const sel = getSelection();
    executeOperation(op, sel);
  };

  const handleConfirm = async () => {
    const op = confirmOp;
    if (!op) return;
    setConfirmOp(null);
    setOperating(op);
    try {
      const wikiCtx = buildWikiContext();
      const sysPrompt = op === 'style' ? '你是一位资深文学编辑。' : `你是一位资深文学编辑。${wikiCtx}`;
      const prompt = op === 'style' ? getPrompt('style', content, styleTarget.trim()) : getPrompt(op, content);
      const result = await bridge.generateText(prompt, sysPrompt, workspace?.path, `writing-${op}`);
      if (result) {
        replaceContent({ text: '', start: -1, end: -1 }, result);
        toast.success(op === 'style' ? '风格转换完成' : `${operations.find(o => o.key === op)?.label}完成`);
      }
    } catch (e) {
      toast.error('AI 操作失败: ' + (e as Error).message);
    } finally {
      setOperating(null);
      setStyleTarget('');
    }
  };

  const handleStyleConvert = async () => {
    const target = styleTarget.trim();
    if (!target) { toast.warning('请输入目标风格'); return; }
    const sel = pendingSelection || { text: '', start: -1, end: -1 };
    setPendingSelection(null);
    setShowStyleInput(false);
    // 无选区时弹确认框
    if (!sel.text) {
      setShowStyleInput(false);
      setConfirmOp('style');
      return;
    }
    setOperating('style');
    try {
      const text = sel.text || content;
      const prompt = getPrompt('style', text, target);
      const sysPrompt = '你是一位资深文学编辑。';
      const result = await bridge.generateText(prompt, sysPrompt, workspace?.path, 'writing-style');
      if (result) {
        replaceContent(sel, result);
        toast.success('风格转换完成');
      }
    } catch (e) {
      toast.error('风格转换失败: ' + (e as Error).message);
    } finally {
      setOperating(null);
      setStyleTarget('');
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: 40, right: 24, zIndex: 500 }}>
      {open && (
        <div style={{
          position: 'absolute', bottom: 52, right: 0, width: 160,
          backgroundColor: 'var(--bg-panel)', borderRadius: 6,
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)', padding: 4,
          display: 'flex', flexDirection: 'column', gap: 1,
        }}>
          {operations.map(item => (
            <button
              key={item.key}
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleOperation(item.key)}
              disabled={operating !== null}
              style={{
                padding: '8px 12px', fontSize: 13, color: operating !== null ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: operating !== null ? 'not-allowed' : 'pointer',
                borderRadius: 4, border: 'none', background: 'none', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => { if (!operating) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span>{item.icon}</span>
              {operating === item.key ? '生成中…' : item.label}
            </button>
          ))}
        </div>
      )}
      <button
        onMouseDown={e => e.preventDefault()}
        onClick={() => setOpen(!open)}
        title="AI 助手"
        style={{
          width: 44, height: 44, borderRadius: '50%',
          backgroundColor: operating ? 'var(--accent-dim)' : 'var(--accent)',
          color: 'var(--text-inverse)', border: 'none',
          cursor: operating ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        {operating ? '⏳' : <Icon name="sparkle" size={18} />}
      </button>
      {showStyleInput && (
        <div style={{
          position: 'absolute', bottom: 52, right: 0, width: 220,
          backgroundColor: 'var(--bg-panel)', borderRadius: 6,
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)', padding: 12,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>输入目标风格（如：古风、现代、幽默、严肃）</div>
          <input
            value={styleTarget}
            onChange={e => setStyleTarget(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleStyleConvert(); if (e.key === 'Escape') { setShowStyleInput(false); setStyleTarget(''); } }}
            placeholder="例：古风"
            autoFocus
            style={{
              width: '100%', fontSize: 13, padding: '4px 8px', marginBottom: 8,
              backgroundColor: 'var(--bg-input)', border: '1px solid var(--accent)',
              color: 'var(--text-primary)', borderRadius: 4, outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
            <button onMouseDown={e => e.preventDefault()} onClick={() => { setShowStyleInput(false); setStyleTarget(''); }}
              style={{ padding: '4px 10px', fontSize: 11, backgroundColor: 'var(--bg-control)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 3, cursor: 'pointer' }}>
              取消
            </button>
            <button onMouseDown={e => e.preventDefault()} onClick={handleStyleConvert}
              style={{ padding: '4px 10px', fontSize: 11, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderRadius: 3, cursor: 'pointer' }}>
              转换
            </button>
          </div>
        </div>
      )}

      <Dialog open={!!confirmOp} onClose={() => setConfirmOp(null)} title="确认处理全文" width={360}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          当前没有选中文本，将对整章内容执行「{operations.find(o => o.key === confirmOp)?.label}」操作。是否继续？
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => setConfirmOp(null)}>取消</Button>
          <Button variant="primary" size="sm" onClick={handleConfirm}>确认</Button>
        </div>
      </Dialog>
    </div>
  );
};
