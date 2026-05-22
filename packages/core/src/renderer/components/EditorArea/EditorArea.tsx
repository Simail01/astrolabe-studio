import React from 'react';
import { GridSplit } from './GridSplit';
import { useLayoutStore } from '../../stores/layout.store';

const wrapper: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflow: 'hidden',
};

const emptyPanel: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#666',
  fontSize: 14,
};

export const EditorArea: React.FC = () => {
  const panelLayout = useLayoutStore((s) => s.panelLayout);

  return (
    <div style={wrapper}>
      <GridSplit grid={panelLayout.grid}>
        <div style={emptyPanel}>欢迎使用星盘工坊</div>
        <div style={emptyPanel}>打开文件开始创作</div>
        {panelLayout.grid === '2x2' && (
          <>
            <div style={emptyPanel}>面板 3</div>
            <div style={emptyPanel}>面板 4</div>
          </>
        )}
        {panelLayout.grid === '2x1' && <div style={emptyPanel}>面板 2</div>}
        {panelLayout.grid === '1x2' && <div style={emptyPanel}>面板 2</div>}
      </GridSplit>
    </div>
  );
};
