import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useIpcListeners() {
  const { setProgress, updateJobStatus, setSummary, setIsConverting } = useAppStore();

  useEffect(() => {
    const unsubProgress = window.electronAPI.onProgress((progress) => {
      setProgress(progress);
      setIsConverting(progress.isConverting);
    });

    const unsubJobUpdate = window.electronAPI.onJobUpdate((update) => {
      updateJobStatus(update.id, update.status, update.progress, update.error, update.outputPath);
    });

    const unsubComplete = window.electronAPI.onComplete((summary) => {
      setSummary(summary);
      setIsConverting(false);
    });

    return () => {
      unsubProgress();
      unsubJobUpdate();
      unsubComplete();
    };
  }, [setProgress, updateJobStatus, setSummary, setIsConverting]);
}