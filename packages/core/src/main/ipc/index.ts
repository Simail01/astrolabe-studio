import { registerFileHandlers } from './file';
import { registerProjectHandlers } from './project';
import { registerSessionHandlers } from './session';
import { registerExportHandlers } from './export';

export function registerAllHandlers(): void {
  registerFileHandlers();
  registerProjectHandlers();
  registerSessionHandlers();
  registerExportHandlers();
}
