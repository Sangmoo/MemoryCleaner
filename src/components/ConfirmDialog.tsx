import { AlertTriangle, X } from "lucide-react";
import { useT } from "../lib/i18n";

interface Props {
  count: number;
  names: string[];
  estimatedMb: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ count, names, estimatedMb, onConfirm, onCancel }: Props) {
  const t = useT();
  const preview = names.slice(0, 12);
  const rest = names.length - preview.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="card w-full max-w-md mx-4 p-6 animate-fade-in shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <h3 className="text-lg font-bold">{t("confirm.title")}</h3>
          </div>
          <button onClick={onCancel} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
          <span className="font-semibold text-slate-900 dark:text-white">{t("confirm.body", count)} </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {estimatedMb < 1024
              ? `${estimatedMb.toFixed(0)} MB`
              : `${(estimatedMb / 1024).toFixed(1)} GB`}
          </span>
        </p>

        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 mb-5 max-h-40 overflow-y-auto text-xs font-mono">
          {preview.map((n, i) => (
            <div key={i} className="py-0.5 text-slate-700 dark:text-slate-300">
              • {n}
            </div>
          ))}
          {rest > 0 && (
            <div className="py-0.5 text-slate-400 italic">{t("confirm.more", rest)}</div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onCancel} className="btn btn-ghost flex-1">
            {t("common.cancel")}
          </button>
          <button onClick={onConfirm} className="btn btn-danger flex-1">
            {t("confirm.ok")}
          </button>
        </div>
      </div>
    </div>
  );
}
