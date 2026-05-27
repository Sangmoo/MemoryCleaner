import { useEffect, useState } from "react";
import { RefreshCw, Shield } from "lucide-react";
import clsx from "clsx";
import { api } from "../lib/api";
import type { StartupProgram } from "../lib/types";

export function StartupPanel() {
  const [programs, setPrograms] = useState<StartupProgram[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setPrograms(await api.getStartupPrograms()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (p: StartupProgram) => {
    const key = `${p.source}:${p.name}`;
    setToggling(key);
    try {
      await api.toggleStartup(p.name, p.source, !p.enabled);
      setPrograms(prev => prev.map(x =>
        x.name === p.name && x.source === p.source ? { ...x, enabled: !x.enabled } : x
      ));
    } catch (e) {
      alert("변경 실패: " + String(e));
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          시작 프로그램 ({programs.length}개)
        </span>
        <button onClick={load} className="btn btn-secondary" disabled={loading}>
          <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} /> 새로고침
        </button>
      </div>

      <div className="card overflow-hidden flex-1 min-h-0">
        <div className="flex items-center px-3 py-2 bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <div className="w-14 text-center">상태</div>
          <div className="w-16 text-center">소스</div>
          <div className="w-40">이름</div>
          <div className="flex-1">실행 경로</div>
        </div>

        <div className="overflow-y-auto h-full">
          {loading && programs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">불러오는 중…</div>
          ) : programs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">시작 프로그램이 없습니다.</div>
          ) : (
            programs.map((p, i) => {
              const key = `${p.source}:${p.name}`;
              const isBusy = toggling === key;
              return (
                <div
                  key={key}
                  className={clsx(
                    "flex items-center px-3 py-2 text-sm border-b border-slate-100 dark:border-slate-800",
                    i % 2 === 0 ? "bg-white dark:bg-surface-dark" : "bg-slate-50/60 dark:bg-surface-dark-alt/30"
                  )}
                >
                  <div className="w-14 flex justify-center">
                    <button
                      onClick={() => toggle(p)}
                      disabled={isBusy}
                      className={clsx(
                        "relative w-10 h-5 rounded-full transition-colors duration-200 overflow-hidden focus:outline-none flex-shrink-0",
                        p.enabled ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600",
                        isBusy && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className={clsx(
                        "absolute top-[3px] w-[14px] h-[14px] bg-white rounded-full shadow transition-all duration-200",
                        p.enabled ? "left-[23px]" : "left-[3px]"
                      )} />
                    </button>
                  </div>
                  <div className="w-16 flex justify-center">
                    <span className={clsx("chip", p.source === "HKCU" ? "chip-nor" : "chip-sys")}>
                      {p.source}
                    </span>
                  </div>
                  <div className="w-40 truncate font-medium text-slate-700 dark:text-slate-200" title={p.name}>
                    {p.name}
                  </div>
                  <div className="flex-1 truncate text-xs font-mono text-slate-400" title={p.command}>
                    {p.command}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Shield className="w-3.5 h-3.5" />
        HKLM 항목 변경은 관리자 권한이 필요할 수 있습니다.
      </div>
    </div>
  );
}
