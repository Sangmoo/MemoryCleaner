import { CheckCircle2, X, AlertCircle } from "lucide-react";
import type { RecoveryReport } from "../lib/types";

interface Props {
  report: RecoveryReport;
  onClose: () => void;
}

export function ResultDialog({ report, onClose }: Props) {
  const success = report.results.filter(r => r.success).length;
  const fail = report.results.length - success;
  const recovered = report.recovered_gb;
  const isPositive = recovered > 0;

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
            <h3 className="text-lg font-bold">Kill 완료</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Before</div>
            <div className="text-xl font-bold font-mono">
              {report.before_percent.toFixed(1)}%
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">After</div>
            <div className="text-xl font-bold font-mono">
              {report.after_percent.toFixed(1)}%
            </div>
          </div>
        </div>

        <div
          className={`rounded-lg p-4 mb-4 ${
            isPositive
              ? "bg-emerald-50 dark:bg-emerald-900/20"
              : "bg-slate-50 dark:bg-slate-800"
          }`}
        >
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">메모리 확보</div>
          <div
            className={`text-2xl font-bold font-mono ${
              isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"
            }`}
          >
            {isPositive ? "+" : ""}
            {recovered.toFixed(2)} GB
            <span className="text-sm ml-2 opacity-75">
              ({isPositive ? "+" : ""}
              {report.recovery_pct.toFixed(1)}%)
            </span>
          </div>
        </div>

        <div className="text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium">완료:</span> {success}개 종료
          {fail > 0 && (
            <>
              , <span className="text-rose-600">{fail}개 실패</span>
            </>
          )}
        </div>

        {fail > 0 && (
          <div className="mt-3 p-3 rounded bg-rose-50 dark:bg-rose-900/20 text-xs text-rose-700 dark:text-rose-300 max-h-32 overflow-y-auto">
            <div className="flex items-center gap-1.5 font-medium mb-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> 실패
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
          확인
        </button>
      </div>
    </div>
  );
}
