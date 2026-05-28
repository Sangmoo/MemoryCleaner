import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Zap, Moon, Sun, RefreshCw, CheckSquare, Sparkles, Square,
  Skull, Loader2, Settings, History, PlayCircle, Wind,
  AlertTriangle, HardDrive, Keyboard, BarChart2, Cpu, Flame,
} from "lucide-react";
import clsx from "clsx";
import { listen } from "@tauri-apps/api/event";

import { api, isTauri } from "./lib/api";
import type {
  AppSettings, HotProcessEvent, MemorySnapshot, ProcessInfo, RecoveryReport, SystemStats,
} from "./lib/types";
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
import { DiskCleanupDialog } from "./components/DiskCleanupDialog";
import { InsightsPanel } from "./components/InsightsPanel";
import { OnboardingTour } from "./components/OnboardingTour";
import { UpdateBanner } from "./components/UpdateBanner";

const MEM_REFRESH_MS = 3_000;
const STATS_REFRESH_MS = 4_000;
const GRAPH_MAX_POINTS = 60; // 3분치

type Tab = "process" | "history" | "startup" | "insights";

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
  process_refresh_seconds: 10,
  warn_notifications_enabled: true,
  warn_threshold_percent: 90,
  profiles: [],
  onboarding_done: false,
  hot_process_detection: true,
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

  // ── 시스템 통계 (CPU + 디스크) ──────────────────────────────────────
  const [sysStats, setSysStats] = useState<SystemStats | null>(null);
  useEffect(() => {
    if (!isTauri) return;
    const tick = async () => {
      try { setSysStats(await api.getSystemStats()); } catch { /* 무시 */ }
    };
    tick();
    const id = setInterval(tick, STATS_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  // ── 온보딩 ───────────────────────────────────────────────────────────
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (!isTauri) return;
    api.getSettings().then(s => {
      if (!s.onboarding_done) setShowOnboarding(true);
    }).catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const completeOnboarding = async () => {
    setShowOnboarding(false);
    try {
      const s = await api.getSettings();
      await api.saveSettings({ ...s, onboarding_done: true });
      setSettings(prev => ({ ...prev, onboarding_done: true }));
    } catch (e) { console.error(e); }
  };

  // ── 자동정리 완료 이벤트 수신 ─────────────────────────────────────────
  const [autoCleanToast, setAutoCleanToast] = useState(false);
  const [memWarnToast, setMemWarnToast] = useState<number | null>(null);
  const [hotProcessToast, setHotProcessToast] = useState<HotProcessEvent | null>(null);

  useEffect(() => {
    if (!isTauri) return;
    let unl1: (() => void) | null = null;
    let unl2: (() => void) | null = null;
    let unl3: (() => void) | null = null;

    listen("auto-clean-done", () => {
      setAutoCleanToast(true);
      setTimeout(() => setAutoCleanToast(false), 3000);
      refreshProcesses(threshold);
    }).then(fn => { unl1 = fn; }).catch(console.error);

    listen<number>("memory-warning", (e) => {
      setMemWarnToast(e.payload);
      setTimeout(() => setMemWarnToast(null), 6000);
    }).then(fn => { unl2 = fn; }).catch(console.error);

    listen<HotProcessEvent>("hot-process", (e) => {
      setHotProcessToast(e.payload);
      setTimeout(() => setHotProcessToast(null), 6000);
    }).then(fn => { unl3 = fn; }).catch(console.error);

    return () => { unl1?.(); unl2?.(); unl3?.(); };
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
  const [quickCleaning, setQuickCleaning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDiskCleanup, setShowDiskCleanup] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
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

  // ── 자동 새로고침 (설정 값 사용) ─────────────────────────────────────────
  const PROCESS_REFRESH_MS = (settings.process_refresh_seconds ?? 10) * 1000;
  const refreshIntervalSecs = Math.floor(PROCESS_REFRESH_MS / 1000);
  const [nextRefreshIn, setNextRefreshIn] = useState(refreshIntervalSecs);

  useEffect(() => {
    setNextRefreshIn(refreshIntervalSecs); // 간격 변경 시 카운트다운 리셋

    const id = setInterval(() => {
      refreshProcesses(threshold);
      setNextRefreshIn(refreshIntervalSecs);
    }, PROCESS_REFRESH_MS);

    const countdown = setInterval(() => {
      setNextRefreshIn(prev => (prev <= 1 ? refreshIntervalSecs : prev - 1));
    }, 1000);

    return () => { clearInterval(id); clearInterval(countdown); };
  }, [threshold, refreshProcesses, PROCESS_REFRESH_MS]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 선택 헬퍼 ────────────────────────────────────────────────────────
  const toggle = useCallback((pids: number[]) => {
    setSelected(prev => {
      const n = new Set(prev);
      const allSelected = pids.every(pid => prev.has(pid));
      if (allSelected) { pids.forEach(pid => n.delete(pid)); }
      else              { pids.forEach(pid => n.add(pid)); }
      return n;
    });
  }, []);

  const selectAll       = () => setSelected(new Set(processes.filter(p => !p.is_system && !p.is_protected).map(p => p.pid)));
  const selectRecommended = () => setSelected(new Set(processes.filter(p => p.safe_kill).map(p => p.pid)));
  const deselectAll     = () => setSelected(new Set());

  // ── 보호 목록 즉시 추가 (우클릭 컨텍스트 메뉴) ──────────────────────
  const handleProtect = useCallback(async (name: string) => {
    const lname = name.toLowerCase();
    if (settings.protected_processes.includes(lname)) {
      alert(`이미 보호 목록에 있습니다: ${name}`);
      return;
    }
    const newSettings: AppSettings = {
      ...settings,
      protected_processes: [...settings.protected_processes, lname],
    };
    try {
      await api.saveSettings(newSettings);
      setSettings(newSettings);
      await refreshProcesses(threshold);
      alert(`보호 목록에 추가됐습니다: ${name}`);
    } catch (e) {
      alert("보호 목록 추가 실패: " + String(e));
    }
  }, [settings, threshold, refreshProcesses]);

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

  // ── 원클릭 Quick Clean: 추천 프로세스 즉시 정리 ──────────────────────
  const doQuickClean = async () => {
    const pids = processes.filter(p => p.safe_kill).map(p => p.pid);
    if (pids.length === 0) {
      alert("추천 프로세스가 없습니다.\n임계값을 낮추거나 잠시 후 다시 시도해 보세요.");
      return;
    }
    setQuickCleaning(true);
    try {
      const result = await api.killProcesses(pids);
      setReport(result);
      setSelected(new Set());
      await refreshProcesses(threshold);
    } catch (e) {
      alert("Quick Clean 오류: " + String(e));
    } finally {
      setQuickCleaning(false);
    }
  };

  // ── 키보드 단축키 ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // input/textarea에 포커스 있으면 단축키 무시
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // 모달 열려 있으면 일부 단축키만 처리
      const modalOpen = showSettings || showDiskCleanup || showConfirm || detailPid !== null || showShortcuts;
      if (e.key === "Escape" && modalOpen) return; // 모달 자체 닫기 우선

      if (e.key === "F5") {
        e.preventDefault();
        refreshProcesses(threshold);
        setNextRefreshIn(refreshIntervalSecs);
      } else if (e.key === "Delete" && tab === "process" && !modalOpen) {
        if (selected.size > 0) setShowConfirm(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && tab === "process" && !modalOpen) {
        e.preventDefault();
        selectAll();
      } else if (e.key === "Escape" && tab === "process" && !modalOpen) {
        deselectAll();
      } else if (e.key === "?" && !modalOpen) {
        setShowShortcuts(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "q" && tab === "process" && !modalOpen) {
        e.preventDefault();
        doQuickClean();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tab, selected, processes, threshold, showSettings, showDiskCleanup, showConfirm, detailPid, showShortcuts, refreshIntervalSecs]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 렌더 ──────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-surface-alt dark:bg-surface-dark">
      {/* 자동정리 토스트 */}
      {autoCleanToast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-brand-600 text-white text-sm rounded-xl shadow-lg animate-fade-in">
          ✨ 자동 정리 완료
        </div>
      )}

      {/* 메모리 경고 토스트 */}
      {memWarnToast !== null && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 bg-red-600 text-white text-sm rounded-xl shadow-lg animate-fade-in flex items-center gap-2.5 max-w-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="font-bold">메모리 경고</div>
            <div className="text-xs opacity-90">RAM 사용률 {memWarnToast.toFixed(1)}% — 정리를 권장합니다.</div>
          </div>
        </div>
      )}

      {/* 핫 프로세스 토스트 */}
      {hotProcessToast !== null && (
        <div className="fixed top-4 left-4 z-50 px-4 py-3 bg-orange-500 text-white text-sm rounded-xl shadow-lg animate-fade-in flex items-center gap-2.5 max-w-xs">
          <Flame className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="font-bold">CPU 급등 감지</div>
            <div className="text-xs opacity-90">
              {hotProcessToast.name} — CPU {hotProcessToast.cpu.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* 업데이트 배너 */}
      <UpdateBanner />

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

          {/* CPU / 디스크 미니 게이지 */}
          {sysStats && (
            <div className="hidden sm:flex items-center gap-3 ml-3 pl-3 border-l border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400" title={`CPU ${sysStats.cpu_percent.toFixed(1)}%`}>
                <Cpu className="w-3.5 h-3.5" />
                <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={clsx("h-full rounded-full transition-all duration-500",
                      sysStats.cpu_percent < 60 ? "bg-emerald-500" :
                      sysStats.cpu_percent < 80 ? "bg-amber-400" : "bg-red-500")}
                    style={{ width: `${Math.min(100, sysStats.cpu_percent)}%` }}
                  />
                </div>
                <span className="font-mono tabular-nums">{sysStats.cpu_percent.toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400" title={`디스크 C: ${sysStats.disk_used_pct.toFixed(1)}% 사용`}>
                <HardDrive className="w-3.5 h-3.5" />
                <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={clsx("h-full rounded-full transition-all duration-500",
                      sysStats.disk_used_pct < 70 ? "bg-emerald-500" :
                      sysStats.disk_used_pct < 85 ? "bg-amber-400" : "bg-red-500")}
                    style={{ width: `${Math.min(100, sysStats.disk_used_pct)}%` }}
                  />
                </div>
                <span className="font-mono tabular-nums">{sysStats.disk_free_gb.toFixed(0)}GB 여유</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 원클릭 Quick Clean */}
          <button
            onClick={doQuickClean}
            disabled={quickCleaning || killing}
            title="추천 프로세스 즉시 정리 (Ctrl+Q)"
            className="btn !px-3 !py-1.5 text-xs font-semibold bg-gradient-to-r from-emerald-500 to-brand-600 text-white hover:opacity-90 disabled:opacity-50 shadow-sm"
          >
            {quickCleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Quick Clean
          </button>
          <button onClick={() => setShowDiskCleanup(true)} className="btn btn-ghost !px-2.5" title="디스크 정리">
            <HardDrive className="w-4 h-4" /><span className="text-xs">디스크</span>
          </button>
          <button onClick={() => setShowShortcuts(true)} className="btn btn-ghost !px-2" title="단축키 도움말 (?)">
            <Keyboard className="w-4 h-4" />
          </button>
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
            ["process",  "프로세스",    <PlayCircle className="w-3.5 h-3.5" />],
            ["history",  "히스토리",    <History    className="w-3.5 h-3.5" />],
            ["insights", "인사이트",    <BarChart2  className="w-3.5 h-3.5" />],
            ["startup",  "시작 프로그램", <Zap       className="w-3.5 h-3.5" />],
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
                <button onClick={() => { refreshProcesses(threshold); setNextRefreshIn(refreshIntervalSecs); }} className="btn btn-secondary" disabled={loading}>
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
                <div className="ml-auto text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
                  {stats.total}개 · 추천 {stats.recommended}개 · 보호 {stats.protected}개
                  {loadMs !== null && <span className="opacity-70">· {loadMs.toFixed(0)}ms</span>}
                  <span className="opacity-50">·</span>
                  <span title="다음 자동 새로고침까지 남은 시간" className="opacity-60">
                    🔄 {nextRefreshIn < 60 ? `${nextRefreshIn}s` : `${Math.floor(nextRefreshIn / 60)}:${String(nextRefreshIn % 60).padStart(2, "0")}`}
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
                onProtect={handleProtect}
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

        {/* 인사이트 탭 */}
        {tab === "insights" && (
          <div className="flex-1 min-h-0">
            <InsightsPanel />
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
      {showDiskCleanup && (
        <DiskCleanupDialog onClose={() => setShowDiskCleanup(false)} />
      )}
      {showShortcuts && (
        <ShortcutsDialog onClose={() => setShowShortcuts(false)} />
      )}
      {showOnboarding && (
        <OnboardingTour onComplete={completeOnboarding} />
      )}
    </div>
  );
}

// ── 단축키 도움말 ───────────────────────────────────────────────────────────

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const items: Array<[string, string]> = [
    ["F5",        "프로세스 목록 새로고침"],
    ["Ctrl + Q",  "Quick Clean (추천 즉시 정리)"],
    ["Ctrl + A",  "전체 선택"],
    ["Delete",    "선택 항목 Kill 확인 창"],
    ["Esc",       "선택 해제 (모달 닫기 우선)"],
    ["?",         "이 도움말"],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-surface-dark-alt rounded-2xl shadow-2xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-brand-500" />
            <h2 className="text-sm font-bold">키보드 단축키</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost !px-2">
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
        <div className="px-5 py-4 space-y-2">
          {items.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between gap-3 py-1.5">
              <kbd className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 shadow-sm">
                {key}
              </kbd>
              <span className="text-sm text-slate-600 dark:text-slate-300">{desc}</span>
            </div>
          ))}
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            * 입력 필드에 포커스가 있을 때는 단축키가 동작하지 않습니다.
          </div>
        </div>
      </div>
    </div>
  );
}
