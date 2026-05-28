import React, { useState, useEffect, useCallback } from 'react';
import { bridge } from '../../services/bridge';
import { toast } from '../../stores/toast.store';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

export const UpdateNotification: React.FC = () => {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [version, setVersion] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleCheck = useCallback(async () => {
    setStatus('checking');
    const result = await bridge.invoke('update:check') as { hasUpdate?: boolean; error?: string };
    if (result.error) {
      setStatus('error');
      setError(result.error);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    setStatus('downloading');
    const result = await bridge.invoke('update:download') as { ok?: boolean; error?: string };
    if (result.error) {
      setStatus('error');
      setError(result.error);
    }
  }, []);

  const handleInstall = useCallback(() => {
    bridge.invoke('update:install');
  }, []);

  useEffect(() => {
    const offStatus = bridge.invoke('astrolabe', 'update:status') as Promise<unknown>;
    // Listen for update status events from main process
    const unsub1 = (window as any).astrolabe?.on?.('update:status', (_status: string, data?: any) => {
      if (_status === 'checking') setStatus('checking');
      else if (_status === 'available') {
        setStatus('available');
        setVersion(data?.version || '');
      }
      else if (_status === 'not-available') setStatus('idle');
      else if (_status === 'downloaded') setStatus('downloaded');
      else if (_status === 'error') {
        setStatus('error');
        setError(data || '');
      }
    });

    const unsub2 = (window as any).astrolabe?.on?.('update:progress', (data: any) => {
      setProgress(data?.percent || 0);
    });

    return () => {
      unsub1?.();
      unsub2?.();
    };
  }, []);

  if (status === 'idle' || status === 'checking') return null;

  return (
    <div style={{
      position: 'fixed', bottom: 36, right: 16, zIndex: 300,
      backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-subtle)',
      borderRadius: 8, padding: '12px 16px', minWidth: 280,
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    }}>
      {status === 'available' && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>
            发现新版本 v{version}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleDownload} style={{
              padding: '4px 12px', fontSize: 12, cursor: 'pointer',
              backgroundColor: 'var(--accent)', color: 'var(--text-inverse)',
              border: 'none', borderRadius: 4,
            }}>下载更新</button>
            <button onClick={() => setStatus('idle')} style={{
              padding: '4px 12px', fontSize: 12, cursor: 'pointer',
              backgroundColor: 'transparent', color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)', borderRadius: 4,
            }}>稍后</button>
          </div>
        </>
      )}
      {status === 'downloading' && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 6 }}>
            正在下载更新… {progress.toFixed(0)}%
          </div>
          <div style={{
            height: 4, backgroundColor: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${progress}%`, backgroundColor: 'var(--accent)',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      )}
      {status === 'downloaded' && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>
            更新已下载，重启即可安装
          </div>
          <button onClick={handleInstall} style={{
            padding: '4px 12px', fontSize: 12, cursor: 'pointer',
            backgroundColor: 'var(--accent)', color: 'var(--text-inverse)',
            border: 'none', borderRadius: 4,
          }}>立即重启</button>
        </>
      )}
      {status === 'error' && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          更新检查失败: {error}
        </div>
      )}
    </div>
  );
};
