import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Zap, Moon, Sun, RefreshCw, CheckSquare, Sparkles, Square,
  Skull, Loader2, Settings, History, PlayCircle, Wind, Trash2,
} from "lucide-react";
import clsx from "clsx";
import { listen } from "@tauri-apps/api/event";

import { api, isTauri } from "./lib/api";
import type { AppSettings, MemorySnapshot, ProcessInfo, RecoveryReport, TempCleanupReport } from "./lib/types";
import { MemoryGauge } from "./components/MemoryGauge";
import { MemoryGraph } from "./components/MemoryGraph";
import { ProcessTable } from "./components/ProcessTable";
import { ThresholdStepper } from "./components/ThresholdStepper";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ResultDialog } from "./components/ResultDialog";
import { SettingsModal } from "./components/SettingsModal";
import { HistoryPanel } from "./components/HistoryPanel";
import { StartupPanel } from "./components/StartupPanel";
import { ProcessDetailModal } from "./components/ProcessDetailModal";

const MEM_REFRESH_MS = 3_000;
const GRAPH_MAX_POINTS = 60; // 3분치

type Tab = "process" | "history" | "startup";

// ── 다크모드 훅 ────────────────────────────────────────────────────────────
function useDarkMode(initial: string) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("memtool-theme");
    if (saved) return saved === "dark";
    if (initial) return initial === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("memtool-theme", dark ? "dark" : "light");
  }, [dark]);

  return [dark, setDark] as const;
}

// ── 기본 설정 ──────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS: AppSettings = {
  auto_clean: {
    enabled: false,
    threshold_percent: 85,
    interval_seconds: 60,
    exclude_start_hour: null,
    exclude_end_hour: null,
  },
  protected_processes: [],
  theme: "dark",
  autostart: false,
};

