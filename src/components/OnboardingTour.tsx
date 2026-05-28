import { useState } from "react";
import { ChevronRight, ChevronLeft, Sparkles, Settings, BarChart2, Zap, X } from "lucide-react";
import clsx from "clsx";

interface Props {
  onComplete: () => void;
}

const STEPS = [
  {
    icon: <Zap className="w-10 h-10 text-brand-500" fill="currentColor" />,
    title: "Memory Cleaner에 오신 것을 환영합니다!",
    desc: "Windows 메모리를 스마트하게 관리합니다. 프로세스를 분석하고, 불필요한 메모리를 확보해 PC를 쾌적하게 유지하세요.",
    color: "from-brand-500/10 to-brand-500/5",
  },
  {
    icon: <Sparkles className="w-10 h-10 text-emerald-500" />,
    title: "Quick Clean으로 즉시 정리",
    desc: "헤더의 Quick Clean 버튼 또는 Ctrl+Q를 누르면 추천 프로세스를 한 번에 정리합니다. Kill하기 안전한 프로세스만 자동 선별됩니다.",
    color: "from-emerald-500/10 to-emerald-500/5",
  },
  {
    icon: <Settings className="w-10 h-10 text-amber-500" />,
    title: "자동 정리 & 알림 설정",
    desc: "설정(⚙)에서 메모리 임계값을 지정하면 백그라운드에서 자동으로 정리합니다. 게임·업무·절전 모드 프리셋으로 빠르게 전환하세요.",
    color: "from-amber-500/10 to-amber-500/5",
  },
  {
    icon: <BarChart2 className="w-10 h-10 text-purple-500" />,
    title: "인사이트로 패턴 파악",
    desc: "인사이트 탭에서 메모리 확보 통계, 자주 종료된 프로세스 Top 5, 7일 추이를 확인하고 PC 상태를 한눈에 파악하세요.",
    color: "from-purple-500/10 to-purple-500/5",
  },
];

export function OnboardingTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

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
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* 컨텐츠 */}
        <div className={clsx("p-6 text-center bg-gradient-to-b", current.color)}>
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-2xl bg-white/80 dark:bg-slate-800/80 shadow-sm flex items-center justify-center">
              {current.icon}
            </div>
          </div>

          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2 leading-snug">
            {current.title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {current.desc}
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
            이전
          </button>

          {/* 점 인디케이터 */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
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
              시작하기
            </button>
          ) : (
            <button onClick={() => setStep(s => s + 1)} className="btn btn-secondary">
              다음
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
