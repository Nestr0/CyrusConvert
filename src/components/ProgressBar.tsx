import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { formatDuration } from '../utils/format';

export function ProgressBar() {
  const { t } = useTranslation();
  const { progress, isConverting, jobs } = useAppStore();

  if (!isConverting && progress.totalFiles === 0) return null;

  const total = progress.totalFiles || jobs.length;
  const processed = progress.completedFiles + progress.failedFiles;
  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="px-6 py-3 border-t border-border bg-surface-raised space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-content-secondary font-medium">
          {isConverting ? t('progress.converting') : t('progress.complete')}
        </span>
        <div className="flex items-center gap-4 text-content-tertiary">
          {progress.currentFile && isConverting && (
            <span className="truncate max-w-[200px]">{progress.currentFile}</span>
          )}
          <span>{processed}/{total}</span>
          {progress.failedFiles > 0 && (
            <span className="text-status-error">{t('progress.failed', { count: progress.failedFiles })}</span>
          )}
          {isConverting && progress.estimatedRemainingMs !== null && (
            <span>{t('progress.left', { time: formatDuration(progress.estimatedRemainingMs) })}</span>
          )}
          {!isConverting && progress.elapsedMs > 0 && (
            <span>{formatDuration(progress.elapsedMs)}</span>
          )}
        </div>
      </div>
      <div className="w-full h-1.5 bg-surface-overlay rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            progress.failedFiles > 0 && !isConverting ? 'bg-status-warning' : 'bg-accent'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}