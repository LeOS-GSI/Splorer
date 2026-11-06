import i18n from '@/i18n';
import React, { useState, useCallback, useEffect } from 'react';
import { FileEntry } from '@/lib/tauri-api';
import {
  ContextMenuExtension,
  ContextMenuItem,
  contextMenuRegistry,
} from '@/lib/context-menu-factory';
import {
  Link,
  Sparkles,
  FileText,
  Calendar,
  BarChart3,
  RotateCcw,
  Image as ImageIcon,
  StickyNote,
  Film,
  Music,
} from 'lucide-react';
import { SelectByExtensionDialog } from './SelectByExtensionDialog';
import { SelectByDateDialog } from './SelectByDateDialog';
import { SelectBySizeDialog } from './SelectBySizeDialog';
import {
  selectByExtension,
  selectByDateRange,
  selectBySizeRange,
  selectSimilar,
  invertSelection,
  selectByPattern,
} from './selection-utils';

interface AdvancedSelectionExtensionProps {
  files: FileEntry[];
  selectedFiles: Set<string>;
  setSelectedFiles: (files: Set<string>) => void;
  showToast: (options: {
    title: string;
    description: string;
    variant?: 'default' | 'destructive';
  }) => void;
}

export const AdvancedSelectionExtension = ({
  files,
  selectedFiles,
  setSelectedFiles,
  showToast,
}: AdvancedSelectionExtensionProps) => {
  // Dialog states
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [sizeDialogOpen, setSizeDialogOpen] = useState(false);

  // Store reference file for "similar" selection
  const [_similarToFile, _setSimilarToFile] = useState<FileEntry | null>(null);

  // Selection handlers
  const handleSelectByExtension = useCallback(
    (extensions: string[]) => {
      const matched = selectByExtension(files, extensions);
      if (matched.length > 0) {
        setSelectedFiles(new Set(matched));
        showToast({
          title: i18n.t('advSel.updated'),
          description: i18n.t('advSel.byExtDesc', {
            count: matched.length,
            exts: extensions.map((e) => `.${e}`).join(', '),
          }),
        });
      } else {
        showToast({
          title: i18n.t('advSel.noneFound'),
          description: i18n.t('advSel.noneWithExt'),
          variant: 'destructive',
        });
      }
    },
    [files, setSelectedFiles, showToast],
  );

  const handleSelectByDate = useCallback(
    (dateFrom: Date, dateTo: Date) => {
      const matched = selectByDateRange(files, dateFrom, dateTo);
      if (matched.length > 0) {
        setSelectedFiles(new Set(matched));
        showToast({
          title: i18n.t('advSel.updated'),
          description: i18n.t('advSel.byDateDesc', {
            count: matched.length,
            from: dateFrom.toLocaleDateString(),
            to: dateTo.toLocaleDateString(),
          }),
        });
      } else {
        showToast({
          title: i18n.t('advSel.noneFound'),
          description: i18n.t('advSel.noneInDate'),
          variant: 'destructive',
        });
      }
    },
    [files, setSelectedFiles, showToast],
  );

  const handleSelectBySize = useCallback(
    (minSize: number, maxSize: number) => {
      const matched = selectBySizeRange(files, minSize, maxSize);
      if (matched.length > 0) {
        setSelectedFiles(new Set(matched));
        const sizeDesc =
          maxSize === Infinity
            ? i18n.t('advSel.largerThan', { size: formatSize(minSize) })
            : i18n.t('advSel.between', { min: formatSize(minSize), max: formatSize(maxSize) });
        showToast({
          title: i18n.t('advSel.updated'),
          description: i18n.t('advSel.bySizeDesc', { count: matched.length, range: sizeDesc }),
        });
      } else {
        showToast({
          title: i18n.t('advSel.noneFound'),
          description: i18n.t('advSel.noneInSize'),
          variant: 'destructive',
        });
      }
    },
    [files, setSelectedFiles, showToast],
  );

  const handleSelectSimilar = useCallback(
    (file: FileEntry) => {
      const matched = selectSimilar(files, file);
      // Include the original file in selection
      const allMatched = [file.path, ...matched];
      setSelectedFiles(new Set(allMatched));
      showToast({
        title: i18n.t('advSel.updated'),
        description: i18n.t('advSel.similarDesc', {
          count: allMatched.length,
          type: file.file_type,
        }),
      });
    },
    [files, setSelectedFiles, showToast],
  );

  const handleInvertSelection = useCallback(() => {
    const matched = invertSelection(files, selectedFiles);
    setSelectedFiles(new Set(matched));
    showToast({
      title: i18n.t('advSel.inverted'),
      description: i18n.t('advSel.invertedDesc', { count: matched.length }),
    });
  }, [files, selectedFiles, setSelectedFiles, showToast]);

  const _handleSelectByPattern = useCallback(
    (pattern: string) => {
      const matched = selectByPattern(files, pattern);
      if (matched.length > 0) {
        setSelectedFiles(new Set(matched));
        showToast({
          title: i18n.t('advSel.updated'),
          description: i18n.t('advSel.patternDesc', { count: matched.length, pattern }),
        });
      } else {
        showToast({
          title: i18n.t('advSel.noneFound'),
          description: i18n.t('advSel.noPatternMatch', { pattern }),
          variant: 'destructive',
        });
      }
    },
    [files, setSelectedFiles, showToast],
  );

  // Register context menu extension
  useEffect(() => {
    const advancedSelectionExtension: ContextMenuExtension = {
      id: 'advanced-selection',
      name: i18n.t('advSel.title'),

      getFileActions: (file: FileEntry, _selectedFiles: Set<string>) => {
        const items: ContextMenuItem[] = [];

        // Add "Select Similar" option
        items.push({
          id: 'select-similar',
          label: i18n.t('advSel.similar'),
          icon: <Link size={14} className="inline-block" />,
          action: () => handleSelectSimilar(file),
        });

        return items;
      },

      getEmptySpaceActions: (_currentPath: string) => {
        const items: ContextMenuItem[] = [];

        // Add Advanced Selection submenu
        items.push({
          id: 'advanced-selection',
          label: i18n.t('advSel.title'),
          icon: <Sparkles size={14} className="inline-block" />,
          submenu: [
            {
              id: 'select-by-extension',
              label: i18n.t('advSel.byType'),
              icon: <FileText size={14} className="inline-block" />,
              action: () => setExtensionDialogOpen(true),
            },
            {
              id: 'select-by-date',
              label: i18n.t('advSel.byDate'),
              icon: <Calendar size={14} className="inline-block" />,
              action: () => setDateDialogOpen(true),
            },
            {
              id: 'select-by-size',
              label: i18n.t('advSel.bySize'),
              icon: <BarChart3 size={14} className="inline-block" />,
              action: () => setSizeDialogOpen(true),
            },
            {
              id: 'sep-1',
              label: '',
              separator: true,
            },
            {
              id: 'invert-selection',
              label: i18n.t('advSel.invert'),
              icon: <RotateCcw size={14} className="inline-block" />,
              shortcut: 'Ctrl+I',
              action: handleInvertSelection,
            },
            {
              id: 'sep-2',
              label: '',
              separator: true,
            },
            {
              id: 'select-all-images',
              label: i18n.t('advSel.allImages'),
              icon: <ImageIcon size={14} className="inline-block" />,
              action: () =>
                handleSelectByExtension(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp']),
            },
            {
              id: 'select-all-documents',
              label: i18n.t('advSel.allDocuments'),
              icon: <StickyNote size={14} className="inline-block" />,
              action: () => handleSelectByExtension(['doc', 'docx', 'pdf', 'txt', 'rtf', 'odt']),
            },
            {
              id: 'select-all-videos',
              label: i18n.t('advSel.allVideos'),
              icon: <Film size={14} className="inline-block" />,
              action: () =>
                handleSelectByExtension(['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm']),
            },
            {
              id: 'select-all-audio',
              label: i18n.t('advSel.allAudio'),
              icon: <Music size={14} className="inline-block" />,
              action: () =>
                handleSelectByExtension(['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a']),
            },
          ],
        });

        return items;
      },
    };

    // Register the extension
    contextMenuRegistry.register(advancedSelectionExtension);

    // Cleanup on unmount
    return () => {
      contextMenuRegistry.unregister('advanced-selection');
    };
  }, [handleSelectSimilar, handleSelectByExtension, handleInvertSelection]);

  // Keyboard shortcut for invert selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if focus is on an input element
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      // Ctrl+I to invert selection
      if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        handleInvertSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleInvertSelection]);

  return (
    <>
      <SelectByExtensionDialog
        isOpen={extensionDialogOpen}
        onClose={() => setExtensionDialogOpen(false)}
        onSelect={handleSelectByExtension}
        files={files}
      />
      <SelectByDateDialog
        isOpen={dateDialogOpen}
        onClose={() => setDateDialogOpen(false)}
        onSelect={handleSelectByDate}
        files={files}
      />
      <SelectBySizeDialog
        isOpen={sizeDialogOpen}
        onClose={() => setSizeDialogOpen(false)}
        onSelect={handleSelectBySize}
        files={files}
      />
    </>
  );
};

// Helper function for size formatting
const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  if (bytes === Infinity) return 'Unlimited';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
};
