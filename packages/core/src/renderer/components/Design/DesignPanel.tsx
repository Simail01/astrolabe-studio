import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useDesignStore } from '../../stores/design.store';
import { bridge } from '../../services/bridge';
import { toast } from '../../stores/toast.store';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';
import type { CharacterDesign, Expression, Pose } from '@astrolabe/shared';

const EXPRESSION_TYPES: Expression['type'][] = ['neutral', 'happy', 'angry', 'sad', 'surprised'];
const POSE_TYPES: Pose['type'][] = ['front', 'side', 'action', 'casual'];

const expressionLabels: Record<Expression['type'], string> = {
  neutral: '默认', happy: '开心', angry: '愤怒', sad: '悲伤', surprised: '惊讶',
};
const poseLabels: Record<Pose['type'], string> = {
  front: '正面', side: '侧面', action: '动作', casual: '休闲',
};

const btnPrimary: React.CSSProperties = {
  padding: '4px 12px', fontSize: 12, backgroundColor: 'var(--accent)', color: 'var(--text-inverse)',
  border: 'none', borderRadius: 3, cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
  padding: '4px 12px', fontSize: 12, backgroundColor: 'var(--bg-control)', color: 'var(--text-primary)',
  border: '1px solid var(--border-subtle)', borderRadius: 3, cursor: 'pointer',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '4px 8px', fontSize: 12, backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-subtle)', borderRadius: 3, color: 'var(--text-primary)',
  outline: 'none', boxSizing: 'border-box',
};

interface SlotImageProps {
  label: string;
  image?: string;
  onGenerate: () => void;
  generating: boolean;
}

const SlotImage: React.FC<SlotImageProps> = ({ label, image, onGenerate, generating }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
    <div style={{
      width: 80, height: 80, borderRadius: 4, border: '1px solid var(--border-subtle)',
      backgroundColor: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative',
    }}>
      {image ? (
        <img src={image} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: 20, color: 'var(--text-muted)' }}>+</span>
      )}
    </div>
    <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{label}</span>
    <button
      onClick={onGenerate}
      disabled={generating}
      style={{ ...btnSecondary, padding: '2px 6px', fontSize: 10, opacity: generating ? 0.5 : 1 }}
    >{generating ? '...' : '生成'}</button>
  </div>
);

