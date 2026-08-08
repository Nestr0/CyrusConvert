import { useCallback, useEffect, useState } from 'react';
import { HiOutlineFolder, HiChevronDown } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { OUTPUT_FORMATS } from '../types';
import type { ImageFormat, ResizeMode, OverwritePolicy, BackgroundColor } from '../types';

const RESIZE_MODES: ResizeMode[] = ['contain', 'cover', 'fill', 'inside', 'outside'];

export function SettingsPanel() {
  const { t } = useTranslation();
  const { settings, updateSettings, outputFolder, setOutputFolder } = useAppStore();
  const [cpuCount, setCpuCount] = useState(4);
  const [customColor, setCustomColor] = useState('#ffffff');

  const OVERWRITE_POLICIES: { value: OverwritePolicy; label: string }[] = [
    { value: 'auto-rename', label: t('settings.autoRename') },
    { value: 'replace', label: t('settings.replace') },
    { value: 'skip', label: t('settings.skip') },
  ];
  
  const BG_OPTIONS: { value: BackgroundColor; label: string }[] = [
    { value: 'transparent', label: t('settings.transparent') },
    { value: 'white', label: t('settings.white') },
    { value: 'black', label: t('settings.black') },
    { value: 'custom', label: t('settings.custom') },
  ];

  useEffect(() => {
    window.electronAPI.getCpuCount().then(setCpuCount);
  }, []);

  const handleSelectOutputFolder = useCallback(async () => {
    const folder = await window.electronAPI.selectOutputFolder();
    if (folder) setOutputFolder(folder);
  }, [setOutputFolder]);

  const effectiveConcurrency = settings.concurrency === 0 ? Math.max(1, cpuCount - 1) : settings.concurrency;

  return (
    <div className="flex flex-col gap-5 p-4 overflow-y-auto h-full">
      {/* Output Format */}
      <div>
        <label className="label">{t('settings.outputFormat')}</label>
        <div className="relative">
          <select
            value={settings.outputFormat}
            onChange={(e) => updateSettings({ outputFormat: e.target.value as ImageFormat })}
            className="select-field pr-8"
          >
            {OUTPUT_FORMATS.map((f) => (
              <option key={f} value={f}>{f.toUpperCase()}</option>
            ))}
          </select>
          <HiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary pointer-events-none text-xs" />
        </div>
      </div>

      {/* Quality */}
      <div>
        <label className="label">{t('settings.quality')}: {settings.quality}</label>
        <input
          type="range"
          min={1}
          max={100}
          value={settings.quality}
          onChange={(e) => updateSettings({ quality: Number(e.target.value) })}
          className="w-full h-1.5 bg-surface-overlay rounded-full appearance-none cursor-pointer accent-accent"
        />
        <div className="flex justify-between text-[10px] text-content-tertiary mt-1">
          <span>{t('settings.low')}</span>
          <span>{t('settings.high')}</span>
        </div>
      </div>

      {/* Resize */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="label mb-0">{t('settings.resize')}</label>
          <button
            onClick={() => updateSettings({ resize: { ...settings.resize, enabled: !settings.resize.enabled } })}
            className={`w-9 h-5 rounded-full transition-colors relative ${settings.resize.enabled ? 'bg-accent' : 'bg-surface-overlay border border-border'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.resize.enabled ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </div>
        {settings.resize.enabled && (
          <div className="space-y-2 animate-fade-in">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="number"
                  placeholder={t('settings.width')}
                  value={settings.resize.width || ''}
                  onChange={(e) => updateSettings({ resize: { ...settings.resize, width: e.target.value ? Number(e.target.value) : null } })}
                  className="input-field text-xs"
                  min={1}
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder={t('settings.height')}
                  value={settings.resize.height || ''}
                  onChange={(e) => updateSettings({ resize: { ...settings.resize, height: e.target.value ? Number(e.target.value) : null } })}
                  className="input-field text-xs"
                  min={1}
                />
              </div>
            </div>
            <div className="relative">
              <select
                value={settings.resize.mode}
                onChange={(e) => updateSettings({ resize: { ...settings.resize, mode: e.target.value as ResizeMode } })}
                className="select-field text-xs pr-8"
              >
                {RESIZE_MODES.map((m) => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
              <HiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary pointer-events-none text-xs" />
            </div>
          </div>
        )}
      </div>

      {/* Background Color */}
      <div>
        <label className="label">{t('settings.background')}</label>
        <div className="relative">
          <select
            value={BG_OPTIONS.find((o) => o.value === settings.backgroundColor)?.value || 'custom'}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'custom') {
                updateSettings({ backgroundColor: customColor });
              } else {
                updateSettings({ backgroundColor: val as BackgroundColor });
              }
            }}
            className="select-field text-xs pr-8"
          >
            {BG_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <HiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary pointer-events-none text-xs" />
        </div>
        {(settings.backgroundColor.startsWith('#') || BG_OPTIONS.find((o) => o.value === settings.backgroundColor)?.value === 'custom') && (
          <input
            type="color"
            value={settings.backgroundColor.startsWith('#') ? settings.backgroundColor : customColor}
            onChange={(e) => {
              setCustomColor(e.target.value);
              updateSettings({ backgroundColor: e.target.value });
            }}
            className="mt-2 w-full h-8 rounded-lg cursor-pointer border border-border"
          />
        )}
      </div>

      {/* Overwrite Policy */}
      <div>
        <label className="label">{t('settings.overwritePolicy')}</label>
        <div className="relative">
          <select
            value={settings.overwritePolicy}
            onChange={(e) => updateSettings({ overwritePolicy: e.target.value as OverwritePolicy })}
            className="select-field text-xs pr-8"
          >
            {OVERWRITE_POLICIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <HiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary pointer-events-none text-xs" />
        </div>
      </div>

      {/* Concurrency */}
      <div>
        <label className="label">{t('settings.workers')}: {effectiveConcurrency}</label>
        <input
          type="range"
          min={1}
          max={cpuCount}
          value={effectiveConcurrency}
          onChange={(e) => updateSettings({ concurrency: Number(e.target.value) })}
          className="w-full h-1.5 bg-surface-overlay rounded-full appearance-none cursor-pointer accent-accent"
        />
        <div className="flex justify-between text-[10px] text-content-tertiary mt-1">
          <span>1</span>
          <span>{cpuCount} CPUs</span>
        </div>
      </div>

      {/* Output Folder */}
      <div>
        <label className="label">{t('settings.outputFolder')}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={outputFolder}
            readOnly
            placeholder={t('settings.selectOutputFolder')}
            className="input-field text-xs flex-1 truncate"
          />
          <button onClick={handleSelectOutputFolder} className="btn-icon border border-border" title={t('settings.browse')}>
            <HiOutlineFolder className="text-base" />
          </button>
        </div>
      </div>
    </div>
  );
}