import { useEffect, useState } from "react";
import { CheckCircle2, X, AlertCircle, ArrowRight, TrendingDown } from "lucide-react";
import clsx from "clsx";
import type { RecoveryReport } from "../lib/types";
import { useT } from "../lib/i18n";

interface Props {
  report: RecoveryReport;
  onClose: () => void;
}

// 게이지 색상: 사용률에 따라
function gaugeColor(pct: number) {
  if (pct < 60) return "from-emerald-400 to-emerald-600";
  if (pct < 80) return "from-amber-400 to-amber-600";
  return "from-red-400 to-red-600";
}

function Gauge({ percent, label, animated }: { percent: number; label: string; animated: number }) {
  return (
    <div className="flex-1 space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span className="font-mono font-bold text-base text-slate-700 dark:text-slate-200 tabular-nums">
          {percent.toFixed(1)}%
        </span>
      </div>
      <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className={clsx(
            "h-full bg-gradient-to-r rounded-full transition-all duration-700 ease-out",
            gaugeColor(percent)
          )}
          style={{ width: `${Math.min(100, Math.max(0, animated))}%` }}
        />
      </div>
    </div>
  );
}

export function ResultDialog({ report, onClose }: Props) {
  const t = useT();
  const success = report.results.filter(r => r.success).length;
  const fail = report.results.length - success;
  const recovered = report.recovered_gb;
  const isPositive = recovered > 0;

  // before → after 게이지 애니메이션
  const [animatedAfter, setAnimatedAfter] = useState(report.before_percent);
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedAfter(report.after_percent), 200);
    return () => clearTimeout(timer);
  }, [report.after_percent]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md mx-4 p-6 animate-fade-in shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            <h3 className="text-lg font-bold">{t("result.title")}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Before / After 게이지 비교 */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 mb-4 space-y-3">
          <Gauge percent={report.before_percent} label="Before" animated={report.before_percent} />
          <div className="flex justify-center">
            <ArrowRight className={clsx("w-4 h-4", isPositive ? "text-emerald-500" : "text-slate-400")} />
          </div>
          <Gauge percent={report.after_percent} label="After" animated={animatedAfter} />
        </div>

        {/* 확보량 강조 */}
        <div
          className={clsx(
            "rounded-xl p-4 mb-4 flex items-center gap-3",
            isPositive
              ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-900/10 ring-1 ring-emerald-200 dark:ring-emerald-800"
              : "bg-slate-50 dark:bg-slate-800"
          )}
        >
          {isPositive && (
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400">{t("result.freed")}</div>
            <div
              className={clsx(
                "text-2xl font-bold font-mono tabular-nums",
                isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"
              )}
            >
              {isPositive ? "+" : ""}
              {recovered.toFixed(2)} GB
              <span className="text-sm ml-2 opacity-75">
                ({isPositive ? "+" : ""}{report.recovery_pct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium">{t("result.done", success)}</span>
          {fail > 0 && (
            <>, <span className="text-rose-600">{t("result.failed", fail)}</span></>
          )}
        </div>

        {fail > 0 && (
          <div className="mt-3 p-3 rounded bg-rose-50 dark:bg-rose-900/20 text-xs text-rose-700 dark:text-rose-300 max-h-32 overflow-y-auto">
            <div className="flex items-center gap-1.5 font-medium mb-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> {t("result.failDetail")}
            </div>
            {report.results
              .filter(r => !r.success)
              .map(r => (
                <div key={r.pid} className="font-mono">
                  • {r.name} <span className="opacity-60">— {r.error}</span>
                </div>
              ))}
          </div>
        )}

        <button onClick={onClose} className="btn btn-primary w-full mt-5">
          {t("common.ok")}
        </button>
      </div>
    </div>
  );
}
