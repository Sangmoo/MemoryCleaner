import { useState } from "react";
import { X, HardDrive, Loader2, Trash2, Chrome, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { api } from "../lib/api";
import { toast } from "../lib/toast";
import { useT } from "../lib/i18n";
import type { CleanupOptions, TempCleanupReport } from "../lib/types";

interface Props {
  onClose: () => void;
}

const DEFAULT_OPTS: CleanupOptions = {
  temp_files: true,
  browser_cache_chrome: false,
  browser_cache_edge: false,
  windows_update_cache: false,
  recycle_bin: false,
};

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function DiskCleanupDialog({ onClose }: Props) {
  const t = useT();
  const [opts, setOpts] = useState<CleanupOptions>(DEFAULT_OPTS);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<TempCleanupReport | null>(null);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const toggle = (k: keyof CleanupOptions) =>
    setOpts(prev => ({ ...prev, [k]: !prev[k] }));

  const run = async () => {
    setRunning(true);
    setReport(null);
    try {
      const r = await api.cleanupDisk(opts);
      setReport(r);
    } catch (e) {
      toast.error(String(e), t("disk.error"));
    } finally {
      setRunning(false);
    }
  };

  const anySelected = Object.values(opts).some(Boolean);

  const Option = ({
    k, label, desc, icon, danger,
  }: {
    k: keyof CleanupOptions; label: string; desc: string;
    icon: React.ReactNode; danger?: boolean;
  }) => (
    <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors">
      <input
        type="checkbox"
        checked={opts[k]}
        onChange={() => toggle(k)}
        className="mt-0.5 w-4 h-4 accent-brand-600"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {label}
          {danger && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
              {t("disk.dangerBadge")}
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
      </div>
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdrop}
    >
      <div className="bg-white dark:bg-surface-dark-alt rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-sm font-bold">{t("disk.title")}</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost !px-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {!report && (
            <>
              <p className="text-xs text-slate-400 mb-2">
                {t("disk.desc")}
              </p>

              <Option
                k="temp_files"
                label={t("disk.temp")}
                desc={t("disk.tempDesc")}
                icon={<Trash2 className="w-3.5 h-3.5 text-slate-500" />}
              />

              <Option
                k="browser_cache_chrome"
                label={t("disk.chromecache")}
                desc="Cache / Code Cache / GPUCache"
                icon={<Chrome className="w-3.5 h-3.5 text-blue-500" />}
              />

              <Option
                k="browser_cache_edge"
                label={t("disk.edgecache")}
                desc="Cache / Code Cache / GPUCache"
                icon={<Chrome className="w-3.5 h-3.5 text-teal-500" />}
              />

              <Option
                k="windows_update_cache"
                label={t("disk.wucache")}
                desc={`C:\\Windows\\SoftwareDistribution\\Download`}
                icon={<HardDrive className="w-3.5 h-3.5 text-purple-500" />}
                danger
              />

              <Option
                k="recycle_bin"
                label={t("disk.recycle")}
                desc={t("disk.recycleDesc")}
                icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                danger
              />

              <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <div>{t("disk.browserWarning")}</div>
              </div>
            </>
          )}

          {report && (
            <div className="space-y-3">
              <div className="text-center py-2">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {fmtBytes(report.bytes_freed)}
                </div>
                <div className="text-xs text-slate-400 mt-1">{t("disk.success")}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <div className="font-bold text-base">{report.files_deleted}</div>
                  <div className="text-slate-400">{t("disk.filesDeleted")}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <div className="font-bold text-base">{report.dirs_deleted}</div>
                  <div className="text-slate-400">{t("disk.dirsDeleted")}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <div className={clsx("font-bold text-base", report.errors > 0 && "text-amber-500")}>
                    {report.errors}
                  </div>
                  <div className="text-slate-400">{t("disk.skipped")}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700">
          {!report ? (
            <>
              <button onClick={onClose} className="btn btn-ghost" disabled={running}>{t("common.cancel")}</button>
              <button
                onClick={run}
                disabled={!anySelected || running}
                className="btn btn-secondary"
              >
                {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {running ? t("disk.running") : t("disk.start")}
              </button>
            </>
          ) : (
            <button onClick={onClose} className="btn btn-secondary">{t("disk.close")}</button>
          )}
        </div>
      </div>
    </div>
  );
}
