import React from 'react';

interface Props {
  grid: '1x1' | '1x2' | '2x1' | '2x2';
  children: React.ReactNode[];
}

export const GridSplit: React.FC<Props> = ({ grid, children }) => {
  const [rows, cols] = grid === '2x2' ? [2, 2] : grid === '2x1' ? [2, 1] : grid === '1x2' ? [1, 2] : [1, 1];

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#1e1e1e',
  };

  const visible = React.Children.toArray(children).slice(0, rows * cols);

  return <div style={gridStyle}>{visible}</div>;
};
