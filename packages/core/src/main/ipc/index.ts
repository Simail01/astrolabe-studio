import { registerFileHandlers } from './file';
import { registerProjectHandlers } from './project';
import { registerSessionHandlers } from './session';
import { registerExportHandlers } from './export';
import { registerAIHandlers } from './ai';
import { registerWikiHandlers } from './wiki';

export function registerAllHandlers(): void {
  registerFileHandlers();
  registerProjectHandlers();
  registerSessionHandlers();
  registerExportHandlers();
  registerAIHandlers();
  registerWikiHandlers();
}
