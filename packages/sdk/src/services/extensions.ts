import { transport } from '../transport';
import type { ExtensionPackageInfo, ExtensionManifestInfo, ShortcutKey } from '../types';

export const getInstalledExtensions = async (): Promise<ExtensionPackageInfo[]> => {
  return await transport('get_installed_extensions');
};

export const installExtensionFromPath = async (
  extensionPath: string,
): Promise<ExtensionPackageInfo> => {
  return await transport('install_extension_from_path', { extensionPath });
};

export const uninstallExtensionById = async (extensionId: string): Promise<void> => {
  return await transport('uninstall_extension_by_id', { extensionId });
};

export const activateExtension = async (extensionId: string): Promise<void> => {
  return await transport('activate_extension', { extensionId });
};

export const deactivateExtension = async (extensionId: string): Promise<void> => {
  return await transport('deactivate_extension', { extensionId });
};

export const getActiveExtensionIds = async (): Promise<string[]> => {
  return await transport('get_active_extension_ids');
};

export const getExtensionPermissions = async (extensionId: string): Promise<string[]> => {
  return await transport('get_extension_permissions', { extensionId });
};

export const validateExtensionPath = async (
  extensionPath: string,
): Promise<ExtensionManifestInfo> => {
  return await transport('validate_extension_path', { extensionPath });
};

export const packExtension = async (extensionDir: string, outputPath?: string): Promise<string> => {
  return await transport('pack_extension', { extensionDir, outputPath: outputPath || null });
};

export const installXtensionFile = async (xtensionPath: string): Promise<ExtensionPackageInfo> => {
  return await transport('install_xtension_file', { xtensionPath });
};

export const inspectXtensionFile = async (xtensionPath: string): Promise<ExtensionManifestInfo> => {
  return await transport('inspect_xtension_file', { xtensionPath });
};

export const nativePluginInvoke = async (
  extensionId: string,
  pluginId: string,
  command: string,
  args: Record<string, unknown>,
): Promise<unknown> => {
  return await transport('native_plugin_invoke', { extensionId, pluginId, command, args });
};

export const registerExtensionShortcut = async (
  extensionId: string,
  shortcutId: string,
  name: string,
  description: string | null,
  keyCombination: ShortcutKey,
  action: string,
  context: string[],
): Promise<void> => {
  return await transport('register_extension_shortcut', {
    extensionId,
    shortcutId,
    name,
    description,
    keyCombination,
    action,
    context,
  });
};

export const unregisterExtensionShortcuts = async (extensionId: string): Promise<void> => {
  return await transport('unregister_extension_shortcuts', { extensionId });
};
