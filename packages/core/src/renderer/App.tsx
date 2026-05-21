import React from 'react';

const SHELL: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: '#1e1e1e',
  color: '#cccccc',
};

const MENUBAR: React.CSSProperties = {
  height: 30,
  backgroundColor: '#3c3c3c',
  display: 'flex',
  alignItems: 'center',
  paddingLeft: 12,
  fontSize: 13,
};

const MAIN: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
};

const STATUSBAR: React.CSSProperties = {
  height: 24,
  backgroundColor: '#007acc',
  display: 'flex',
  alignItems: 'center',
  paddingLeft: 12,
  fontSize: 12,
  color: '#ffffff',
};

export const App: React.FC = () => {
  return (
    <div style={SHELL}>
      <div style={MENUBAR}>文件 编辑 视图 帮助</div>
      <div style={MAIN}>
        {/* ActivityBar / Explorer / Editor / RightPanel / BottomPanel gradually filled in */}
      </div>
      <div style={STATUSBAR}>星盘工坊 v0.0.1</div>
    </div>
  );
};
