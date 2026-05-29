import { useState } from "react";
import { ChevronRight, ChevronLeft, Sparkles, Settings, BarChart2, Zap, X } from "lucide-react";
import clsx from "clsx";
import { useT } from "../lib/i18n";

interface Props {
  onComplete: () => void;
}

const STEP_ICONS = [
  <Zap     className="w-10 h-10 text-brand-500"  fill="currentColor" />,
  <Sparkles className="w-10 h-10 text-emerald-500" />,
  <Settings className="w-10 h-10 text-amber-500"  />,
  <BarChart2 className="w-10 h-10 text-purple-500" />,
];

const STEP_COLORS = [
  "from-brand-500/10 to-brand-500/5",
  "from-emerald-500/10 to-emerald-500/5",
  "from-amber-500/10 to-amber-500/5",
  "from-purple-500/10 to-purple-500/5",
];

const STEP_KEYS = [
  { title: "onboarding.step1.title", desc: "onboarding.step1.desc" },
  { title: "onboarding.step2.title", desc: "onboarding.step2.desc" },
  { title: "onboarding.step3.title", desc: "onboarding.step3.desc" },
  { title: "onboarding.step4.title", desc: "onboarding.step4.desc" },
] as const;

export function OnboardingTour({ onComplete }: Props) {
  const t = useT();
  const [step, setStep] = useState(0);

  const isLast = step === STEP_KEYS.length - 1;
  const keys = STEP_KEYS[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white dark:bg-surface-dark-alt rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 진행 바 */}
        <div className="h-1 bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500"
            style={{ width: `${((step + 1) / STEP_KEYS.length) * 100}%` }}
          />
        </div>

        {/* 컨텐츠 */}
        <div className={clsx("p-6 text-center bg-gradient-to-b", STEP_COLORS[step])}>
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-2xl bg-white/80 dark:bg-slate-800/80 shadow-sm flex items-center justify-center">
              {STEP_ICONS[step]}
            </div>
          </div>

          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2 leading-snug">
            {t(keys.title)}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {t(keys.desc)}
          </p>
        </div>

        {/* 네비게이션 */}
        <div className="px-5 py-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="btn btn-ghost disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
            {t("onboarding.prev")}
          </button>

          {/* 점 인디케이터 */}
          <div className="flex gap-1.5">
            {STEP_KEYS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={clsx(
                  "rounded-full transition-all duration-200",
                  i === step
                    ? "w-5 h-2 bg-brand-600"
                    : "w-2 h-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400"
                )}
              />
            ))}
          </div>

          {isLast ? (
            <button onClick={onComplete} className="btn btn-primary">
              <Sparkles className="w-3.5 h-3.5" />
              {t("onboarding.start")}
            </button>
          ) : (
            <button onClick={() => setStep(s => s + 1)} className="btn btn-secondary">
              {t("onboarding.next")}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 건너뛰기 */}
        <button
          onClick={onComplete}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
