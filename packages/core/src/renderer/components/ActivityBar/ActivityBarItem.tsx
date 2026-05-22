import React from 'react';

interface Props {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

const item: React.CSSProperties = {
  width: 48,
  height: 48,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: 20,
  position: 'relative',
};

const activeIndicator: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 8,
  bottom: 8,
  width: 2,
  backgroundColor: '#ffffff',
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#999',
  marginTop: 2,
};

export const ActivityBarItem: React.FC<Props> = ({ icon, label, active, onClick }) => (
  <div style={{ ...item, opacity: active ? 1 : 0.6 }} onClick={onClick} title={label}>
    {active && <div style={activeIndicator} />}
    <span>{icon}</span>
    <span style={labelStyle}>{label}</span>
  </div>
);
