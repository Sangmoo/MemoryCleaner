import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import clsx from "clsx";
import type { ToastItem, ToastType } from "../lib/toast";

interface Props {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const CONFIG: Record<ToastType, {
  icon: React.ReactNode;
  bg: string;
  border: string;
  title: string;
}> = {
  success: {
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
    bg:     "bg-white dark:bg-slate-800",
    border: "border-l-4 border-emerald-500",
    title:  "text-emerald-700 dark:text-emerald-400",
  },
  error: {
    icon: <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
    bg:     "bg-white dark:bg-slate-800",
    border: "border-l-4 border-red-500",
    title:  "text-red-700 dark:text-red-400",
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
    bg:     "bg-white dark:bg-slate-800",
    border: "border-l-4 border-amber-500",
    title:  "text-amber-700 dark:text-amber-400",
  },
  info: {
    icon: <Info className="w-4 h-4 text-brand-500 flex-shrink-0" />,
    bg:     "bg-white dark:bg-slate-800",
    border: "border-l-4 border-brand-500",
    title:  "text-brand-700 dark:text-brand-400",
  },
};

function Toast({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  const cfg = CONFIG[item.type];

  // 4초 후 자동 제거
  useEffect(() => {
    const t = setTimeout(() => onRemove(item.id), 4000);
    return () => clearTimeout(t);
  }, [item.id, onRemove]);

  return (
    <div
      className={clsx(
        "flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg animate-fade-in",
        "w-80 max-w-[90vw]",
        cfg.bg, cfg.border,
        "ring-1 ring-slate-200/80 dark:ring-slate-700/80"
      )}
    >
      {cfg.icon}
      <div className="flex-1 min-w-0">
        {item.title && (
          <div className={clsx("text-sm font-semibold leading-tight", cfg.title)}>
            {item.title}
          </div>
        )}
        <div className="text-sm text-slate-600 dark:text-slate-300 leading-snug mt-0.5 break-words">
          {item.message}
        </div>
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className="flex-shrink-0 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }: Props) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 items-end">
      {toasts.map(t => (
        <Toast key={t.id} item={t} onRemove={onRemove} />
      ))}
    </div>,
    document.body
  );
}
