import { useState } from "react";
import { X, HardDrive, Loader2, Trash2, Chrome, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { api } from "../lib/api";
import { toast } from "../lib/toast";
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
      toast.error(String(e), "디스크 정리 오류");
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
              주의
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
            <h2 className="text-sm font-bold">디스크 정리</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost !px-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {!report && (
            <>
              <p className="text-xs text-slate-400 mb-2">
                정리할 항목을 선택하세요. 사용 중인 파일은 자동으로 건너뜁니다.
              </p>

              <Option
                k="temp_files"
                label="임시 파일 (TEMP/TMP)"
                desc="%TEMP%, %TMP%, C:\Windows\Temp 폴더 내 파일"
                icon={<Trash2 className="w-3.5 h-3.5 text-slate-500" />}
              />

              <Option
                k="browser_cache_chrome"
                label="Chrome 캐시"
                desc="Cache / Code Cache / GPUCache"
                icon={<Chrome className="w-3.5 h-3.5 text-blue-500" />}
              />

              <Option
                k="browser_cache_edge"
                label="Microsoft Edge 캐시"
                desc="Cache / Code Cache / GPUCache"
                icon={<Chrome className="w-3.5 h-3.5 text-teal-500" />}
              />

              <Option
                k="windows_update_cache"
                label="Windows Update 캐시"
                desc={`C:\\Windows\\SoftwareDistribution\\Download`}
                icon={<HardDrive className="w-3.5 h-3.5 text-purple-500" />}
                danger
              />

              <Option
                k="recycle_bin"
                label="휴지통 비우기"
                desc="모든 드라이브의 $Recycle.Bin (복구 불가)"
                icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                danger
              />

              <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <div>
                  브라우저가 실행 중이면 캐시 파일이 잠겨 일부만 삭제됩니다.
                  브라우저를 종료한 후 실행하면 더 많이 확보됩니다.
                </div>
              </div>
            </>
          )}

          {report && (
            <div className="space-y-3">
              <div className="text-center py-2">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {fmtBytes(report.bytes_freed)}
                </div>
                <div className="text-xs text-slate-400 mt-1">확보됨</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <div className="font-bold text-base">{report.files_deleted}</div>
                  <div className="text-slate-400">파일 삭제</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <div className="font-bold text-base">{report.dirs_deleted}</div>
                  <div className="text-slate-400">폴더 삭제</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <div className={clsx("font-bold text-base", report.errors > 0 && "text-amber-500")}>
                    {report.errors}
                  </div>
                  <div className="text-slate-400">건너뜀</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700">
          {!report ? (
            <>
              <button onClick={onClose} className="btn btn-ghost" disabled={running}>취소</button>
              <button
                onClick={run}
                disabled={!anySelected || running}
                className="btn btn-secondary"
              >
                {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {running ? "정리 중…" : "정리 시작"}
              </button>
            </>
          ) : (
            <button onClick={onClose} className="btn btn-secondary">닫기</button>
          )}
        </div>
      </div>
    </div>
  );
}
