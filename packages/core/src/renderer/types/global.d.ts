import type { AstrolabeAPI } from '../../preload';

declare global {
  interface Window {
    astrolabe: AstrolabeAPI;
  }
}

export {};
