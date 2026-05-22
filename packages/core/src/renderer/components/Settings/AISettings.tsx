import React, { useState, useEffect } from 'react';
import { bridge } from '../../services/bridge';

const container: React.CSSProperties = {
  padding: 20,
  color: '#cccccc',
};

const field: React.CSSProperties = {
  marginBottom: 16,
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  marginBottom: 6,
  color: '#999',
};

const input: React.CSSProperties = {
  width: '100%',
  maxWidth: 400,
  padding: '6px 10px',
  fontSize: 14,
  backgroundColor: '#3c3c3c',
  border: '1px solid #555',
  color: '#ffffff',
  borderRadius: 4,
  outline: 'none',
};

const button: React.CSSProperties = {
  padding: '6px 16px',
  fontSize: 13,
  backgroundColor: '#007acc',
  color: '#ffffff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};

const saved: React.CSSProperties = {
  color: '#4ec9b0',
  fontSize: 12,
  marginLeft: 8,
};

export const AISettings: React.FC = () => {
  const [deepseekKey, setDeepseekKey] = useState('');
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    bridge.getAIKey('deepseek').then((key) => {
      if (key) setDeepseekKey(key);
    });
  }, []);

  const handleSave = async () => {
    await bridge.setAIKey('deepseek', deepseekKey);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  return (
    <div style={container}>
      <h2 style={{ fontSize: 18, marginBottom: 20, color: '#fff' }}>AI 设置</h2>

      <div style={field}>
        <label style={label}>DeepSeek API Key</label>
        <input
          style={input}
          type="password"
          value={deepseekKey}
          onChange={(e) => setDeepseekKey(e.target.value)}
          placeholder="sk-..."
        />
      </div>

      <div>
        <button style={button} onClick={handleSave}>保存</button>
        {showSaved && <span style={saved}>已保存</span>}
      </div>
    </div>
  );
};
