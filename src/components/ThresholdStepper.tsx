import { ChevronUp, ChevronDown } from "lucide-react";
import { fmtThreshold, stepThreshold } from "../lib/format";
import { useT } from "../lib/i18n";

interface Props {
  value: number;
  onChange: (next: number) => void;
}

export function ThresholdStepper({ value, onChange }: Props) {
  const t = useT();
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 dark:text-slate-400">{t("process.thresholdLabel")}</span>
      <div className="flex items-stretch rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 shadow-sm">
        <div className="px-3 py-1.5 bg-white dark:bg-slate-800 font-mono text-sm font-semibold text-slate-800 dark:text-slate-100 min-w-[68px] text-center select-none">
          {fmtThreshold(value)}
        </div>
        <div className="flex flex-col border-l border-slate-300 dark:border-slate-600">
          <button
            onClick={() => onChange(stepThreshold(value, 1))}
            className="px-1.5 py-0 flex-1 bg-slate-50 hover:bg-brand-50 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
            aria-label="기준 증가"
          >
            <ChevronUp className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          </button>
          <div className="border-t border-slate-300 dark:border-slate-600" />
          <button
            onClick={() => onChange(stepThreshold(value, -1))}
            className="px-1.5 py-0 flex-1 bg-slate-50 hover:bg-brand-50 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
            aria-label="기준 감소"
          >
            <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
