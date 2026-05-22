import React from 'react';
import { ActivityBarItem } from './ActivityBarItem';
import { useLayoutStore } from '../../stores/layout.store';

const container: React.CSSProperties = {
  width: 48,
  minWidth: 48,
  backgroundColor: '#333333',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  paddingTop: 8,
};

const defaultItems = [
  { id: 'explorer', icon: '📁', label: '项目' },
  { id: 'search', icon: '🔍', label: '搜索' },
  { id: 'wiki', icon: '📖', label: 'Wiki' },
  { id: 'fanlib', icon: '👤', label: '同人库' },
];

const bottomItems = [
  { id: 'settings', icon: '⚙️', label: '设置' },
];

export const ActivityBar: React.FC = () => {
  const { sidebarVisible, toggleSidebar } = useLayoutStore();

  return (
    <div style={container}>
      {defaultItems.map((item) => (
        <ActivityBarItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          active={item.id === 'explorer' ? sidebarVisible : false}
          onClick={() => {
            if (item.id === 'explorer') toggleSidebar();
          }}
        />
      ))}
      <div style={{ flex: 1 }} />
      {bottomItems.map((item) => (
        <ActivityBarItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          active={false}
          onClick={() => {}}
        />
      ))}
    </div>
  );
};
