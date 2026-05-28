import { useEffect, useState } from "react";
import {
  Cpu, HardDrive, Monitor, RefreshCw, Server, Clock, BarChart2, Zap, TrendingDown,
} from "lucide-react";
import clsx from "clsx";
import { api } from "../lib/api";
import type { HistoryEntry, SystemInfo } from "../lib/types";

// ── 포맷 헬퍼 ──────────────────────────────────────────────────────────────

function fmtMb(mb: number) {
  return mb < 1024 ? `${mb.toFixed(1)} MB` : `${(mb / 1024).toFixed(2)} GB`;
}

function fmtUptime(secs: number) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}일 ${h}시간 ${m}분`;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
  } catch { return iso.slice(0, 10); }
}

// ── 시스템 정보 카드 ────────────────────────────────────────────────────────

function SysInfoCard({ info }: { info: SystemInfo }) {
  const rows: Array<[React.ReactNode, string]> = [
    [<Cpu  className="w-3.5 h-3.5 text-brand-500" />, info.cpu_name],
    [<Cpu  className="w-3.5 h-3.5 text-slate-400" />, `${info.cpu_cores} 물리 코어 / ${info.cpu_logical} 논리 코어`],
    [<Server className="w-3.5 h-3.5 text-emerald-500" />, `RAM ${info.total_ram_gb.toFixed(1)} GB`],
    [<Monitor className="w-3.5 h-3.5 text-purple-500" />, `${info.os_name} ${info.os_version}`],
    [<HardDrive className="w-3.5 h-3.5 text-amber-500" />, `커널 ${info.kernel_version}`],
    [<Clock className="w-3.5 h-3.5 text-teal-500" />, `가동 시간: ${fmtUptime(info.uptime_secs)}`],
    [<Zap className="w-3.5 h-3.5 text-slate-400" />, `호스트: ${info.hostname}`],
  ];

  return (
    <div className="card p-4 space-y-2">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3">
        <Monitor className="w-4 h-4 text-brand-500" />
        시스템 정보
      </h3>
      {rows.map(([icon, text], i) => (
        <div key={i} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
          <span className="flex-shrink-0">{icon}</span>
          <span className="truncate">{text}</span>
        </div>
      ))}
    </div>
  );
}

// ── 상위 5 프로세스 ──────────────────────────────────────────────────────────

function TopProcesses({ entries }: { entries: HistoryEntry[] }) {
  const map = new Map<string, { count: number; total_mb: number }>();
  for (const e of entries) {
    if (!e.success) continue;
    const rec = map.get(e.process_name) ?? { count: 0, total_mb: 0 };
    rec.count++;
    rec.total_mb += e.mem_freed_mb;
    map.set(e.process_name, rec);
  }
  const sorted = Array.from(map.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const maxCount = sorted[0]?.[1].count ?? 1;

  return (
    <div className="card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-brand-500" />
        자주 종료된 프로세스 TOP 5
      </h3>
      {sorted.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">데이터가 없습니다.</p>
      ) : sorted.map(([name, rec], i) => (
        <div key={name} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
              <span className="text-slate-400">{i + 1}.</span>
              <span className="truncate max-w-[160px]">{name}</span>
            </span>
            <span className="flex items-center gap-2 text-slate-400">
              <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">{rec.count}회</span>
              <span>{fmtMb(rec.total_mb)}</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-500"
              style={{ width: `${(rec.count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 최근 7일 킬 히스토리 차트 ─────────────────────────────────────────────

function DailyChart({ entries }: { entries: HistoryEntry[] }) {
  // 최근 7일치 날짜별 집계
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const countByDay = new Map<string, { count: number; freed_mb: number }>();
  for (const d of days) countByDay.set(d, { count: 0, freed_mb: 0 });

  for (const e of entries) {
    const day = e.timestamp.slice(0, 10);
    const rec = countByDay.get(day);
    if (rec && e.success) { rec.count++; rec.freed_mb += e.mem_freed_mb; }
  }

  const vals = days.map(d => countByDay.get(d)!);
  const maxCount = Math.max(...vals.map(v => v.count), 1);

  return (
    <div className="card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
        <TrendingDown className="w-4 h-4 text-emerald-500" />
        최근 7일 종료 현황
      </h3>
      <div className="flex items-end justify-between gap-1.5 h-20">
        {vals.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              title={`${days[i]}: ${v.count}회 / ${fmtMb(v.freed_mb)}`}
              className={clsx(
                "w-full rounded-t transition-all duration-500 min-h-[2px]",
                v.count > 0 ? "bg-gradient-to-t from-brand-600 to-brand-400" : "bg-slate-200 dark:bg-slate-700"
              )}
              style={{ height: `${Math.max(2, (v.count / maxCount) * 64)}px` }}
            />
            <span className="text-[9px] text-slate-400 font-mono tabular-nums">
              {fmtDate(days[i]).replace(/^0/, "")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 요약 통계 카드 ──────────────────────────────────────────────────────────

function StatCards({ entries }: { entries: HistoryEntry[] }) {
  const success = entries.filter(e => e.success);
  const totalFreedMb = success.reduce((s, e) => s + e.mem_freed_mb, 0);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = success.filter(e => e.timestamp.startsWith(todayStr)).length;
  const autoCount = entries.filter(e => e.trigger === "auto" && e.success).length;

  const cards = [
    { label: "총 종료 성공", value: `${success.length}회`, color: "text-brand-600 dark:text-brand-400" },
    { label: "총 확보 메모리", value: fmtMb(totalFreedMb), color: "text-emerald-600 dark:text-emerald-400" },
    { label: "오늘 종료", value: `${todayCount}회`, color: "text-amber-600 dark:text-amber-400" },
    { label: "자동 정리", value: `${autoCount}회`, color: "text-purple-600 dark:text-purple-400" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(({ label, value, color }) => (
        <div key={label} className="card p-3 text-center space-y-1">
          <div className={clsx("text-xl font-bold font-mono tabular-nums", color)}>{value}</div>
          <div className="text-xs text-slate-400">{label}</div>
        </div>
      ))}
    </div>
  );
}

// ── InsightsPanel ─────────────────────────────────────────────────────────

export function InsightsPanel() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [h, s] = await Promise.all([
        api.getHistory(),
        api.getSystemInfo(),
      ]);
      setEntries(h);
      setSysInfo(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1 pb-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          통계 & 인사이트
        </span>
        <button onClick={load} className="btn btn-secondary" disabled={loading}>
          <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
          새로고침
        </button>
      </div>

      <StatCards entries={entries} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProcesses entries={entries} />
        <DailyChart entries={entries} />
      </div>

      {sysInfo && <SysInfoCard info={sysInfo} />}
    </div>
  );
}
