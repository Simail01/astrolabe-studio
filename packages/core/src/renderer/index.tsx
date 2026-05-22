import './styles/theme.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { registerDefaultCommands } from './commands/defaults';

registerDefaultCommands();

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
