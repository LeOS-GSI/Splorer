import i18n from '@/i18n';
import { FileEntry } from '@/lib/tauri-api';

export interface SelectionCriteria {
  type: 'extension' | 'dateRange' | 'sizeRange' | 'similar' | 'invert' | 'pattern';
  extensions?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  minSize?: number;
  maxSize?: number;
  similarTo?: FileEntry;
  pattern?: string;
}

export interface SelectionResult {
  matched: string[];
  total: number;
}

export interface DateRangePreset {
  label: string;
  getRange: () => { from: Date; to: Date };
}

export interface SizeRangePreset {
  label: string;
  min: number;
  max: number;
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    get label() {
      return i18n.t('advSel.ranges.today');
    },
    getRange: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { from: today, to: tomorrow };
    },
  },
  {
    get label() {
      return i18n.t('advSel.ranges.yesterday');
    },
    getRange: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return { from: yesterday, to: today };
    },
  },
  {
    get label() {
      return i18n.t('advSel.ranges.last7');
    },
    getRange: () => {
      const now = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { from: weekAgo, to: now };
    },
  },
  {
    get label() {
      return i18n.t('advSel.ranges.last30');
    },
    getRange: () => {
      const now = new Date();
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      return { from: monthAgo, to: now };
    },
  },
  {
    get label() {
      return i18n.t('advSel.ranges.thisMonth');
    },
    getRange: () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfMonth, to: now };
    },
  },
  {
    get label() {
      return i18n.t('advSel.ranges.lastMonth');
    },
    getRange: () => {
      const now = new Date();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: startOfLastMonth, to: endOfLastMonth };
    },
  },
  {
    get label() {
      return i18n.t('advSel.ranges.thisYear');
    },
    getRange: () => {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { from: startOfYear, to: now };
    },
  },
];

export const SIZE_RANGE_PRESETS: SizeRangePreset[] = [
  {
    get label() {
      return i18n.t('advSel.sizes.tiny');
    },
    min: 0,
    max: 10 * 1024,
  },
  {
    get label() {
      return i18n.t('advSel.sizes.small');
    },
    min: 10 * 1024,
    max: 100 * 1024,
  },
  {
    get label() {
      return i18n.t('advSel.sizes.medium');
    },
    min: 100 * 1024,
    max: 1024 * 1024,
  },
  {
    get label() {
      return i18n.t('advSel.sizes.large');
    },
    min: 1024 * 1024,
    max: 10 * 1024 * 1024,
  },
  {
    get label() {
      return i18n.t('advSel.sizes.veryLarge');
    },
    min: 10 * 1024 * 1024,
    max: 100 * 1024 * 1024,
  },
  {
    get label() {
      return i18n.t('advSel.sizes.huge');
    },
    min: 100 * 1024 * 1024,
    max: Infinity,
  },
];

export const COMMON_FILE_TYPES: { label: string; extensions: string[] }[] = [
  {
    get label() {
      return i18n.t('search.filterImages');
    },
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'],
  },
  {
    get label() {
      return i18n.t('search.filterDocuments');
    },
    extensions: ['doc', 'docx', 'pdf', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'],
  },
  {
    get label() {
      return i18n.t('search.filterVideos');
    },
    extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
  },
  {
    get label() {
      return i18n.t('search.filterAudio');
    },
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
  },
  {
    get label() {
      return i18n.t('search.filterArchives');
    },
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
  },
  {
    label: 'Code',
    extensions: [
      'js',
      'ts',
      'jsx',
      'tsx',
      'py',
      'java',
      'c',
      'cpp',
      'h',
      'cs',
      'go',
      'rs',
      'rb',
      'php',
    ],
  },
  {
    label: 'Web',
    extensions: ['html', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml', 'yml'],
  },
  { label: 'Executables', extensions: ['exe', 'msi', 'bat', 'cmd', 'sh', 'app', 'dmg'] },
];
