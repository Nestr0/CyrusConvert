import { HiCheckCircle, HiXCircle, HiOutlineFolderOpen, HiClock } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { formatDuration } from '../utils/format';

export function CompletionScreen() {
  const { t } = useTranslation();
  const { summary, setSummary, clearJobs } = useAppStore();

  if (!summary) return null;

  const handleOpenFolder = () => {
    window.electronAPI.openOutputFolder(summary.outputFolder);
  };

  const handleDismiss = () => {
    setSummary(null);
    clearJobs();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-raised border border-border rounded-3xl p-8 max-w-md w-full shadow-elevated animate-slide-up">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-status-success/10 flex items-center justify-center mx-auto mb-4">
            <HiCheckCircle className="text-3xl text-status-success" />
          </div>
          <h2 className="text-lg font-semibold text-content">{t('completion.title')}</h2>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-surface-overlay rounded-xl p-3 text-center">
            <HiCheckCircle className="text-status-success text-lg mx-auto mb-1" />
            <p className="text-xl font-bold text-content">{summary.totalConverted}</p>
            <p className="text-[10px] text-content-tertiary uppercase tracking-wider">{t('completion.converted')}</p>
          </div>
          <div className="bg-surface-overlay rounded-xl p-3 text-center">
            <HiXCircle className="text-status-error text-lg mx-auto mb-1" />
            <p className="text-xl font-bold text-content">{summary.totalFailed}</p>
            <p className="text-[10px] text-content-tertiary uppercase tracking-wider">{t('completion.failed')}</p>
          </div>
          <div className="bg-surface-overlay rounded-xl p-3 text-center">
            <HiClock className="text-accent text-lg mx-auto mb-1" />
            <p className="text-xl font-bold text-content">{formatDuration(summary.elapsedMs)}</p>
            <p className="text-[10px] text-content-tertiary uppercase tracking-wider">{t('completion.elapsed')}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleOpenFolder} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <HiOutlineFolderOpen className="text-base" />
            {t('completion.openOutputFolder')}
          </button>
          <button onClick={handleDismiss} className="btn-secondary flex-1">
            {t('completion.done')}
          </button>
        </div>
      </div>
    </div>
  );
}