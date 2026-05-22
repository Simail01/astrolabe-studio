import React, { useRef, useEffect } from 'react';
import { useCommandStore } from '../../stores/command.store';

const overlay: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  paddingTop: 80,
  zIndex: 1000,
};

const dialog: React.CSSProperties = {
  width: 520,
  maxHeight: 400,
  backgroundColor: '#252526',
  borderRadius: 6,
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: 15,
  border: 'none',
  outline: 'none',
  backgroundColor: '#3c3c3c',
  color: '#ffffff',
  borderBottom: '1px solid #555',
};

const listContainer: React.CSSProperties = {
  overflow: 'auto',
  flex: 1,
};

const item: React.CSSProperties = {
  padding: '8px 14px',
  cursor: 'pointer',
  fontSize: 13,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const itemActive: React.CSSProperties = {
  ...item,
  backgroundColor: '#094771',
};

const categoryBadge: React.CSSProperties = {
  fontSize: 11,
  color: '#999',
  backgroundColor: '#3c3c3c',
  padding: '2px 6px',
  borderRadius: 3,
};

export const CommandPalette: React.FC = () => {
  const { paletteOpen, search, filteredCommands, setSearch, togglePalette, executeCommand } =
    useCommandStore();
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [paletteOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!paletteOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      togglePalette();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex].id);
      }
    }
  };

  return (
    <div style={overlay} onClick={togglePalette}>
      <div style={dialog} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          style={input}
          placeholder="搜索命令..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div style={listContainer}>
          {filteredCommands.map((cmd, i) => (
            <div
              key={cmd.id}
              style={i === selectedIndex ? itemActive : item}
              onClick={() => executeCommand(cmd.id)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span>{cmd.label}</span>
              <span style={categoryBadge}>{cmd.category}</span>
            </div>
          ))}
          {filteredCommands.length === 0 && (
            <div style={{ padding: 14, color: '#666', fontSize: 13 }}>
              未找到匹配的命令
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
