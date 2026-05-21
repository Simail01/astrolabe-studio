import type { ComponentType } from 'react';

export type ViewLocation = 'activitybar' | 'editor' | 'rightpanel' | 'bottompanel';

export interface ViewContribution {
  id: string;
  title: string;
  location: ViewLocation;
  icon?: string;
  component: ComponentType;
  order?: number;
}

export interface Command {
  id: string;
  label: string;
  category: '作品' | '章节' | '角色' | '同人库' | 'AI' | '视图';
  keybinding?: string;
  enabled?: () => boolean;
  handler: () => void | Promise<void>;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  views: ViewContribution[];
  commands: Command[];
}
