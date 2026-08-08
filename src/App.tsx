import { useEffect, useCallback, useRef } from 'react';
import { HiOutlinePlay, HiOutlineStop } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { ImageQueue } from './components/ImageQueue';
import { SettingsPanel } from './components/SettingsPanel';
import { ProgressBar } from './components/ProgressBar';
import { CompletionScreen } from './components/CompletionScreen';
import { useAppStore } from './store/useAppStore';
import { useIpcListeners } from './hooks/useIpcListeners';
import { useState } from 'react';

export function App() {
  const { t } = useTranslation();
  const { jobs, settings, outputFolder, isConverting, setIsConverting, setSummary, setOutputFolder, setSettings } = useAppStore();
  const [version, setVersion] = useState('1.0.0');

  useIpcListeners();

  // Load saved settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const saved = await window.electronAPI.getSettings();
        if (saved) {
          if (saved.lastOutputFolder) setOutputFolder(saved.lastOutputFolder);
          const { lastOutputFolder, ...rest } = saved;
          if (Object.keys(rest).length > 0) {
            setSettings({ ...settings, ...rest });
          }
        }
        const v = await window.electronAPI.getAppVersion();
        setVersion(v);
      } catch {
        // Ignore errors during init
      }
    }
    loadSettings();
  }, []);

  // Save settings when they change
  useEffect(() => {
    const timeout = setTimeout(() => {
      window.electronAPI.saveSettings({ ...settings, lastOutputFolder: outputFolder });
    }, 500);
    return () => clearTimeout(timeout);
  }, [settings, outputFolder]);

  // Re-estimate output sizes when settings change
  const prevSettingsRef = useRef(settings);
  useEffect(() => {
    // Skip initial render
    if (prevSettingsRef.current === settings) return;
    prevSettingsRef.current = settings;

    // Only re-estimate if not converting and there are waiting jobs
    if (isConverting || jobs.length === 0) return;

    const waitingJobs = jobs.filter((j) => j.status === 'waiting');
    if (waitingJobs.length === 0) return;

    // Debounce the estimation to avoid too many calls while user is adjusting settings
    const timeout = setTimeout(() => {
      waitingJobs.forEach((job) => {
        window.electronAPI.estimateOutputSize(job.filePath, settings).then((estimatedSize) => {
          if (estimatedSize !== null) {
            useAppStore.getState().updateJobEstimatedSize(job.id, estimatedSize);
          }
        }).catch(() => {
          // Ignore estimation errors
        });
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [settings, jobs, isConverting]);

  const handleStartConversion = useCallback(async () => {
    if (jobs.length === 0 || !outputFolder) return;
    setIsConverting(true);
    setSummary(null);
    await window.electronAPI.startConversion(
      jobs.map((j) => j.filePath),
      settings,
      outputFolder
    );
  }, [jobs, settings, outputFolder, setIsConverting, setSummary]);

  const handleCancelConversion = useCallback(async () => {
    await window.electronAPI.cancelConversion();
    setIsConverting(false);
  }, [setIsConverting]);

  const canConvert = jobs.length > 0 && outputFolder.length > 0 && !isConverting;

  return (
    <div className="flex flex-col h-screen bg-surface">
      <Header version={version} />

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Drop Zone + Queue */}
          <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
            {jobs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-lg">
                  <DropZone />
                </div>
              </div>
            ) : (
              <>
                <div className="flex-shrink-0">
                  <DropZone />
                </div>
                <div className="flex-1 bg-surface-raised border border-border rounded-2xl overflow-hidden min-h-0">
                  <ImageQueue />
                </div>
              </>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="px-6 pb-4">
            {isConverting ? (
              <button onClick={handleCancelConversion} className="btn-secondary w-full flex items-center justify-center gap-2 py-3 text-status-error border-status-error/30 hover:bg-status-error/10">
                <HiOutlineStop className="text-lg" />
                {t('actions.cancelConversion')}
              </button>
            ) : (
              <button
                onClick={handleStartConversion}
                disabled={!canConvert}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm"
              >
                <HiOutlinePlay className="text-lg" />
                {jobs.length > 0 
                  ? t('actions.convertCount', { count: jobs.length }) 
                  : t('actions.convertImages')}
              </button>
            )}
          </div>

          <ProgressBar />
        </div>

        {/* Right Settings Panel */}
        <div className="w-72 border-l border-border bg-surface-raised flex-shrink-0 overflow-hidden">
          <div className="h-full">
            <SettingsPanel />
          </div>
        </div>
      </div>

      <CompletionScreen />
    </div>
  );
}