import React, { useState } from 'react';

export const AIBubble: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'fixed', bottom: 40, right: 24, zIndex: 500 }}>
      {open && (
        <div style={{ position: 'absolute', bottom: 52, right: 0, width: 180, backgroundColor: 'var(--bg-panel)', borderRadius: 6, border: '1px solid var(--border-subtle)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', padding: 6, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[{icon:'✏️',label:'续写'},{icon:'🎨',label:'改文风'},{icon:'🔥',label:'增强情绪'},{icon:'🔍',label:'检查一致性'}].map(item => (
            <button key={item.label} style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', borderRadius: 4, border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            ><span>{item.icon}</span>{item.label}</button>
          ))}
        </div>
      )}
      <button onClick={() => setOpen(!open)} title="AI 助手" style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>✨</button>
    </div>
  );
};
