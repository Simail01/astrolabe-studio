import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { bridge } from '../../services/bridge';
import { toast } from '../../stores/toast.store';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';
import type { PromptLogEntry } from '@astrolabe/shared';

const typeLabels: Record<string, string> = {
  text: '文本', stream: '流式', image: '图像',
};

const typeColors: Record<string, string> = {
  text: 'var(--accent)', stream: 'var(--color-success, #4caf50)', image: 'var(--color-warning, #e6a817)',
};

const rowStyle: React.CSSProperties = {
  padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border-subtle)',
  display: 'flex', alignItems: 'center', gap: 8,
};

const tagStyle = (color: string): React.CSSProperties => ({
  fontSize: 10, padding: '1px 6px', borderRadius: 3, backgroundColor: color, color: 'var(--text-inverse)',
  whiteSpace: 'nowrap',
});

const detailBlock: React.CSSProperties = {
  padding: '6px 8px', marginBottom: 4, borderRadius: 4,
  backgroundColor: 'var(--bg-control)', border: '1px solid var(--border-subtle)',
  fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
  maxHeight: 200, overflow: 'auto',
};

const labelStyle: React.CSSProperties = {
  fontSize: 10, color: 'var(--text-muted)', marginBottom: 2,
};

export const PromptLogPanel: React.FC = () => {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const [logs, setLogs] = useState<PromptLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [newResults, setNewResults] = useState<Record<string, string>>({});

  const fetchLogs = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const data = await bridge.listPromptLogs(workspace.path) as PromptLogEntry[];
      setLogs(data.reverse());
    } catch (e) {
      toast.error('加载日志失败: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (!workspace) {
    return (
      <EmptyState
        variant="page"
        icon={<Icon name="sparkle" size={48} color="var(--text-muted)" />}
        title="请先打开一个工作区"
      />
    );
  }

  const filtered = filter ? logs.filter((l) => l.type === filter) : logs;

  const handleRegenerate = async (entry: PromptLogEntry) => {
    setRegeneratingId(entry.id);
    try {
      const result = await bridge.generateText(entry.prompt, entry.systemPrompt);
      setNewResults((prev) => ({ ...prev, [entry.id]: result }));
    } catch (e) {
      toast.error('重新生成失败: ' + (e as Error).message);
    } finally {
      setRegeneratingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-panel)' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, alignItems: 'center' }}>
        {[null, 'text', 'stream', 'image'].map((t) => (
          <div
            key={t ?? 'all'}
            onClick={() => setFilter(t)}
            style={{
              padding: '6px 12px', fontSize: 12, cursor: 'pointer',
              color: filter === t ? 'var(--text-inverse)' : 'var(--text-secondary)',
              backgroundColor: filter === t ? 'var(--accent-dim)' : 'transparent',
              borderRight: '1px solid var(--border-subtle)',
            }}
          >{t === null ? '全部' : typeLabels[t]}</div>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={fetchLogs}
          disabled={loading}
          style={{
            padding: '4px 10px', fontSize: 11, backgroundColor: 'var(--bg-control)',
            color: 'var(--text-primary)', border: 'none', cursor: 'pointer', margin: 2, borderRadius: 3,
            opacity: loading ? 0.5 : 1,
          }}
        >刷新</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12, textAlign: 'center' }}>加载中…</div>
        ) : filtered.length === 0 ? (
          <EmptyState variant="inline" title="暂无 Prompt 运行记录" description="AI 调用后会自动记录" />
        ) : (
          filtered.map((entry) => (
            <React.Fragment key={entry.id}>
              <div
                style={{
                  ...rowStyle,
                  backgroundColor: expandedId === entry.id ? 'var(--accent-dim)' : 'transparent',
                }}
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <span style={tagStyle(typeColors[entry.type])}>{typeLabels[entry.type]}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(entry.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.prompt.slice(0, 60)}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{entry.model}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{entry.duration}ms</span>
                <span style={{
                  fontSize: 10, padding: '1px 4px', borderRadius: 2,
                  backgroundColor: entry.success ? 'var(--color-success, #4caf50)' : 'var(--color-error)',
                  color: 'var(--text-inverse)',
                }}>{entry.success ? '成功' : '失败'}</span>
              </div>

              {expandedId === entry.id && (
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-panel)' }}>
                  {entry.stage && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={labelStyle}>阶段</div>
                      <div style={{ fontSize: 11, color: 'var(--accent)' }}>{entry.stage}</div>
                    </div>
                  )}
                  <div style={{ marginBottom: 6 }}>
                    <div style={labelStyle}>Prompt</div>
                    <div style={detailBlock}>{entry.prompt}</div>
                  </div>
                  {entry.systemPrompt && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={labelStyle}>System Prompt</div>
                      <div style={detailBlock}>{entry.systemPrompt}</div>
                    </div>
                  )}
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={labelStyle}>结果</div>
                      {entry.type === 'text' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRegenerate(entry); }}
                          disabled={regeneratingId === entry.id}
                          style={{
                            padding: '2px 8px', fontSize: 10, backgroundColor: 'var(--bg-control)',
                            color: 'var(--text-primary)', border: '1px solid var(--border-subtle)',
                            borderRadius: 3, cursor: regeneratingId === entry.id ? 'not-allowed' : 'pointer',
                            opacity: regeneratingId === entry.id ? 0.5 : 1,
                          }}
                        >{regeneratingId === entry.id ? '生成中...' : '重新生成'}</button>
                      )}
                    </div>
                    {newResults[entry.id] ? (
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ ...labelStyle, marginBottom: 2 }}>旧结果</div>
                          <div style={detailBlock}>{entry.result || '(空)'}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ ...labelStyle, marginBottom: 2, color: 'var(--color-success, #4caf50)' }}>新结果</div>
                          <div style={detailBlock}>{newResults[entry.id]}</div>
                        </div>
                      </div>
                    ) : (
                      <div style={detailBlock}>{entry.result || '(空)'}</div>
                    )}
                  </div>
                  {entry.error && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={labelStyle}>错误</div>
                      <div style={{ ...detailBlock, color: 'var(--color-error)' }}>{entry.error}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-muted)' }}>
                    <span>模型: {entry.model}</span>
                    <span>耗时: {entry.duration}ms</span>
                    <span>时间: {new Date(entry.timestamp).toLocaleString('zh-CN')}</span>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
};
