import { useCallback } from 'react';
import { TauriAPI, type FileEntry } from '@/lib/tauri-api';
import { formatError } from '@/lib/file-operation-helpers';
import i18n from '@/i18n';
import { runExternalOpenHandler } from '@/lib/open-with';
import { showConfirmationToast } from '@/components/ui/Toast';
import type { TabItem, EditorGroup } from '@/types/split-view';
import type { SplitLayoutHook } from '@/hooks/use-split-layout';
import type { Toast } from '@/hooks/use-toast';
import type { CrossTabSelectionState } from '@/hooks/use-cross-tab-selection';
import {
  type OpenHandler,
  isCodeFile,
  getFileExtension,
  getOpenPreference,
} from '@/hooks/use-open-with-prefs';

export interface FileActionsDeps {
  splitLayoutRef: React.MutableRefObject<SplitLayoutHook>;
  activeGroupRef: React.MutableRefObject<EditorGroup>;
  setSelectedFiles: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectedFile: React.Dispatch<React.SetStateAction<FileEntry | null>>;
  toast: (opts: Toast) => void;
  navigateWithHistory: (path: string) => void;
  crossTabSelection: CrossTabSelectionState;
  refetch: () => void;
  openOpenWithDialog?: (path: string, onChoose?: (handler: OpenHandler) => void) => void;
}

