import { useEffect, useState } from "react";
import { X, Loader2, Terminal, HardDrive, Cpu, Activity } from "lucide-react";
import { api } from "../lib/api";
import { useT } from "../lib/i18n";
import type { ProcessDetails } from "../lib/types";

interface Props {
  pid: number;
  name: string;
  onClose: () => void;
}

export function ProcessDetailModal({ pid, name, onClose }: Props) {
  const t = useT();
  const [detail, setDetail] = useState<ProcessDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getProcessDetails(pid)
      .then(setDetail)
      .catch(e => setError(String(e)));
  }, [pid]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdrop}
    >
      <div className="bg-white dark:bg-surface-dark-alt rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">{name}</h2>
              <p className="text-xs text-slate-400 leading-tight">PID {pid}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost !px-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {!detail && !error && (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{t("common.loading")}</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {detail && (
            <div className="space-y-4">
              {/* 메모리 / CPU */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-brand-500 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-slate-400">{t("process.memory")}</div>
                    <div className="text-base font-bold text-slate-700 dark:text-slate-200">
                      {detail.mem_mb < 1024
                        ? `${detail.mem_mb.toFixed(1)} MB`
                        : `${(detail.mem_mb / 1024).toFixed(2)} GB`}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-slate-400">{t("process.cpu")}</div>
                    <div className="text-base font-bold text-slate-700 dark:text-slate-200">
                      {detail.cpu_percent.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* 가상 메모리 */}
              {detail.virtual_mem_mb > 0 && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-slate-400">Virtual Memory</div>
                    <div className="text-base font-bold text-slate-700 dark:text-slate-200">
                      {detail.virtual_mem_mb < 1024
                        ? `${detail.virtual_mem_mb.toFixed(1)} MB`
                        : `${(detail.virtual_mem_mb / 1024).toFixed(2)} GB`}
                    </div>
                  </div>
                </div>
              )}

              {/* 상태 */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
                <div className="text-xs text-slate-400 mb-1">Status</div>
                <div className="text-sm font-mono text-slate-600 dark:text-slate-300">{detail.status}</div>
              </div>

              {/* 실행 경로 */}
              {detail.exe_path && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <HardDrive className="w-3.5 h-3.5" /> Path
                  </div>
                  <div className="text-xs font-mono text-slate-600 dark:text-slate-300 break-all leading-relaxed">
                    {detail.exe_path}
                  </div>
                </div>
              )}

              {/* 커맨드라인 */}
              {detail.cmd.length > 0 && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
                    <Terminal className="w-3.5 h-3.5" /> Command Line
                  </div>
                  <div className="space-y-1">
                    {detail.cmd.map((arg, i) => (
                      <div
                        key={i}
                        className="text-xs font-mono bg-white dark:bg-slate-900/60 rounded-lg px-2.5 py-1.5 text-slate-600 dark:text-slate-300 break-all"
                      >
                        {i === 0 ? <span className="text-brand-500">▶ </span> : <span className="text-slate-300 dark:text-slate-600 mr-1">{i}.</span>}
                        {arg}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end px-5 py-3 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="btn btn-secondary">{t("about.close")}</button>
        </div>
      </div>
    </div>
  );
}
