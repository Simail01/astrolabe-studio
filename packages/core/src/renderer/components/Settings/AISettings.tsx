import React, { useState, useEffect } from 'react';
import { bridge } from '../../services/bridge';

const container: React.CSSProperties = {
  padding: '24px 20px',
  color: '#cccccc',
  overflow: 'auto',
  flex: 1,
};

const section: React.CSSProperties = {
  marginBottom: 24,
  padding: 16,
  backgroundColor: '#2d2d2d',
  borderRadius: 6,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  color: '#fff',
  marginBottom: 12,
  fontWeight: 600,
};

const field: React.CSSProperties = {
  marginBottom: 12,
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  marginBottom: 4,
  color: '#999',
};

const input: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  padding: '6px 10px',
  fontSize: 14,
  backgroundColor: '#3c3c3c',
  border: '1px solid #555',
  color: '#ffffff',
  borderRadius: 4,
  outline: 'none',
};

const btnRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 4,
};

const btn: React.CSSProperties = {
  padding: '6px 16px',
  fontSize: 13,
  backgroundColor: '#007acc',
  color: '#ffffff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  ...btn,
  backgroundColor: '#3c3c3c',
};

const statusOk: React.CSSProperties = {
  color: '#4ec9b0',
  fontSize: 12,
};

const statusFail: React.CSSProperties = {
  color: '#f44747',
  fontSize: 12,
};

const hint: React.CSSProperties = {
  fontSize: 11,
  color: '#666',
  marginTop: 4,
};

interface Props {
  onSaved?: () => void;
}

