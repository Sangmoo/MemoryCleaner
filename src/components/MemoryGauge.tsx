import { Activity } from "lucide-react";
import type { MemorySnapshot } from "../lib/types";

interface Props {
  snap: MemorySnapshot | null;
}

function barColor(pct: number) {
  if (pct < 60) return "from-emerald-400 to-emerald-500";
  if (pct < 80) return "from-amber-400 to-orange-500";
  return "from-rose-500 to-red-600";
}

export function MemoryGauge({ snap }: Props) {
  if (!snap) {
    return (
      <div className="card p-5">
        <div className="h-16 animate-pulse bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    );
  }

  const pct = snap.percent;
  const color = barColor(pct);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-600 dark:text-brand-500" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            RAM 사용 현황
          </h2>
        </div>
        <div className="font-mono text-sm text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {snap.used_gb.toFixed(1)} GB
          </span>
          <span className="mx-1.5 text-slate-400">/</span>
          <span>{snap.total_gb.toFixed(1)} GB</span>
        </div>
      </div>

      <div className="relative h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
        <span>{pct.toFixed(1)}% 사용 중</span>
        <span>{snap.available_gb.toFixed(1)} GB 남음</span>
      </div>
    </div>
  );
}
