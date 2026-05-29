import { useEffect, useState } from "react";
import { X, Zap, Github, ExternalLink, Heart } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getVersion } from "@tauri-apps/api/app";
import { useT } from "../lib/i18n";

interface Props {
  onClose: () => void;
}

const GITHUB_URL = "https://github.com/Sangmoo/MemoryCleaner";
const RELEASES_URL = `${GITHUB_URL}/releases`;

const STACK = [
  { label: "Tauri v2",    color: "bg-amber-100  dark:bg-amber-900/30  text-amber-700  dark:text-amber-400"  },
  { label: "React 18",    color: "bg-cyan-100   dark:bg-cyan-900/30   text-cyan-700   dark:text-cyan-400"   },
  { label: "Rust",        color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" },
  { label: "TypeScript",  color: "bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-400"   },
  { label: "Tailwind CSS",color: "bg-teal-100   dark:bg-teal-900/30   text-teal-700   dark:text-teal-400"   },
  { label: "sysinfo",     color: "bg-slate-100  dark:bg-slate-700     text-slate-600  dark:text-slate-300"  },
];

export function AboutDialog({ onClose }: Props) {
  const t = useT();
  // 설치된 앱 버전을 Tauri API로 동적으로 읽음 (하드코딩 불필요)
  const [version, setVersion] = useState("...");
  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion("1.2.2"));
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-surface-dark-alt rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 상단 헤더 배너 */}
        <div className="bg-gradient-to-br from-brand-600 to-violet-600 px-6 py-6 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <Zap className="w-9 h-9 text-white" fill="currentColor" />
          </div>
          <div className="text-center text-white">
            <h2 className="text-lg font-bold leading-tight">Memory Cleaner</h2>
            <div className="text-sm opacity-80 mt-0.5">v{version}</div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            {t("about.desc")}
          </p>

          {/* 기술 스택 */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{t("about.techStack")}</div>
            <div className="flex flex-wrap gap-1.5">
              {STACK.map(s => (
                <span key={s.label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* 링크 */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => openUrl(GITHUB_URL)}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60
                hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm text-slate-700 dark:text-slate-200 text-left w-full"
            >
              <Github className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 font-medium">{t("about.sourceCode")}</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => openUrl(RELEASES_URL)}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60
                hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm text-slate-700 dark:text-slate-200 text-left w-full"
            >
              <Zap className="w-4 h-4 flex-shrink-0 text-brand-500" />
              <span className="flex-1 font-medium">{t("about.download")}</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* 라이선스 */}
          <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1">
            <span>MIT License</span>
            <span>·</span>
            <Heart className="w-3 h-3 text-red-400" fill="currentColor" />
            <span>{t("about.license")}</span>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="btn btn-secondary w-full">{t("about.close")}</button>
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