export default function App() {
  // ── 설정 ──────────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [dark, setDark] = useDarkMode(settings.theme);
  const [showSettings, setShowSettings] = useState(false);

  // 초기 설정 로드
  useEffect(() => {
    if (!isTauri) return;
    api.getSettings().then(s => {
      setSettings(s);
    }).catch(console.error);
  }, []);

  const handleSaveSettings = async (newSettings: AppSettings) => {
    await api.saveSettings(newSettings);
    setSettings(newSettings);
    // 보호 목록 등이 바뀌었으므로 프로세스 목록 갱신
    refreshProcesses(threshold);
  };

  // ── 탭 ───────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>("process");

  // ── 메모리 ──────────────────────────────────────────────────────────
  const [snap, setSnap] = useState<MemorySnapshot | null>(null);
  const [memHistory, setMemHistory] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const m = await api.getMemory();
        if (!cancelled) {
          setSnap(m);
          setMemHistory(prev => {
            const next = [...prev, m.percent];
            return next.length > GRAPH_MAX_POINTS ? next.slice(-GRAPH_MAX_POINTS) : next;
          });
        }
      } catch (e) { console.error(e); }
    };
    tick();
    const id = setInterval(tick, MEM_REFRESH_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // ── 자동정리 완료 이벤트 수신 ─────────────────────────────────────────
  const [autoCleanToast, setAutoCleanToast] = useState(false);
  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | null = null;
    listen("auto-clean-done", () => {
      setAutoCleanToast(true);
      setTimeout(() => setAutoCleanToast(false), 3000);
      refreshProcesses(threshold);
    }).then(fn => { unlisten = fn; }).catch(console.error);
    return () => { unlisten?.(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 프로세스 ──────────────────────────────────────────────────────────
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [threshold, setThreshold] = useState(500);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadMs, setLoadMs] = useState<number | null>(null);
  const [killing, setKilling] = useState(false);
  const [emptyingSet, setEmptyingSet] = useState(false);
  const [cleaningTemp, setCleaningTemp] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [report, setReport] = useState<RecoveryReport | null>(null);

  // ── 프로세스 상세 ──────────────────────────────────────────────────────
  const [detailPid, setDetailPid] = useState<{ pid: number; name: string } | null>(null);

  const refreshProcesses = useCallback(async (th: number) => {
    setLoading(true);
    setLoadError(null);
    const t0 = performance.now();
    try {
      const list = await api.getProcesses(th);
      setProcesses(list);
      setLoadMs(performance.now() - t0);
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshProcesses(threshold); }, [threshold, refreshProcesses]);

  // ── 3분 자동 새로고침 ──────────────────────────────────────────────────
  const PROCESS_REFRESH_MS = 3 * 60 * 1000; // 180초
  const [nextRefreshIn, setNextRefreshIn] = useState(PROCESS_REFRESH_MS / 1000);

  useEffect(() => {
    // 메인 인터벌: 3분마다 목록 갱신
    const id = setInterval(() => {
      refreshProcesses(threshold);
      setNextRefreshIn(PROCESS_REFRESH_MS / 1000);
    }, PROCESS_REFRESH_MS);

    // 카운트다운: 1초마다 감소
    const countdown = setInterval(() => {
      setNextRefreshIn(prev => (prev <= 1 ? PROCESS_REFRESH_MS / 1000 : prev - 1));
    }, 1000);

    return () => { clearInterval(id); clearInterval(countdown); };
  }, [threshold, refreshProcesses]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 선택 헬퍼 ────────────────────────────────────────────────────────
  const toggle = useCallback((pid: number) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(pid) ? n.delete(pid) : n.add(pid);
      return n;
    });
  }, []);

  const selectAll       = () => setSelected(new Set(processes.filter(p => !p.is_system && !p.is_protected).map(p => p.pid)));
  const selectRecommended = () => setSelected(new Set(processes.filter(p => p.safe_kill).map(p => p.pid)));
  const deselectAll     = () => setSelected(new Set());

  // ── 통계 ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const sel = processes.filter(p => selected.has(p.pid));
    return {
      total: processes.length,
      recommended: processes.filter(p => p.safe_kill).length,
      protected: processes.filter(p => p.is_protected).length,
      selectedCount: sel.length,
      estimatedMb: sel.reduce((s, p) => s + p.mem_mb, 0),
      names: sel.map(p => p.name),
    };
  }, [processes, selected]);

  // ── Kill ──────────────────────────────────────────────────────────────
  const doKill = async () => {
    setShowConfirm(false);
    setKilling(true);
    try {
      const result = await api.killProcesses(Array.from(selected));
      setReport(result);
      setSelected(new Set());
      await refreshProcesses(threshold);
    } catch (e) {
      alert("종료 중 오류: " + String(e));
    } finally {
      setKilling(false);
    }
  };

  // ── EmptyWorkingSet ───────────────────────────────────────────────────
  const doEmptyWorkingSet = async () => {
    setEmptyingSet(true);
    try {
      const pids = Array.from(selected);
      const result = await api.emptyWorkingSet(pids);
      alert(`메모리 압축 완료: ${result.processed}개 성공, ${result.failed}개 실패`);
      await refreshProcesses(threshold);
    } catch (e) {
      alert("메모리 압축 오류: " + String(e));
    } finally {
      setEmptyingSet(false);
    }
  };

  // ── 임시 파일 정리 ────────────────────────────────────────────────────
  const doCleanupTemp = async () => {
    setCleaningTemp(true);
    try {
      const r: TempCleanupReport = await api.cleanupTempFiles();
      const freed = r.bytes_freed < 1024 * 1024
        ? `${(r.bytes_freed / 1024).toFixed(1)} KB`
        : r.bytes_freed < 1024 * 1024 * 1024
          ? `${(r.bytes_freed / 1024 / 1024).toFixed(1)} MB`
          : `${(r.bytes_freed / 1024 / 1024 / 1024).toFixed(2)} GB`;
      alert(
        `임시 파일 정리 완료\n\n` +
        `파일: ${r.files_deleted}개 삭제\n` +
        `폴더: ${r.dirs_deleted}개 삭제\n` +
        `확보: ${freed}\n` +
        (r.errors > 0 ? `오류: ${r.errors}건 (사용 중인 파일 제외됨)` : "")
      );
    } catch (e) {
      alert("임시 파일 정리 오류: " + String(e));
    } finally {
      setCleaningTemp(false);
    }
  };

  // ── 렌더 ──────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-surface-alt dark:bg-surface-dark">
      {/* 자동정리 토스트 */}
      {autoCleanToast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-brand-600 text-white text-sm rounded-xl shadow-lg animate-fade-in">
          ✨ 자동 정리 완료
        </div>
      )}

      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-slate-200/70 dark:border-slate-700/50 bg-white/80 dark:bg-surface-dark-alt/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
            <Zap className="w-4 h-4 text-white" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">Memory Cleaner</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">스마트 메모리 정리 도구</p>
          </div>
          {settings.auto_clean.enabled && (
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-medium">
              자동정리 ON
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(true)} className="btn btn-ghost !px-2.5">
            <Settings className="w-4 h-4" /><span className="text-xs">설정</span>
          </button>
          <button onClick={() => setDark(!dark)} className="btn btn-ghost !px-2.5">
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-xs">{dark ? "라이트" : "다크"}</span>
          </button>
        </div>
      </header>

      {/* 메인 */}
      <main className="flex-1 flex flex-col gap-3 p-4 overflow-hidden">
        {/* 메모리 게이지 + 그래프 */}
        <div className="card p-3 space-y-2">
          <MemoryGauge snap={snap} />
          <MemoryGraph history={memHistory} />
        </div>

        {/* 탭 */}
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
          {([
            ["process", "프로세스", <PlayCircle className="w-3.5 h-3.5" />],
            ["history", "히스토리", <History className="w-3.5 h-3.5" />],
            ["startup", "시작 프로그램", <Zap className="w-3.5 h-3.5" />],
          ] as const).map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={clsx(
                "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                tab === id
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {/* 프로세스 탭 */}
        {tab === "process" && (
          <div className="flex flex-col flex-1 min-h-0 gap-3">
            {/* 툴바 */}
            <div className="card p-3 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <ThresholdStepper value={threshold} onChange={setThreshold} />
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                <button onClick={() => { refreshProcesses(threshold); setNextRefreshIn(PROCESS_REFRESH_MS / 1000); }} className="btn btn-secondary" disabled={loading}>
                  <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} /> 새로고침
                </button>
                <button onClick={selectAll} className="btn btn-secondary">
                  <CheckSquare className="w-3.5 h-3.5" /> 전체
                </button>
                <button onClick={selectRecommended} className="btn btn-secondary">
                  <Sparkles className="w-3.5 h-3.5" /> 추천
                </button>
                <button onClick={deselectAll} className="btn btn-ghost">
                  <Square className="w-3.5 h-3.5" /> 해제
                </button>
                <button
                  onClick={doCleanupTemp}
                  disabled={cleaningTemp}
                  className="btn btn-ghost text-amber-600 dark:text-amber-400"
                  title="임시 파일(TEMP) 정리"
                >
                  <Trash2 className={clsx("w-3.5 h-3.5", cleaningTemp && "animate-pulse")} />
                  {cleaningTemp ? "정리 중…" : "임시 파일"}
                </button>
                <div className="ml-auto text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
                  {stats.total}개 · 추천 {stats.recommended}개 · 보호 {stats.protected}개
                  {loadMs !== null && <span className="opacity-70">· {loadMs.toFixed(0)}ms</span>}
                  <span className="opacity-50">·</span>
                  <span title="다음 자동 새로고침까지 남은 시간" className="opacity-60">
                    🔄 {Math.floor(nextRefreshIn / 60)}:{String(nextRefreshIn % 60).padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* 선택 정보 */}
              <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-brand-50 to-slate-50 dark:from-brand-600/10 dark:to-slate-700/30 px-4 py-2.5">
                <div className="flex items-baseline gap-3 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">선택</span>
                  <span className="text-xl font-bold text-brand-700 dark:text-brand-400 tabular-nums">{stats.selectedCount}</span>
                  <span className="text-slate-500 dark:text-slate-400">개</span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-slate-600 dark:text-slate-300">예상 확보</span>
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {stats.estimatedMb < 1024 ? `${stats.estimatedMb.toFixed(0)} MB` : `${(stats.estimatedMb / 1024).toFixed(2)} GB`}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sys" />시스템</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />보호됨</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />추천</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" />일반</span>
                </div>
              </div>
            </div>

            {/* 프로세스 테이블 */}
            <div className="flex-1 min-h-0">
              <ProcessTable
                processes={processes}
                selected={selected}
                onToggle={toggle}
                onDetail={(pid, name) => setDetailPid({ pid, name })}
                loading={loading}
                error={loadError}
              />
            </div>
          </div>
        )}

        {/* 히스토리 탭 */}
        {tab === "history" && (
          <div className="flex-1 min-h-0">
            <HistoryPanel />
          </div>
        )}

        {/* 시작 프로그램 탭 */}
        {tab === "startup" && (
          <div className="flex-1 min-h-0">
            <StartupPanel />
          </div>
        )}
      </main>

      {/* 푸터 (프로세스 탭에서만) */}
      {tab === "process" && (
        <footer className="px-5 py-3 border-t border-slate-200/70 dark:border-slate-700/50 bg-white/80 dark:bg-surface-dark-alt/80 backdrop-blur-sm flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {(killing || emptyingSet) && (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {killing ? "프로세스 종료 중…" : "메모리 압축 중…"}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={doEmptyWorkingSet}
              disabled={stats.selectedCount === 0 || emptyingSet || killing}
              className="btn btn-secondary px-4 py-2 text-sm"
            >
              <Wind className="w-4 h-4" /> 메모리 압축
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={stats.selectedCount === 0 || killing || emptyingSet}
              className="btn btn-danger px-5 py-2 text-sm font-bold"
            >
              <Skull className="w-4 h-4" /> 선택한 {stats.selectedCount}개 Kill
            </button>
          </div>
        </footer>
      )}

      {/* 다이얼로그 */}
      {showConfirm && (
        <ConfirmDialog
          count={stats.selectedCount}
          names={stats.names}
          estimatedMb={stats.estimatedMb}
          onConfirm={doKill}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      {report && <ResultDialog report={report} onClose={() => setReport(null)} />}
      {showSettings && (
        <SettingsModal
          initial={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
      {detailPid && (
        <ProcessDetailModal
          pid={detailPid.pid}
          name={detailPid.name}
          onClose={() => setDetailPid(null)}
        />
      )}
    </div>
  );
}
