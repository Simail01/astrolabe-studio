import { registerFileHandlers } from './file';
import { registerProjectHandlers } from './project';
import { registerSessionHandlers } from './session';
import { registerExportHandlers } from './export';
import { registerAIHandlers } from './ai';
import { registerWikiHandlers } from './wiki';
import { registerFanlibHandlers } from './fanlib';
import { registerDesignHandlers } from './design';
import { registerPipelineHandlers } from './pipeline';
import { registerStoryboardHandlers } from './storyboard';
import { registerTemplateHandlers } from './template';
import { registerDialogHandlers } from './dialog';
import { registerWorkspaceHandlers } from './workspace';

export function registerAllHandlers(): void {
  registerFileHandlers();
  registerProjectHandlers();
  registerSessionHandlers();
  registerExportHandlers();
  registerAIHandlers();
  registerWikiHandlers();
  registerFanlibHandlers();
  registerDesignHandlers();
  registerPipelineHandlers();
  registerStoryboardHandlers();
  registerTemplateHandlers();
  registerDialogHandlers();
  registerWorkspaceHandlers();
}