export const AISettings: React.FC<Props> = ({ onSaved }) => {
  const [deepseekKey, setDeepseekKey] = useState('');
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState('');
  const [deepseekModel, setDeepseekModel] = useState('');
  const [volcKey, setVolcKey] = useState('');
  const [volcImageModel, setVolcImageModel] = useState('');
  const [volcStatus, setVolcStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [volcStatusMsg, setVolcStatusMsg] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [dsStatus, setDsStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [dsStatusMsg, setDsStatusMsg] = useState('');

  useEffect(() => {
    bridge.getAIKey('deepseek').then((k) => { if (k) setDeepseekKey(k); }).catch(() => {});
    bridge.getAIKey('deepseek-baseurl').then((k) => { if (k) setDeepseekBaseUrl(k); }).catch(() => {});
    bridge.getAIKey('deepseek-model').then((k) => { if (k) setDeepseekModel(k); }).catch(() => {});
    bridge.getAIKey('volcengine').then((k) => { if (k) setVolcKey(k); }).catch(() => {});
    bridge.getAIKey('volcengine-image-model').then((k) => { if (k) setVolcImageModel(k); }).catch(() => {});
  }, []);

  const [saveError, setSaveError] = useState('');

  const handleSave = () => {
    setSaveError('');
    const saves: Promise<unknown>[] = [
      bridge.setAIKey('deepseek', deepseekKey),
      bridge.setAIKey('deepseek-model', deepseekModel),
      bridge.setAIKey('volcengine', volcKey),
      bridge.setAIKey('volcengine-image-model', volcImageModel),
    ];
    if (deepseekBaseUrl) saves.push(bridge.setAIKey('deepseek-baseurl', deepseekBaseUrl));
    Promise.all(saves).then(() => {
      setShowSaved(true);
      onSaved?.();
      setTimeout(() => setShowSaved(false), 2000);
    }).catch((e) => {
      setSaveError('保存失败: ' + (e as Error).message);
    });
  };

  const testDeepSeek = async () => {
    if (!deepseekKey) return;
    setDsStatus('testing');
    try {
      await bridge.generateText('回复"OK"', '连通性测试，只回复OK两个字母');
      setDsStatus('ok');
      setDsStatusMsg('连接成功');
    } catch (e) {
      setDsStatus('fail');
      setDsStatusMsg((e as Error).message || '连接失败');
    }
  };

  const testVolcEngine = async () => {
    if (!volcKey) return;
    setVolcStatus('testing');
    try {
      const result = await bridge.pingVolcEngine(volcKey);
      if (result.ok) {
        setVolcStatus('ok');
        setVolcStatusMsg('连接成功');
      } else {
        setVolcStatus('fail');
        setVolcStatusMsg(result.error || '连接失败，请检查 API Key');
      }
    } catch (e) {
      setVolcStatus('fail');
      setVolcStatusMsg((e as Error).message || '连接失败');
    }
  };

  return (
    <div style={container}>
      <h2 style={{ fontSize: 18, marginBottom: 20, color: '#fff' }}>模型 API 配置</h2>

      {/* DeepSeek */}
      <div style={section}>
        <div style={sectionTitle}>DeepSeek（文本生成）</div>
        <div style={field}>
          <label style={label}>API Key *</label>
          <input
            style={input}
            type="password"
            value={deepseekKey}
            onChange={(e) => { setDeepseekKey(e.target.value); setDsStatus('idle'); }}
            placeholder="sk-..."
          />
          <div style={hint}>在 platform.deepseek.com 注册后获取</div>
        </div>
        <div style={field}>
          <label style={label}>Base URL（可选，默认 api.deepseek.com）</label>
          <input
            style={input}
            value={deepseekBaseUrl}
            onChange={(e) => setDeepseekBaseUrl(e.target.value)}
            placeholder="https://api.deepseek.com/v1"
          />
        </div>
        <div style={field}>
          <label style={label}>模型名称</label>
          <input
            style={input}
            value={deepseekModel}
            onChange={(e) => setDeepseekModel(e.target.value)}
            placeholder="deepseek-chat"
          />
          <div style={hint}>默认 deepseek-chat。也可用 deepseek-reasoner 等</div>
        </div>
        <div style={btnRow}>
          <button style={btnSecondary} onClick={testDeepSeek} disabled={dsStatus === 'testing' || !deepseekKey}>
            {dsStatus === 'testing' ? '测试中...' : '连通性测试'}
          </button>
          {dsStatus === 'ok' && <span style={statusOk}>✓ {dsStatusMsg}</span>}
          {dsStatus === 'fail' && <span style={statusFail}>✗ {dsStatusMsg}</span>}
        </div>
      </div>

      {/* VolcEngine Ark */}
      <div style={section}>
        <div style={sectionTitle}>火山方舟（图像/视频生成）</div>
        <div style={field}>
          <label style={label}>API Key *</label>
          <input
            style={input}
            type="password"
            value={volcKey}
            onChange={(e) => { setVolcKey(e.target.value); setVolcStatus('idle'); }}
            placeholder="火山方舟 API Key..."
          />
          <div style={hint}>在火山方舟控制台 (ark.volcengine.com) 获取 API Key</div>
        </div>
        <div style={field}>
          <label style={label}>图像生成接入点 ID</label>
          <input
            style={input}
            value={volcImageModel}
            onChange={(e) => setVolcImageModel(e.target.value)}
            placeholder="ep-xxxxxxxx"
          />
          <div style={hint}>在火山方舟创建推理接入点后获取，如 doubao-seedream-1-0 的接入点 ID</div>
        </div>
        <div style={btnRow}>
          <button style={btnSecondary} onClick={testVolcEngine} disabled={volcStatus === 'testing' || !volcKey}>
            {volcStatus === 'testing' ? '测试中...' : '连通性测试'}
          </button>
          {volcStatus === 'ok' && <span style={statusOk}>✓ {volcStatusMsg}</span>}
          {volcStatus === 'fail' && <span style={statusFail}>✗ {volcStatusMsg}</span>}
        </div>
      </div>

      <div>
        <button style={btn} onClick={handleSave}>保存配置</button>
        {showSaved && <span style={statusOk}>已保存</span>}
        {saveError && <span style={statusFail}>{saveError}</span>}
      </div>
    </div>
  );
};
