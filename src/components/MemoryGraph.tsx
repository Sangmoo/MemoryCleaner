import { useT } from "../lib/i18n";

interface Props {
  history: number[]; // 메모리 % 배열 (최신이 마지막)
}

export function MemoryGraph({ history }: Props) {
  const t = useT();

  if (history.length < 2) {
    return (
      <div className="h-12 flex items-center justify-center text-xs text-slate-400">
        {t("graph.collecting")}
      </div>
    );
  }

  const W = 300;
  const H = 48;
  const pad = 2;
  const min = Math.max(0, Math.min(...history) - 5);
  const max = Math.min(100, Math.max(...history) + 5);
  const range = max - min || 1;

  const toX = (i: number) => pad + (i / (history.length - 1)) * (W - pad * 2);
  const toY = (v: number) => H - pad - ((v - min) / range) * (H - pad * 2);

  const points = history.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const area = [
    `M${toX(0)},${H}`,
    ...history.map((v, i) => `L${toX(i)},${toY(v)}`),
    `L${toX(history.length - 1)},${H}`,
    "Z",
  ].join(" ");

  const current = history[history.length - 1];
  const color = current >= 90 ? "#ef4444" : current >= 75 ? "#f59e0b" : "#3b82f6";

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-12"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="memgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#memgrad)" />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute top-0 right-0 flex gap-3 text-xs font-mono text-slate-400">
        <span>{t("graph.min")} {Math.min(...history).toFixed(0)}%</span>
        <span>{t("graph.max")} {Math.max(...history).toFixed(0)}%</span>
      </div>
    </div>
  );
}
