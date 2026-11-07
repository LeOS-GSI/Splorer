import i18n from '@/i18n';
import React, { useCallback } from 'react';
import { TauriAPI } from '@/lib/tauri-api';
import { formatFileSize } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { usePerformanceStats, type CleanupSuggestion } from '@/hooks/use-performance-stats';
import {
  cardStyle,
  cardTitleStyle,
  smallBtnStyle,
  suggestionRowStyle,
  sectionHeaderStyle,
  StatRow,
  ProgressBar,
  opColor,
  formatRelativeTime,
} from '../performance-dashboard-helpers';

interface PerformanceMetricsProps {
  currentPath: string;
  allFiles: import('@/lib/tauri-api').FileEntry[];
  navigateToPath?: (path: string) => void;
  expanded: boolean;
  onToggle: () => void;
  onCollapseAll: () => void;
}

const PerformanceMetrics = ({
  currentPath,
  allFiles,
  navigateToPath,
  expanded,
  onToggle,
  onCollapseAll,
}: PerformanceMetricsProps) => {
  const {
    directoryStats,
    indexingStatus,
    recentOps,
    suggestions,
    memoryUsage,
    isLoading,
    refreshStats,
  } = usePerformanceStats(currentPath, allFiles, true);

  const handleReindex = useCallback(async () => {
    try {
      await TauriAPI.rebuildTokenIndex();
    } catch {
      // silently fail
    }
    refreshStats();
  }, [refreshStats]);

  const handleEmptyTrash = useCallback(async () => {
    try {
      await TauriAPI.emptyTrash();
    } catch {
      // silently fail
    }
    refreshStats();
  }, [refreshStats]);

  const handleSuggestionAction = useCallback(
    (suggestion: CleanupSuggestion) => {
      if (suggestion.id === 'trash') {
        handleEmptyTrash();
      } else if (suggestion.id === 'large-files' && navigateToPath) {
        navigateToPath(currentPath);
      } else if (suggestion.id === 'untagged' && navigateToPath) {
        navigateToPath(currentPath);
      }
    },
    [handleEmptyTrash, navigateToPath, currentPath],
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button onClick={onToggle} className="hover:bg-xp-surface-light" style={sectionHeaderStyle}>
          {expanded ? (
            <ChevronDown size={14} style={{ flexShrink: 0 }} />
          ) : (
            <ChevronRight size={14} style={{ flexShrink: 0 }} />
          )}
          {i18n.t('panels.performance.title')}
        </button>
        <button
          onClick={onCollapseAll}
          style={{
            fontSize: 10,
            color: 'var(--xp-text-secondary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            opacity: 0.7,
            transition: 'opacity 0.15s',
          }}
          title={i18n.t('panels.common.collapseAll')}
        >
          collapse all
        </button>
      </div>

      {expanded && (
        <div style={{ padding: '4px 12px 10px' }}>
          {/* Header with refresh */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <button
              onClick={refreshStats}
              disabled={isLoading}
              style={{
                ...smallBtnStyle,
                opacity: isLoading ? 0.5 : 1,
              }}
              title={i18n.t('panels.common.refreshStats')}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* System Stats Card */}
          <div style={cardStyle}>
            <div style={cardTitleStyle}>{i18n.t('panels.performance.systemStats')}</div>
            <StatRow label="Files" value={directoryStats.fileCount.toLocaleString()} />
            <StatRow label="Folders" value={directoryStats.folderCount.toLocaleString()} />
            <StatRow
              label={i18n.t('panels.performance.totalSize')}
              value={formatFileSize(directoryStats.totalSize)}
            />
            <StatRow
              label={i18n.t('panels.performance.foldersCached')}
              value={`${directoryStats.cachedFolderCount} folders`}
            />
            {memoryUsage !== null && (
              <StatRow
                label={i18n.t('panels.performance.jsHeap')}
                value={formatFileSize(memoryUsage)}
              />
            )}
          </div>

          {/* Indexing Status Card */}
          <div style={cardStyle}>
            <div style={cardTitleStyle}>{i18n.t('panels.performance.indexingStatus')}</div>

            {/* Search Tokenizer */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--xp-text-secondary)' }}>
                  {i18n.t('panels.performance.searchTokenizer')}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '1px 6px',
                    borderRadius: 3,
                    background: indexingStatus.isTokenizerIndexing
                      ? 'rgba(59, 130, 246, 0.2)'
                      : 'rgba(34, 197, 94, 0.15)',
                    color: indexingStatus.isTokenizerIndexing ? '#60a5fa' : '#4ade80',
                  }}
                >
                  {indexingStatus.isTokenizerIndexing ? 'Indexing' : 'Ready'}
                </span>
              </div>
              <StatRow
                label={i18n.t('panels.performance.indexedFiles')}
                value={indexingStatus.tokenTotalFiles.toLocaleString()}
              />
              <StatRow
                label={i18n.t('panels.performance.totalTokens')}
                value={indexingStatus.tokenTotalTokens.toLocaleString()}
              />
              {indexingStatus.tokenLastUpdated > 0 && (
                <StatRow
                  label={i18n.t('panels.performance.lastUpdated')}
                  value={new Date(indexingStatus.tokenLastUpdated * 1000).toLocaleTimeString()}
                />
              )}
              {indexingStatus.isTokenizerIndexing && (
                <ProgressBar value={70} max={100} color="#22c55e" />
              )}
            </div>

            {/* Reindex button */}
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleReindex}
                disabled={indexingStatus.isTokenizerIndexing}
                style={{
                  ...smallBtnStyle,
                  opacity: indexingStatus.isTokenizerIndexing ? 0.5 : 1,
                }}
              >
                Reindex
              </button>
            </div>
          </div>

          {/* Recent Operations Card */}
          <div style={cardStyle}>
            <div style={cardTitleStyle}>{i18n.t('panels.performance.recentOps')}</div>

            {recentOps.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--xp-text-secondary)', padding: '4px 0' }}>
                {i18n.t('panels.performance.noRecentOps')}
              </div>
            ) : (
              <>
                {/* Mini timeline */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    marginBottom: 10,
                    padding: '4px 0',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: 'var(--xp-border)',
                      borderRadius: 1,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-evenly',
                    }}
                  >
                    {recentOps.map((op, i) => (
                      <div
                        key={op.id || i}
                        title={`${op.operation} - ${op.success ? 'success' : 'failed'}`}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: opColor(op.operation, op.success),
                          border: '1px solid var(--xp-surface)',
                          flexShrink: 0,
                          cursor: 'default',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Operation list */}
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {recentOps.map((op, i) => (
                    <div
                      key={op.id || i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '4px 0',
                        borderBottom:
                          i < recentOps.length - 1 ? '1px solid var(--xp-border)' : 'none',
                        fontSize: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: opColor(op.operation, op.success),
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'var(--xp-text)',
                        }}
                        title={op.details || op.operation}
                      >
                        {op.operation}
                      </span>
                      {op.paths.length > 0 && (
                        <span
                          style={{
                            color: 'var(--xp-text-secondary)',
                            fontSize: 11,
                            flexShrink: 0,
                          }}
                        >
                          {op.paths.length} file{op.paths.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      <span
                        style={{
                          color: 'var(--xp-text-secondary)',
                          fontSize: 11,
                          flexShrink: 0,
                        }}
                      >
                        {formatRelativeTime(op.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Cleanup Suggestions Card */}
          {suggestions.length > 0 && (
            <div style={cardStyle}>
              <div style={cardTitleStyle}>{i18n.t('panels.performance.cleanup')}</div>
              {suggestions.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    ...suggestionRowStyle,
                    borderBottom:
                      i < suggestions.length - 1 ? '1px solid var(--xp-border)' : 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--xp-text)',
                        fontWeight: 500,
                      }}
                    >
                      {s.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--xp-text-secondary)',
                        marginTop: 2,
                      }}
                    >
                      {s.description}
                      {s.estimatedSize > 0 && (
                        <span style={{ marginLeft: 4 }}>({formatFileSize(s.estimatedSize)})</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleSuggestionAction(s)} style={smallBtnStyle}>
                    {s.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceMetrics;
