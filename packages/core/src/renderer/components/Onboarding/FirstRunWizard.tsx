import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { bridge } from '../../services/bridge';
import { toast } from '../../stores/toast.store';

interface FirstRunWizardProps {
  open: boolean;
  onComplete: () => void;
}

type Step = 'welcome' | 'deepseek' | 'volcengine' | 'done';

export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ open, onComplete }) => {
  const [step, setStep] = useState<Step>('welcome');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [volcKey, setVolcKey] = useState('');
  const [volcEndpoint, setVolcEndpoint] = useState('');
  const [testing, setTesting] = useState(false);

  if (!open) return null;

  const testDeepSeek = async () => {
    if (!deepseekKey) return;
    setTesting(true);
    try {
      // 先存临时 key 用于测试，失败时清理
      await bridge.setAIKey('deepseek', deepseekKey);
      await bridge.generateText('回复"OK"', '连通性测试，只回复OK两个字母');
      toast.success('DeepSeek 连接成功');
    } catch (e) {
      // 测试失败，清理已存的无效 key
      await bridge.setAIKey('deepseek', '').catch(() => {});
      toast.error('DeepSeek 连接失败: ' + (e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  const testVolcEngine = async () => {
    if (!volcKey) return;
    setTesting(true);
    try {
      const result = await bridge.pingVolcEngine(volcKey);
      if (result.ok) {
        toast.success('火山引擎连接成功');
      } else {
        toast.error('火山引擎连接失败: ' + (result.error || '请检查 API Key'));
      }
    } catch (e) {
      toast.error('火山引擎连接失败: ' + (e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleComplete = async () => {
    if (deepseekKey) await bridge.setAIKey('deepseek', deepseekKey);
    if (volcKey) await bridge.setAIKey('volcengine', volcKey);
    if (volcEndpoint) await bridge.setAIKey('volcengine-image-model', volcEndpoint);
    onComplete();
  };

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: 8, fontSize: 20 }}>欢迎使用星盘工坊</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
              AI 赋能的小说/漫画创作工作台。<br />
              配置 API Key 后即可使用 AI 辅助写作功能。
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Button variant="primary" size="lg" onClick={() => setStep('deepseek')}>开始配置</Button>
              <Button variant="ghost" size="lg" onClick={handleSkip}>稍后再说</Button>
            </div>
          </div>
        );

      case 'deepseek':
        return (
          <div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>DeepSeek 文本 AI</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
              用于大纲生成、AI 续写、改写润色等文本功能。
            </p>
            <div style={{ marginBottom: 12 }}>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); bridge.invoke('shell:openExternal', 'https://platform.deepseek.com'); }}
                style={{ color: 'var(--accent-blue)', fontSize: 13 }}
              >
                前往 platform.deepseek.com 注册获取 Key →
              </a>
            </div>
            <Input
              label="API Key"
              type="password"
              placeholder="sk-..."
              value={deepseekKey}
              onChange={(e) => setDeepseekKey(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setStep('volcengine')}>跳过</Button>
              <Button
                variant="secondary"
                disabled={!deepseekKey || testing}
                onClick={testDeepSeek}
              >
                {testing ? '测试中...' : '测试连接'}
              </Button>
              <Button variant="primary" onClick={() => setStep('volcengine')}>下一步</Button>
            </div>
          </div>
        );

      case 'volcengine':
        return (
          <div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>火山引擎图像 AI（可选）</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
              用于分镜图片生成、漫画页面生成等视觉功能。
            </p>
            <div style={{ marginBottom: 12 }}>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); bridge.invoke('shell:openExternal', 'https://ark.volcengine.com'); }}
                style={{ color: 'var(--accent-blue)', fontSize: 13 }}
              >
                前往 ark.volcengine.com 注册获取 Key →
              </a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Input
                label="API Key"
                type="password"
                placeholder="火山引擎 API Key"
                value={volcKey}
                onChange={(e) => setVolcKey(e.target.value)}
              />
              <Input
                label="接入点 ID"
                placeholder="图像模型接入点 ID"
                value={volcEndpoint}
                onChange={(e) => setVolcEndpoint(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setStep('done')}>跳过</Button>
              <Button
                variant="secondary"
                disabled={!volcKey || testing}
                onClick={testVolcEngine}
              >
                {testing ? '测试中...' : '测试连接'}
              </Button>
              <Button variant="primary" onClick={() => setStep('done')}>下一步</Button>
            </div>
          </div>
        );

      case 'done':
        return (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>配置完成</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>
              DeepSeek：{deepseekKey ? '已配置' : '未配置'}<br />
              火山引擎：{volcKey ? '已配置' : '未配置'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 20 }}>
              可随时在 设置 → 模型 API 配置 中修改
            </p>
            <Button variant="primary" size="lg" onClick={handleComplete}>开始使用</Button>
          </div>
        );
    }
  };

  const stepIndex = { welcome: 0, deepseek: 1, volcengine: 2, done: 3 }[step];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--editor-panel)', borderRadius: 'var(--radius-xl)',
          padding: 32, width: 460, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
          {['欢迎', 'DeepSeek', '火山引擎', '完成'].map((label, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  backgroundColor: i <= stepIndex ? 'var(--accent)' : 'var(--border-default)',
                }}
              />
              <span style={{ fontSize: 11, color: i <= stepIndex ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
        {renderStep()}
      </div>
    </div>
  );
};