export const useFileActions = (deps: FileActionsDeps) => {
  const {
    splitLayoutRef,
    activeGroupRef,
    setSelectedFiles,
    setSelectedFile,
    toast,
    navigateWithHistory,
    crossTabSelection,
    refetch,
    openOpenWithDialog,
  } = deps;

  const addTab = useCallback(
    (file: FileEntry) => {
      const newTab: TabItem = {
        id: file.path,
        name: file.name,
        path: file.path,
        type: file.is_dir ? 'folder' : 'file',
      };
      splitLayoutRef.current.addTab(activeGroupRef.current.id, newTab, true);
    },
    [splitLayoutRef, activeGroupRef],
  );

  const toggleFileSelection = useCallback(
    (filePath: string) => {
      setSelectedFiles((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(filePath)) {
          newSet.delete(filePath);
        } else {
          newSet.add(filePath);
        }
        return newSet;
      });
    },
    [setSelectedFiles],
  );

  const handleFileClick = useCallback(
    (file: FileEntry, event?: React.MouseEvent) => {
      setSelectedFile(file);
      if (event && (event.ctrlKey || event.metaKey)) {
        toggleFileSelection(file.path);
        return;
      }
      setSelectedFiles(new Set([file.path]));
    },
    [setSelectedFile, setSelectedFiles, toggleFileSelection],
  );

  /** Execute a chosen open handler for a file. */
  const executeOpenHandler = useCallback(
    async (file: FileEntry, handler: OpenHandler) => {
      try {
        if (handler === 'xplorer-editor') {
          const editorTab: TabItem = {
            id: `editor-${file.path}-${Date.now()}`,
            name: file.name,
            path: file.path,
            type: 'editor',
          };
          splitLayoutRef.current.addTab(activeGroupRef.current.id, editorTab, true);
        } else {
          await runExternalOpenHandler(file.path, handler);
        }
      } catch (error) {
        console.error('Failed to open file:', error);
        toast({
          variant: 'destructive',
          title: i18n.t('toast.openFileFailed'),
          description: i18n.t('toast.openFileFailedDesc', {
            name: file.name,
            error: formatError(error),
          }),
        });
      }
    },
    [splitLayoutRef, activeGroupRef, toast],
  );

  const handleFileDoubleClick = useCallback(
    async (file: FileEntry) => {
      TauriAPI.addRecentFile(file.path).catch((err) =>
        console.error('Failed to add recent file:', err),
      );
      if (file.is_dir) {
        navigateWithHistory(file.path);
        return;
      }

      // A remembered "Open With" choice applies to every file type
      const ext = getFileExtension(file.path);
      const savedPref = ext ? getOpenPreference(ext) : null;
      if (savedPref) {
        await executeOpenHandler(file, savedPref);
        return;
      }

      // For code/text files without a saved preference, show the Open With prompt
      if (isCodeFile(file.path)) {
        if (openOpenWithDialog) {
          openOpenWithDialog(file.path, (handler: OpenHandler) => {
            executeOpenHandler(file, handler);
          });
          return;
        }
      }

      // Default: open with system
      try {
        await TauriAPI.openFile(file.path);
      } catch (error) {
        console.error('Failed to open file:', error);
        toast({
          variant: 'destructive',
          title: i18n.t('toast.openFileFailed'),
          description: i18n.t('toast.openFileFailedDesc', {
            name: file.name,
            error: formatError(error),
          }),
        });
      }
    },
    [toast, navigateWithHistory, executeOpenHandler, openOpenWithDialog],
  );

  // ── Cross-tab batch operation handlers ────────────────────────────────────

  const handleCrossTabPickFolder = useCallback(async (): Promise<string | null> => {
    const result = await TauriAPI.showOpenDialog({ directory: true });
    return result && result.length > 0 ? result[0] : null;
  }, []);

  const handleCrossTabMoveAll = useCallback(
    async (destination: string) => {
      const allFiles = crossTabSelection.getAllSelectedFiles();
      let moved = 0;
      for (const { file } of allFiles) {
        try {
          const sep = destination.includes('/') ? '/' : '\\';
          const destPath = `${destination}${sep}${file.name}`;
          await TauriAPI.moveFile(file.path, destPath);
          moved++;
        } catch (err) {
          toast({
            variant: 'destructive',
            title: i18n.t('toast.moveFailed'),
            description: i18n.t('toast.moveFailedDesc', {
              name: file.name,
              error: formatError(err),
            }),
          });
        }
      }
      if (moved > 0) {
        toast({
          title: i18n.t('toast.moved'),
          description: i18n.t('toast.movedFilesTo', { count: moved, destination }),
        });
        crossTabSelection.clearAll();
        refetch();
      }
    },
    [crossTabSelection, toast, refetch],
  );

  const handleCrossTabCopyAll = useCallback(
    async (destination: string) => {
      const allFiles = crossTabSelection.getAllSelectedFiles();
      let copied = 0;
      for (const { file } of allFiles) {
        try {
          const sep = destination.includes('/') ? '/' : '\\';
          const destPath = `${destination}${sep}${file.name}`;
          if (file.is_dir) {
            await TauriAPI.acceleratedCopyDirectory(file.path, destPath);
          } else {
            await TauriAPI.acceleratedCopyFile(file.path, destPath);
          }
          copied++;
        } catch (err) {
          toast({
            variant: 'destructive',
            title: i18n.t('toast.copyFailed'),
            description: i18n.t('toast.copyFailedDesc', {
              name: file.name,
              error: formatError(err),
            }),
          });
        }
      }
      if (copied > 0) {
        toast({
          title: i18n.t('toast.copied'),
          description: i18n.t('toast.copiedFilesTo', { count: copied, destination }),
        });
        crossTabSelection.clearAll();
        refetch();
      }
    },
    [crossTabSelection, toast, refetch],
  );

  const handleCrossTabCompressAll = useCallback(
    async (destination: string) => {
      const allFiles = crossTabSelection.getAllSelectedFiles();
      const filePaths = allFiles.map(({ file }: { file: FileEntry }) => file.path);
      if (filePaths.length === 0) return;
      try {
        const sep = destination.includes('/') ? '/' : '\\';
        const archiveName = `batch-${Date.now()}.zip`;
        const outputPath = `${destination}${sep}${archiveName}`;
        await TauriAPI.compressFiles(filePaths, outputPath, {
          format: 'Zip',
          compression_level: 6,
          include_hidden: false,
          follow_symlinks: false,
        });
        toast({
          title: i18n.t('toast.compressed'),
          description: i18n.t('toast.compressedDesc', {
            archive: archiveName,
            count: filePaths.length,
          }),
        });
        crossTabSelection.clearAll();
        refetch();
      } catch (err) {
        toast({
          variant: 'destructive',
          title: i18n.t('toast.compressionFailed'),
          description: formatError(err),
        });
      }
    },
    [crossTabSelection, toast, refetch],
  );

  const handleCrossTabDeleteAll = useCallback(async () => {
    const allFiles = crossTabSelection.getAllSelectedFiles();
    const confirmed = await showConfirmationToast({
      title: i18n.t('toast.deleteCrossTabTitle'),
      description: i18n.t('toast.deleteCrossTabDesc', {
        count: allFiles.length,
        tabs: crossTabSelection.selectedTabCount,
      }),
      confirmText: 'Move to Recycle Bin',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;
    let deleted = 0;
    for (const { file } of allFiles) {
      try {
        await TauriAPI.moveToTrash(file.path);
        deleted++;
      } catch (err) {
        toast({
          variant: 'destructive',
          title: i18n.t('toast.deleteFailed'),
          description: i18n.t('toast.deleteFailedDesc', {
            name: file.name,
            error: formatError(err),
          }),
        });
      }
    }
    if (deleted > 0) {
      toast({
        title: i18n.t('toast.deleted'),
        description: i18n.t('toast.movedToBin', { count: deleted }),
      });
      crossTabSelection.clearAll();
      refetch();
    }
  }, [crossTabSelection, toast, refetch]);

  return {
    addTab,
    toggleFileSelection,
    handleFileClick,
    handleFileDoubleClick,
    handleCrossTabPickFolder,
    handleCrossTabMoveAll,
    handleCrossTabCopyAll,
    handleCrossTabCompressAll,
    handleCrossTabDeleteAll,
  };
};
