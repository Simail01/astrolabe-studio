import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useOutlineStore } from '../../stores/outline.store';
import { useWikiStore } from '../../stores/wiki.store';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { bridge } from '../../services/bridge';
import type { Chapter, Outline, WikiEntry, OutlineNode } from '@astrolabe/shared';

function flatNodes(nodes: OutlineNode[]): OutlineNode[] {
  return nodes.reduce<OutlineNode[]>((acc, n) => { acc.push(n); if (n.children.length > 0) acc.push(...flatNodes(n.children)); return acc; }, []);
}

const statusLabel: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'var(--text-muted)' },
  writing: { text: '写作中', color: 'var(--color-warning)' },
  revision: { text: '修订中', color: 'var(--color-info)' },
  final: { text: '定稿', color: 'var(--color-success)' },
};

export const DashboardPage: React.FC = () => {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const activeProject = useWorkspaceStore((s) => s.activeProject);
  const getProjectPath = useWorkspaceStore((s) => s.getProjectPath);
  const outline = useOutlineStore((s) => s.outline);
  const wikiEntries = useWikiStore((s) => s.entries);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);

  const projectPath = getProjectPath();

  useEffect(() => {
    if (!projectPath || !outline?.nodes?.length) { setChapters([]); return; }
    let cancelled = false;
    setLoading(true);
    const nodes = flatNodes(outline.nodes);
    Promise.all(
      nodes.map((n) =>
        bridge.pipelineGetChapter(projectPath, n.id)
          .then((d) => (d as Chapter) || null)
          .catch(() => null)
      )
    ).then((results) => {
      if (cancelled) return;
      setChapters(results.filter(Boolean) as Chapter[]);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [projectPath, outline]);

  if (!workspace || !activeProject || !projectPath) {
    return (
      <EmptyState
        variant="page"
        icon={<Icon name="dashboard" size={48} color="var(--text-muted)" />}
        title={!workspace ? '请先打开工作区' : '请先在左侧选择一个作品'}
      />
    );
  }

  const totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
  const nodeList = outline?.nodes ? flatNodes(outline.nodes) : [];
  const recentChapters = [...chapters]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24 }}>
        {activeProject}
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        {[
          { label: '总字数', value: loading ? '...' : totalWords.toLocaleString() },
          { label: '章节数', value: loading ? '...' : String(nodeList.length) },
          { label: 'Wiki 条目', value: String(wikiEntries.length) },
        ].map((s) => (
          <div key={s.label} style={{
            flex: 1, padding: '16px 20px', backgroundColor: 'var(--bg-panel)',
            borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {recentChapters.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>最近修改</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recentChapters.map((ch) => (
              <div key={ch.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', backgroundColor: 'var(--bg-panel)', borderRadius: 'var(--radius)',
                border: '1px solid var(--border-subtle)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{ch.title || '未命名'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(ch.wordCount || 0).toLocaleString()} 字</span>
                  <span style={{ fontSize: 11, color: statusLabel[ch.status]?.color || 'var(--text-muted)' }}>
                    {statusLabel[ch.status]?.text || ch.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>章节列表</div>
        {nodeList.length === 0 ? (
          <EmptyState
            variant="panel"
            title="暂无章节"
            description="前往大纲页面创建章节节点"
            action={{ label: '前往大纲', onClick: () => {} }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {nodeList.map((node) => {
              const ch = chapters.find((c) => c.id === node.id);
              return (
                <div key={node.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 12px', borderRadius: 'var(--radius)',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{node.title || '未命名'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {ch ? `${(ch.wordCount || 0).toLocaleString()} 字` : '-'}
                    </span>
                    {ch && (
                      <span style={{
                        fontSize: 11, padding: '1px 6px', borderRadius: 3,
                        color: statusLabel[ch.status]?.color || 'var(--text-muted)',
                        backgroundColor: 'var(--bg-base)',
                      }}>
                        {statusLabel[ch.status]?.text || ch.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
