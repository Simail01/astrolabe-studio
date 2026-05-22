import React from 'react';
import { useDesignStore } from '../../stores/design.store';

const panel: React.CSSProperties = {
  padding: 16, color: '#ccc', height: '100%', overflow: 'auto', backgroundColor: '#1e1e1e',
};
const title: React.CSSProperties = { fontSize: 16, color: '#fff', marginBottom: 12 };
const section: React.CSSProperties = { marginBottom: 16 };
const sectionLabel: React.CSSProperties = { fontSize: 12, color: '#999', marginBottom: 6 };
const btn: React.CSSProperties = {
  padding: '6px 14px', fontSize: 13, backgroundColor: '#007acc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginRight: 8,
};
const btnDisabled: React.CSSProperties = { ...btn, opacity: 0.5, cursor: 'not-allowed' };
const placeholder: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: '#666', fontSize: 14, border: '1px dashed #444', borderRadius: 6, marginBottom: 16,
};
const thumbnail: React.CSSProperties = { width: '100%', maxWidth: 200, borderRadius: 6, border: '1px solid #444', marginBottom: 12 };
const expressionGrid: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const exprItem: React.CSSProperties = { textAlign: 'center', fontSize: 11, color: '#999' };
const exprTypeLabels: Record<string, string> = { neutral: '中性', happy: '开心', angry: '愤怒', sad: '悲伤', surprised: '惊讶' };
const poseTypeLabels: Record<string, string> = { front: '正面', side: '侧面', action: '战斗', casual: '日常' };

export const DesignPanel: React.FC = () => {
  const { currentDesign, hasDesign, designSource, isGenerating, setDesignSource, setGenerating } = useDesignStore();

  return (
    <div style={panel}>
      <div style={title}>角色设定图</div>

      {!hasDesign ? (
        <div style={placeholder}>
          <div style={{ marginBottom: 12 }}>暂无设定图</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btn} onClick={() => { setDesignSource('ai-generated'); setGenerating(true); }}>
              AI 生成设定图
            </button>
            <button style={{ ...btn, backgroundColor: '#3c3c3c' }} onClick={() => setDesignSource('user-upload')}>
              手动上传
            </button>
          </div>
        </div>
      ) : (
        <>
          {currentDesign && (
            <>
              <div style={section}>
                <div style={sectionLabel}>
                  设定图 v{currentDesign.version}
                  {designSource && <span style={{ marginLeft: 8, color: '#4ec9b0' }}>({designSource === 'ai-generated' ? 'AI生成' : designSource === 'user-upload' ? '手动上传' : '同人库'})</span>}
                  {currentDesign.confirmed && <span style={{ marginLeft: 8, color: '#4ec9b0' }}>✓ 已确认</span>}
                </div>
                <img src={currentDesign.baseImage} alt="设定图" style={thumbnail} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>

              {currentDesign.expressions.length > 0 && (
                <div style={section}>
                  <div style={sectionLabel}>表情</div>
                  <div style={expressionGrid}>
                    {currentDesign.expressions.map((expr) => (
                      <div key={expr.type} style={exprItem}>
                        <img src={expr.image} alt={expr.type} style={{ width: 60, height: 60, borderRadius: 4, border: '1px solid #444', display: 'block', marginBottom: 2 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        {exprTypeLabels[expr.type] ?? expr.type}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentDesign.poses.length > 0 && (
                <div style={section}>
                  <div style={sectionLabel}>姿态</div>
                  <div style={expressionGrid}>
                    {currentDesign.poses.map((pose) => (
                      <div key={pose.type} style={exprItem}>
                        <img src={pose.image} alt={pose.type} style={{ width: 60, height: 60, borderRadius: 4, border: '1px solid #444', display: 'block', marginBottom: 2 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        {poseTypeLabels[pose.type] ?? pose.type}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn} onClick={() => setGenerating(true)}>生成表情包</button>
                <button style={btn} onClick={() => setGenerating(true)}>生成姿态包</button>
              </div>
            </>
          )}

          {isGenerating && (
            <div style={{ marginTop: 12, padding: 8, backgroundColor: '#094771', borderRadius: 4, fontSize: 13 }}>
              ⏳ 生成中...
            </div>
          )}
        </>
      )}
    </div>
  );
};