export const DesignPanel: React.FC = () => {
  const workspace = useWorkspaceStore(s => s.workspace);
  const activeProject = useWorkspaceStore(s => s.activeProject);
  const { currentDesign, isGenerating, setDesign, clearDesign, setGenerating } = useDesignStore();

  const [personEntries, setPersonEntries] = useState<{ id: string; title: string }[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string>('');
  const [baseImageSrc, setBaseImageSrc] = useState<string>('');
  const [expressionImages, setExpressionImages] = useState<Record<string, string>>({});
  const [poseImages, setPoseImages] = useState<Record<string, string>>({});
  const [generatingSlot, setGeneratingSlot] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  const projectPath = activeProject && workspace ? `${workspace.path}/${activeProject}` : null;

  // Load person entries
  useEffect(() => {
    if (!projectPath) return;
    bridge.wikiList(projectPath, 'person')
      .then(list => setPersonEntries(list as { id: string; title: string }[]))
      .catch(() => toast.error('加载人物列表失败'));
  }, [projectPath]);

  // Load design when character changes
  const loadDesign = useCallback(async (charId: string) => {
    if (!projectPath || !charId) { clearDesign(); setBaseImageSrc(''); setExpressionImages({}); setPoseImages({}); return; }
    try {
      const design = await bridge.designGet(projectPath, charId) as CharacterDesign | null;
      if (design) {
        setDesign(design);
        // Resolve base image
        if (design.baseImage) {
          try {
            const src = await bridge.readFileBase64(design.baseImage) as string;
            setBaseImageSrc(src.startsWith('data:') ? src : `data:image/png;base64,${src}`);
          } catch { setBaseImageSrc(''); }
        } else {
          setBaseImageSrc('');
        }
        // Resolve expression images
        const exprImgs: Record<string, string> = {};
        for (const expr of design.expressions) {
          if (expr.image) {
            try {
              const src = await bridge.readFileBase64(expr.image) as string;
              exprImgs[expr.type] = src.startsWith('data:') ? src : `data:image/png;base64,${src}`;
            } catch { /* skip */ }
          }
        }
        setExpressionImages(exprImgs);
        // Resolve pose images
        const poseImgs: Record<string, string> = {};
        for (const pose of design.poses) {
          if (pose.image) {
            try {
              const src = await bridge.readFileBase64(pose.image) as string;
              poseImgs[pose.type] = src.startsWith('data:') ? src : `data:image/png;base64,${src}`;
            } catch { /* skip */ }
          }
        }
        setPoseImages(poseImgs);
      } else {
        clearDesign();
        setBaseImageSrc('');
        setExpressionImages({});
        setPoseImages({});
      }
    } catch {
      clearDesign();
      setBaseImageSrc('');
      setExpressionImages({});
      setPoseImages({});
    }
  }, [projectPath, setDesign, clearDesign]);

  useEffect(() => { loadDesign(selectedCharId); }, [selectedCharId, loadDesign]);

  const selectedPerson = personEntries.find(p => p.id === selectedCharId);

  // Generate base image
  const handleGenerateBase = async () => {
    if (!projectPath || !selectedCharId) return;
    const charTitle = selectedPerson?.title || '';
    const prompt = description.trim() || `${charTitle} 角色设定图，全身，清晰细节，白色背景`;
    setGenerating(true);
    try {
      const urls = await bridge.generateImage({ prompt, model: 'general_v2.0_L', workspacePath: projectPath ?? undefined, stage: 'character:design' }) as string[];
      if (!urls?.length) { toast.error('图像生成失败'); return; }
      // Download to project
      const destDir = `${projectPath}/characters/${selectedCharId}`;
      const localPath = await bridge.downloadImage(urls[0], `${destDir}/base.png`) as string;
      const design: CharacterDesign = {
        id: `design-${selectedCharId}`,
        characterId: selectedCharId,
        version: 1,
        baseImage: localPath,
        thumbnail: localPath,
        expressions: EXPRESSION_TYPES.map(t => ({ type: t, image: '' })),
        poses: POSE_TYPES.map(t => ({ type: t, image: '' })),
        promptUsed: prompt,
        createdAt: new Date().toISOString(),
        confirmed: false,
      };
      await bridge.designSave(projectPath, selectedCharId, design);
      setDesign(design);
      // Load the saved image
      try {
        const src = await bridge.readFileBase64(localPath) as string;
        setBaseImageSrc(src.startsWith('data:') ? src : `data:image/png;base64,${src}`);
      } catch { /* skip */ }
      toast.success('设定图已生成');
    } catch (e) {
      toast.error('生成失败: ' + (e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  // Generate expression or pose image
  const handleGenerateSlot = async (slotType: string, category: 'expression' | 'pose') => {
    if (!projectPath || !selectedCharId || !currentDesign) return;
    const charTitle = selectedPerson?.title || '';
    const label = category === 'expression' ? expressionLabels[slotType as Expression['type']] : poseLabels[slotType as Pose['type']];
    const prompt = `${charTitle} ${label}表情姿态，角色设定图，保持角色一致性，白色背景`;
    setGeneratingSlot(`${category}-${slotType}`);
    try {
      const urls = await bridge.generateImage({ prompt, model: 'general_v2.0_L', referenceImage: currentDesign.baseImage, workspacePath: projectPath ?? undefined, stage: 'character:slot' }) as string[];
      if (!urls?.length) { toast.error('图像生成失败'); return; }
      const destDir = `${projectPath}/characters/${selectedCharId}`;
      const localPath = await bridge.downloadImage(urls[0], `${destDir}/${category}_${slotType}.png`) as string;
      // Update design
      const updated = { ...currentDesign };
      if (category === 'expression') {
        updated.expressions = updated.expressions.map(e => e.type === slotType ? { ...e, image: localPath } : e);
      } else {
        updated.poses = updated.poses.map(p => p.type === slotType ? { ...p, image: localPath } : p);
      }
      await bridge.designSave(projectPath, selectedCharId, updated);
      setDesign(updated);
      // Load the image
      try {
        const src = await bridge.readFileBase64(localPath) as string;
        const dataSrc = src.startsWith('data:') ? src : `data:image/png;base64,${src}`;
        if (category === 'expression') setExpressionImages(prev => ({ ...prev, [slotType]: dataSrc }));
        else setPoseImages(prev => ({ ...prev, [slotType]: dataSrc }));
      } catch { /* skip */ }
      toast.success(`${label}已生成`);
    } catch (e) {
      toast.error('生成失败: ' + (e as Error).message);
    } finally {
      setGeneratingSlot(null);
    }
  };

  // Toggle confirmed
  const handleToggleConfirm = async () => {
    if (!projectPath || !selectedCharId || !currentDesign) return;
    const updated = { ...currentDesign, confirmed: !currentDesign.confirmed };
    try {
      await bridge.designSave(projectPath, selectedCharId, updated);
      setDesign(updated);
      toast.success(updated.confirmed ? '已确认设定' : '已取消确认');
    } catch (e) {
      toast.error('保存失败: ' + (e as Error).message);
    }
  };

  if (!activeProject) {
    return (
      <EmptyState
        variant="page"
        icon={<Icon name="image" size={48} color="var(--text-muted)" />}
        title="请先在左侧选择一个作品"
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-panel)' }}>
      {/* Header: character selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, alignItems: 'center', padding: '0 8px' }}>
        <select
          value={selectedCharId}
          onChange={e => setSelectedCharId(e.target.value)}
          style={{ ...inputStyle, width: 'auto', minWidth: 150, margin: '6px 0', border: 'none', backgroundColor: 'var(--bg-panel)' }}
        >
          <option value="">选择角色...</option>
          {personEntries.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        {currentDesign && (
          <button
            onClick={handleToggleConfirm}
            style={{
              ...btnSecondary, margin: '6px 4px',
              backgroundColor: currentDesign.confirmed ? 'var(--accent-dim)' : 'var(--bg-control)',
              color: currentDesign.confirmed ? 'var(--accent)' : 'var(--text-primary)',
              borderColor: currentDesign.confirmed ? 'var(--accent)' : 'var(--border-subtle)',
            }}
          >{currentDesign.confirmed ? '已确认' : '确认'}</button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {!selectedCharId ? (
          <EmptyState
            variant="panel"
            title="请选择一个角色"
            description="从上方下拉菜单选择人物 Wiki 条目以管理其设定图"
          />
        ) : !currentDesign ? (
          /* No design — prompt to generate */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 24 }}>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>暂无 {selectedPerson?.title} 的设定图</div>
            <div style={{ width: '100%', maxWidth: 300 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>角色描述（可选，留空自动生成）</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={`${selectedPerson?.title} 的外貌、服装、特征描述...`}
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <button
              onClick={handleGenerateBase}
              disabled={isGenerating}
              style={{ ...btnPrimary, opacity: isGenerating ? 0.5 : 1 }}
            >{isGenerating ? '生成中...' : '生成设定图'}</button>
          </div>
        ) : (
          /* Has design — show images */
          <div>
            {/* Base image */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>基础设定图</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 160, height: 160, borderRadius: 4, border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-base)', overflow: 'hidden', flexShrink: 0,
                }}>
                  {baseImageSrc ? (
                    <img src={baseImageSrc} alt="base" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>无图像</div>
                  )}
                </div>
                <div style={{ flex: 1, fontSize: 11, color: 'var(--text-secondary)' }}>
                  {currentDesign.promptUsed && (
                    <div style={{ marginBottom: 4 }}><span style={{ color: 'var(--accent)' }}>Prompt:</span> {currentDesign.promptUsed}</div>
                  )}
                  {currentDesign.seed != null && <div>Seed: {currentDesign.seed}</div>}
                  <div>版本: v{currentDesign.version}</div>
                  <div>创建: {new Date(currentDesign.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>

            {/* Expressions grid */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>表情</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {EXPRESSION_TYPES.map(t => (
                  <SlotImage
                    key={t}
                    label={expressionLabels[t]}
                    image={expressionImages[t]}
                    onGenerate={() => handleGenerateSlot(t, 'expression')}
                    generating={generatingSlot === `expression-${t}`}
                  />
                ))}
              </div>
            </div>

            {/* Poses grid */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>姿态</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {POSE_TYPES.map(t => (
                  <SlotImage
                    key={t}
                    label={poseLabels[t]}
                    image={poseImages[t]}
                    onGenerate={() => handleGenerateSlot(t, 'pose')}
                    generating={generatingSlot === `pose-${t}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
