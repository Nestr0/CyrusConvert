import { useCallback, useState } from 'react';
import { HiOutlineCloudUpload, HiOutlinePhotograph, HiOutlineFolder } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import type { ImageJob } from '../types';

export function DropZone() {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const { addJobs, setIsLoading, settings, updateJobEstimatedSize } = useAppStore();

  const processFiles = useCallback(async (filePaths: string[]) => {
    if (filePaths.length === 0) return;
    setIsLoading(true);

    try {
      const newJobs: ImageJob[] = [];
      for (const filePath of filePaths) {
        try {
          const [thumbnail, fileSize] = await Promise.all([
            window.electronAPI.getThumbnail(filePath),
            window.electronAPI.getFileSize(filePath),
          ]);
          const fileName = filePath.split(/[\\/]/).pop() || filePath;
          
          const job: ImageJob = {
            id: crypto.randomUUID(),
            filePath,
            fileName,
            fileSize,
            width: null,
            height: null,
            status: 'waiting',
            progress: 0,
            thumbnail,
            estimatedOutputSize: null,
          };
          newJobs.push(job);
        } catch {
          // Skip unsupported files silently
        }
      }
      addJobs(newJobs);
      
      // Calculate estimated sizes in background
      for (const job of newJobs) {
        window.electronAPI.estimateOutputSize(job.filePath, settings).then((estimatedSize) => {
          if (estimatedSize !== null) {
            updateJobEstimatedSize(job.id, estimatedSize);
          }
        }).catch(() => {
          // Ignore estimation errors
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [addJobs, setIsLoading, settings, updateJobEstimatedSize]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    // Use webUtils.getPathForFile via preload for proper path extraction with contextIsolation
    const paths = window.electronAPI.getFilePathsFromFiles(files);
    await processFiles(paths);
  }, [processFiles]);

  const handleSelectImages = useCallback(async () => {
    const paths = await window.electronAPI.selectImages();
    await processFiles(paths);
  }, [processFiles]);

  const handleSelectFolder = useCallback(async () => {
    const paths = await window.electronAPI.selectFolder();
    await processFiles(paths);
  }, [processFiles]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300
        ${isDragOver
          ? 'border-accent bg-accent/5 shadow-glow'
          : 'border-border hover:border-content-tertiary bg-surface-raised'
        }
      `}
    >
      <div className="flex flex-col items-center gap-4">
        <div className={`
          w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
          ${isDragOver ? 'bg-accent/20 text-accent' : 'bg-surface-overlay text-content-tertiary'}
        `}>
          <HiOutlineCloudUpload className="text-3xl" />
        </div>
        <div>
          <p className="text-sm font-medium text-content mb-1">
            {t('dropZone.dragDrop')}
          </p>
          <p className="text-xs text-content-tertiary">
            {t('dropZone.supportedFormats')}
          </p>
        </div>
        <div className="flex gap-3 mt-2">
          <button onClick={handleSelectImages} className="btn-secondary flex items-center gap-2 text-sm">
            <HiOutlinePhotograph className="text-base" />
            {t('dropZone.selectImages')}
          </button>
          <button onClick={handleSelectFolder} className="btn-secondary flex items-center gap-2 text-sm">
            <HiOutlineFolder className="text-base" />
            {t('dropZone.selectFolder')}
          </button>
        </div>
      </div>
    </div>
  );
}