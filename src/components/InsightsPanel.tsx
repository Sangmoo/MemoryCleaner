import { useEffect, useState } from "react";
import {
  Cpu, HardDrive, Monitor, RefreshCw, Server, Clock, BarChart2, Zap, TrendingDown, Activity,
} from "lucide-react";
import clsx from "clsx";
import { api } from "../lib/api";
import { useT } from "../lib/i18n";
import type { HistoryEntry, SystemInfo } from "../lib/types";

// ── 포맷 헬퍼 ──────────────────────────────────────────────────────────────

function fmtMb(mb: number) {
  return mb < 1024 ? `${mb.toFixed(1)} MB` : `${(mb / 1024).toFixed(2)} GB`;
}

function fmtUptime(secs: number) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
  } catch { return iso.slice(0, 10); }
}

// ── 24시간 RAM 히스토리 라인 차트 (기능 7) ────────────────────────────────

function RamHistoryChart({ data }: { data: number[] }) {
  const t = useT();
  if (data.length < 2) {
    return (
      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-500" />
          {t("insights.ramHistory")}
        </h3>
        <p className="text-xs text-slate-400 py-4 text-center">{t("insights.noData")}</p>
      </div>
    );
  }

  const W = 400;
  const H = 80;
  const pad = 4;
  const w = W - pad * 2;
  const h = H - pad * 2;
  const min = Math.max(0, Math.min(...data) - 5);
  const max = Math.min(100, Math.max(...data) + 5);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  // 80% 경고 선 y 위치
  const warnY = pad + h - ((80 - min) / range) * h;

  // 색상: 현재 값에 따라
  const latest = data[data.length - 1];
  const lineColor = latest < 60 ? "#4ade80" : latest < 80 ? "#facc15" : "#ef4444";

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-500" />
          {t("insights.ramHistory")}
        </h3>
        <span className="text-xs font-mono text-slate-400">{data.length}분 기록</span>
      </div>
      <div className="relative overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800/60">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
          {/* 80% 경고 선 */}
          {warnY > pad && warnY < H - pad && (
            <line
              x1={pad} y1={warnY} x2={W - pad} y2={warnY}
              stroke="#ef4444" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.5"
            />
          )}
          {/* 라인 */}
          <polyline
            points={pts}
            fill="none"
            stroke={lineColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* 마지막 점 */}
          {(() => {
            const lastX = pad + w;
            const lastV = data[data.length - 1];
            const lastY = pad + h - ((lastV - min) / range) * h;
            return <circle cx={lastX} cy={lastY} r="2.5" fill={lineColor} />;
          })()}
        </svg>
        {/* y축 레이블 */}
        <div className="absolute top-1 right-1 text-[9px] font-mono text-slate-400">{max.toFixed(0)}%</div>
        <div className="absolute bottom-1 right-1 text-[9px] font-mono text-slate-400">{min.toFixed(0)}%</div>
        <div className="absolute bottom-1 left-1 text-[9px] font-mono text-slate-400">{data.length}m ago</div>
        <div className="absolute bottom-1 right-8 text-[9px] font-mono text-slate-400">now</div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>현재: <span className="font-mono font-bold" style={{ color: lineColor }}>{latest.toFixed(0)}%</span></span>
        <span>avg: <span className="font-mono">{(data.reduce((s, v) => s + v, 0) / data.length).toFixed(0)}%</span></span>
        <span>max: <span className="font-mono">{Math.max(...data).toFixed(0)}%</span></span>
      </div>
    </div>
  );
}

// ── 시스템 정보 카드 ────────────────────────────────────────────────────────

function SysInfoCard({ info }: { info: SystemInfo }) {
  const t = useT();
  const rows: Array<[React.ReactNode, string]> = [
    [<Cpu  className="w-3.5 h-3.5 text-brand-500" />, info.cpu_name],
    [<Cpu  className="w-3.5 h-3.5 text-slate-400" />, `${info.cpu_cores} cores / ${info.cpu_logical} logical`],
    [<Server className="w-3.5 h-3.5 text-emerald-500" />, `RAM ${info.total_ram_gb.toFixed(1)} GB`],
    [<Monitor className="w-3.5 h-3.5 text-purple-500" />, `${info.os_name} ${info.os_version}`],
    [<HardDrive className="w-3.5 h-3.5 text-amber-500" />, `Kernel ${info.kernel_version}`],
    [<Clock className="w-3.5 h-3.5 text-teal-500" />, `Uptime: ${fmtUptime(info.uptime_secs)}`],
    [<Zap className="w-3.5 h-3.5 text-slate-400" />, `Host: ${info.hostname}`],
  ];

  return (
    <div className="card p-4 space-y-2">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3">
        <Monitor className="w-4 h-4 text-brand-500" />
        {t("insights.sysInfo")}
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
  const t = useT();
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
        {t("insights.top5")}
      </h3>
      {sorted.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">{t("insights.noData")}</p>
      ) : sorted.map(([name, rec], i) => (
        <div key={name} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
              <span className="text-slate-400">{i + 1}.</span>
              <span className="truncate max-w-[160px]">{name}</span>
            </span>
            <span className="flex items-center gap-2 text-slate-400">
              <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">{rec.count}x</span>
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
  const t = useT();
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
        {t("insights.weekly")}
      </h3>
      <div className="flex items-end justify-between gap-1.5 h-20">
        {vals.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              title={`${days[i]}: ${v.count}x / ${fmtMb(v.freed_mb)}`}
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
  const t = useT();
  const success = entries.filter(e => e.success);
  const totalFreedMb = success.reduce((s, e) => s + e.mem_freed_mb, 0);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = success.filter(e => e.timestamp.startsWith(todayStr)).length;
  const autoCount = entries.filter(e => e.trigger === "auto" && e.success).length;

  const cards = [
    { label: t("insights.totalKill"), value: `${success.length}x`, color: "text-brand-600 dark:text-brand-400" },
    { label: t("insights.totalMem"),  value: fmtMb(totalFreedMb),  color: "text-emerald-600 dark:text-emerald-400" },
    { label: t("insights.todayKill"), value: `${todayCount}x`,     color: "text-amber-600 dark:text-amber-400" },
    { label: t("insights.autoClean"), value: `${autoCount}x`,      color: "text-purple-600 dark:text-purple-400" },
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

interface InsightsPanelProps {
  ramHistory?: number[];
}

export function InsightsPanel({ ramHistory = [] }: InsightsPanelProps) {
  const t = useT();
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
          {t("insights.title")}
        </span>
        <button onClick={load} className="btn btn-secondary" disabled={loading}>
          <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
          {t("insights.refresh")}
        </button>
      </div>

      <StatCards entries={entries} />

      {/* RAM 24시간 히스토리 차트 (기능 7) */}
      <RamHistoryChart data={ramHistory} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProcesses entries={entries} />
        <DailyChart entries={entries} />
      </div>

      {sysInfo && <SysInfoCard info={sysInfo} />}
    </div>
  );
}
