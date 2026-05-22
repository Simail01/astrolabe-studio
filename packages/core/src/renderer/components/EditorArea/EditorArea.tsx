import React from 'react';
import { GridSplit } from './GridSplit';
import { useLayoutStore } from '../../stores/layout.store';
import { OutlineEditor } from '../Outline/OutlineEditor';
import { ChapterEditor } from '../Editor/ChapterEditor';
import { StoryboardViewer } from '../Pipeline/StoryboardViewer';

const wrapper: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden',
};

export const EditorArea: React.FC = () => {
  const panelLayout = useLayoutStore((s) => s.panelLayout);

  return (
    <div style={wrapper}>
      <GridSplit grid={panelLayout.grid}>
        <OutlineEditor />
        <ChapterEditor />
        {panelLayout.grid === '2x2' && (
          <>
            <StoryboardViewer />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 14 }}>面板 4</div>
          </>
        )}
        {panelLayout.grid === '2x1' && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 14 }}>面板 2</div>}
        {panelLayout.grid === '1x2' && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 14 }}>面板 2</div>}
      </GridSplit>
    </div>
  );
};
