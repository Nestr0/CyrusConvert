import { HiOutlineTrash, HiCheckCircle, HiXCircle, HiClock, HiRefresh } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { formatFileSize, formatDimensions } from '../utils/format';
import type { JobStatus } from '../types';

function StatusBadge({ status }: { status: JobStatus }) {
  const { t } = useTranslation();
  const config = {
    waiting: { icon: HiClock, color: 'text-content-tertiary', bg: 'bg-surface-overlay', label: t('queue.waiting') },
    converting: { icon: HiRefresh, color: 'text-accent', bg: 'bg-accent/10', label: t('queue.converting') },
    completed: { icon: HiCheckCircle, color: 'text-status-success', bg: 'bg-status-success/10', label: t('queue.done') },
    failed: { icon: HiXCircle, color: 'text-status-error', bg: 'bg-status-error/10', label: t('queue.failed') },
  };
  const c = config[status];
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${c.color} ${c.bg}`}>
      <Icon className={status === 'converting' ? 'animate-spin' : ''} />
      {c.label}
    </span>
  );
}

export function ImageQueue() {
  const { t } = useTranslation();
  const { jobs, removeJob, clearJobs, isConverting } = useAppStore();

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-content-tertiary">
        <p className="text-sm">{t('queue.noImages')}</p>
        <p className="text-xs mt-1">{t('queue.addImages')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs font-medium text-content-secondary">
          {t('queue.imagesInQueue', { count: jobs.length })}
        </span>
        {!isConverting && (
          <button onClick={clearJobs} className="btn-icon text-xs flex items-center gap-1" title={t('queue.clearAll')}>
            <HiOutlineTrash className="text-sm" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-overlay transition-colors group"
          >
            {/* Thumbnail */}
            <div className="w-10 h-10 rounded-lg bg-surface-overlay overflow-hidden flex-shrink-0 border border-border-subtle">
              {job.thumbnail ? (
                <img src={job.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-content-disabled text-xs">
                  ?
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-content truncate">{job.fileName}</p>
              <div className="flex items-center gap-2 text-[10px] text-content-tertiary">
                {job.fileSize > 0 && <span>{formatFileSize(job.fileSize)}</span>}
                {job.width && job.height && <span>{formatDimensions(job.width, job.height)}</span>}
                {job.estimatedOutputSize != null && job.status === 'waiting' && (
                  <span className="text-accent">→ {formatFileSize(job.estimatedOutputSize)}</span>
                )}
              </div>
            </div>

            {/* Status */}
            <StatusBadge status={job.status} />

            {/* Remove button */}
            {!isConverting && (
              <button
                onClick={() => removeJob(job.id)}
                className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
                title={t('queue.remove')}
              >
                <HiOutlineTrash className="text-sm" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}