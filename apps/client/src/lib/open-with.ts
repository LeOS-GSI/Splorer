import { TauriAPI } from '@/lib/tauri-api';
import { type OpenHandler, getAppHandlerId } from '@/hooks/use-open-with-prefs';

/**
 * Run an "external" open handler (VS Code, system default or a specific
 * desktop application). Returns `false` for handlers that have to be handled
 * by the caller (the built-in editor).
 */
export const runExternalOpenHandler = async (
  filePath: string,
  handler: OpenHandler,
): Promise<boolean> => {
  const appId = getAppHandlerId(handler);
  if (appId) {
    await TauriAPI.launchDesktopApp(appId, [filePath]);
    return true;
  }
  switch (handler) {
    case 'vscode': {
      const dir = filePath.replace(/[/\\][^/\\]*$/, '');
      await TauriAPI.executeCommand(`code "${filePath}"`, dir);
      return true;
    }
    case 'system':
      await TauriAPI.openFile(filePath);
      return true;
    default:
      return false;
  }
};
