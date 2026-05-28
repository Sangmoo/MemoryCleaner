import { useEffect, useRef, useState } from "react";
import { X, Plus, Save, Monitor, Clock, RefreshCw, Bell, Download, Upload, Cpu, CalendarDays, SkipForward, Globe } from "lucide-react";
import clsx from "clsx";
import { api, isTauri } from "../lib/api";
import { toast } from "../lib/toast";
import type { AppSettings, CleanSchedule, SettingsProfile } from "../lib/types";
import { useT } from "../lib/i18n";

interface Props {
  initial: AppSettings;
  onSave: (s: AppSettings) => Promise<void>;
  onClose: () => void;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 고유 ID 생성
let _id = 0;
function genId() { return `sched-${Date.now()}-${++_id}`; }

export function SettingsModal({ initial, onSave, onClose }: Props) {
  const t = useT();
  const [settings, setSettings] = useState<AppSettings>(() => {
    const clone: AppSettings = JSON.parse(JSON.stringify(initial));
    if (!clone.schedules) clone.schedules = [];
    if (!clone.skip_if_running) clone.skip_if_running = [];
    if (!clone.language) clone.language = "ko";
    return clone;
  });
  const [autostart, setAutostart] = useState(false);
  const [autostartLoading, setAutostartLoading] = useState(false);
  const [newProtected, setNewProtected] = useState("");
  const [newSkipProcess, setNewSkipProcess] = useState("");
  const [saving, setSaving] = useState(false);
  const [useExclude, setUseExclude] = useState(
    initial.auto_clean.exclude_start_hour !== null && initial.auto_clean.exclude_start_hour !== undefined
  );
  const [newSchedTime, setNewSchedTime] = useState("03:00");
  const [newSchedDays, setNewSchedDays] = useState<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipInputRef = useRef<HTMLInputElement>(null);

  // 앱 자동 시작 상태 로드
  useEffect(() => {
    if (!isTauri) return;
    api.getAppAutostart().then(setAutostart).catch(console.error);
  }, []);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const save = async () => {
    setSaving(true);
    try {
      const toSave: AppSettings = {
        ...settings,
        auto_clean: {
          ...settings.auto_clean,
          exclude_start_hour: useExclude ? settings.auto_clean.exclude_start_hour : null,
          exclude_end_hour: useExclude ? settings.auto_clean.exclude_end_hour : null,
        },
        autostart,
        process_refresh_seconds: settings.process_refresh_seconds ?? 10,
        warn_notifications_enabled: settings.warn_notifications_enabled ?? true,
        warn_threshold_percent: settings.warn_threshold_percent ?? 90,
        schedules: settings.schedules ?? [],
        skip_if_running: settings.skip_if_running ?? [],
        language: settings.language ?? "ko",
      };
      // 언어 로컬 저장
      localStorage.setItem("memtool-language", toSave.language);
      await onSave(toSave);
      onClose();
    } catch (e) {
      toast.error(String(e), t("settings.save"));
    } finally {
      setSaving(false);
    }
  };

  const toggleAutostart = async () => {
    setAutostartLoading(true);
    try {
      await api.setAppAutostart(!autostart);
      setAutostart(!autostart);
    } catch (e) {
      toast.error(String(e), t("settings.autoStart"));
    } finally {
      setAutostartLoading(false);
    }
  };

  const addProtected = () => {
    const name = newProtected.trim().toLowerCase();
    if (!name) return;
    if (settings.protected_processes.includes(name)) return;
    setSettings(prev => ({
      ...prev,
      protected_processes: [...prev.protected_processes, name],
    }));
    setNewProtected("");
    inputRef.current?.focus();
  };

  const removeProtected = (name: string) => {
    setSettings(prev => ({
      ...prev,
      protected_processes: prev.protected_processes.filter(n => n !== name),
    }));
  };

  // ── skipIfRunning 관리 ───────────────────────────────────────────────
  const addSkipProcess = () => {
    const name = newSkipProcess.trim().toLowerCase();
    if (!name) return;
    const list = settings.skip_if_running ?? [];
    if (list.includes(name)) return;
    setSettings(prev => ({
      ...prev,
      skip_if_running: [...(prev.skip_if_running ?? []), name],
    }));
    setNewSkipProcess("");
    skipInputRef.current?.focus();
  };

  const removeSkipProcess = (name: string) => {
    setSettings(prev => ({
      ...prev,
      skip_if_running: (prev.skip_if_running ?? []).filter(n => n !== name),
    }));
  };

  // ── 스케줄 관리 ─────────────────────────────────────────────────────
  const addSchedule = () => {
    if (!newSchedTime.match(/^\d{2}:\d{2}$/)) return;
    const newSched: CleanSchedule = {
      id: genId(),
      time: newSchedTime,
      days: newSchedDays,
      enabled: true,
    };
    setSettings(prev => ({
      ...prev,
      schedules: [...(prev.schedules ?? []), newSched],
    }));
    setNewSchedDays([]);
  };

  const removeSchedule = (id: string) => {
    setSettings(prev => ({
      ...prev,
      schedules: (prev.schedules ?? []).filter(s => s.id !== id),
    }));
  };

  const toggleScheduleEnabled = (id: string) => {
    setSettings(prev => ({
      ...prev,
      schedules: (prev.schedules ?? []).map(s =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      ),
    }));
  };

  const toggleSchedDay = (day: number) => {
    setNewSchedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // ── 설정 내보내기 ────────────────────────────────────────────────────
  const exportSettings = () => {
    const data = { ...settings, autostart };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.download = `memory-cleaner-settings-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── 설정 가져오기 ────────────────────────────────────────────────────
  const importSettings = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text) as AppSettings;
        if (!imported.auto_clean || !Array.isArray(imported.protected_processes)) {
          throw new Error("올바른 설정 파일 형식이 아닙니다.");
        }
        setSettings({
          ...settings,
          ...imported,
          auto_clean: { ...settings.auto_clean, ...imported.auto_clean },
        });
        if (typeof imported.autostart === "boolean") setAutostart(imported.autostart);
        toast.success("저장 버튼을 눌러 적용하세요.", t("settings.import"));
      } catch (e) {
        toast.error(String(e), t("settings.import"));
      }
    };
    input.click();
  };

  // 시간 표시 헬퍼
  const fmtHour = (h: number) => `${String(h).padStart(2, "0")}:00`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdrop}
    >
      <div className="bg-white dark:bg-surface-dark-alt rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-bold">{t("settings.title")}</h2>
          <button onClick={onClose} className="btn btn-ghost !px-2"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">

          {/* ── 앱 설정 ──────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-slate-400 inline-block" />
              {t("settings.appSettings")}
            </h3>

            {/* 새로고침 간격 */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-sm font-medium">{t("settings.autoRefresh")}</div>
                  <div className="text-xs text-slate-400 mt-0.5">자동으로 목록을 갱신하는 주기</div>
                </div>
              </div>
              <select
                value={settings.process_refresh_seconds ?? 10}
                onChange={e => setSettings(prev => ({ ...prev, process_refresh_seconds: Number(e.target.value) }))}
                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
              >
                <option value={5}>5초</option>
                <option value={10}>10초</option>
                <option value={30}>30초</option>
                <option value={60}>1분</option>
                <option value={180}>3분</option>
                <option value={300}>5분</option>
              </select>
            </div>

            {/* 자동 시작 */}
            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Monitor className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-sm font-medium">{t("settings.autoStart")}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{t("settings.autoStartDesc")}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleAutostart}
                disabled={autostartLoading}
                className={clsx(
                  "relative w-11 h-6 rounded-full transition-colors duration-200 overflow-hidden flex-shrink-0",
                  autostart ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600",
                  autostartLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className={clsx(
                  "absolute top-[4px] w-[16px] h-[16px] bg-white rounded-full shadow transition-all duration-200",
                  autostart ? "left-[27px]" : "left-[4px]"
                )} />
              </button>
            </label>

            {/* 언어 설정 */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-slate-400" />
                <div className="text-sm font-medium">{t("settings.language")}</div>
              </div>
              <select
                value={settings.language ?? "ko"}
                onChange={e => setSettings(prev => ({ ...prev, language: e.target.value }))}
                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
              >
                <option value="ko">한국어</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </div>
          </section>

          {/* ── 메모리 경고 알림 ──────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-red-500 inline-block" />
              {t("settings.memWarn")}
              <span className="text-xs font-normal text-slate-400">(자동정리와 독립)</span>
            </h3>

            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-sm font-medium">RAM 임계값 도달 시 OS 알림</div>
                  <div className="text-xs text-slate-400 mt-0.5">자동정리가 꺼져 있어도 경고만 보냅니다.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettings(prev => ({
                  ...prev,
                  warn_notifications_enabled: !(prev.warn_notifications_enabled ?? true),
                }))}
                className={clsx(
                  "relative w-11 h-6 rounded-full transition-colors duration-200 overflow-hidden flex-shrink-0",
                  (settings.warn_notifications_enabled ?? true) ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600"
                )}
              >
                <span className={clsx(
                  "absolute top-[4px] w-[16px] h-[16px] bg-white rounded-full shadow transition-all duration-200",
                  (settings.warn_notifications_enabled ?? true) ? "left-[27px]" : "left-[4px]"
                )} />
              </button>
            </label>

            <div className={clsx(
              "flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 transition-opacity",
              !(settings.warn_notifications_enabled ?? true) && "opacity-40 pointer-events-none"
            )}>
              <div className="flex-1">
                <div className="text-sm font-medium mb-1">{t("settings.warnThreshold")}</div>
                <input
                  type="range" min="60" max="99" step="1"
                  value={settings.warn_threshold_percent ?? 90}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    warn_threshold_percent: Number(e.target.value),
                  }))}
                  className="w-full accent-red-500"
                />
              </div>
              <div className="w-14 text-center">
                <span className="text-lg font-bold text-red-500">{settings.warn_threshold_percent ?? 90}</span>
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>
          </section>

          {/* ── 자동 정리 ─────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-brand-500 inline-block" />
              {t("settings.autoClean")}
            </h3>

            {/* 활성/비활성 토글 */}
            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
              <div>
                <div className="text-sm font-medium">{t("settings.enabled")}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  메모리 사용률 초과 시 추천 프로세스를 자동 종료합니다.
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings(prev => ({
                    ...prev,
                    auto_clean: { ...prev.auto_clean, enabled: !prev.auto_clean.enabled },
                  }))
                }
                className={clsx(
                  "relative w-11 h-6 rounded-full transition-colors duration-200 overflow-hidden flex-shrink-0",
                  settings.auto_clean.enabled ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600"
                )}
              >
                <span className={clsx(
                  "absolute top-[4px] w-[16px] h-[16px] bg-white rounded-full shadow transition-all duration-200",
                  settings.auto_clean.enabled ? "left-[27px]" : "left-[4px]"
                )} />
              </button>
            </label>

            <div className={clsx("space-y-3 transition-opacity", !settings.auto_clean.enabled && "opacity-40 pointer-events-none")}>
              {/* 임계값 */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="flex-1">
                  <div className="text-sm font-medium mb-1">{t("settings.threshold")}</div>
                  <input
                    type="range" min="50" max="99" step="1"
                    value={settings.auto_clean.threshold_percent}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      auto_clean: { ...prev.auto_clean, threshold_percent: Number(e.target.value) },
                    }))}
                    className="w-full accent-brand-600"
                  />
                </div>
                <div className="w-14 text-center">
                  <span className="text-lg font-bold text-brand-600">{settings.auto_clean.threshold_percent}</span>
                  <span className="text-xs text-slate-400">%</span>
                </div>
              </div>

              {/* 실행 간격 */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="flex-1">
                  <div className="text-sm font-medium">{t("settings.interval")}</div>
                  <div className="text-xs text-slate-400">임계값 초과 후 재실행 대기 시간</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number" min="10" max="3600" step="10"
                    value={settings.auto_clean.interval_seconds}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      auto_clean: { ...prev.auto_clean, interval_seconds: Number(e.target.value) },
                    }))}
                    className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-right"
                  />
                  <span className="text-xs text-slate-400">초</span>
                </div>
              </div>

              {/* 제외 시간대 */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm font-medium">{t("settings.excludeTime")}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{t("settings.excludeDesc")}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseExclude(v => !v)}
                    className={clsx(
                      "relative w-11 h-6 rounded-full transition-colors duration-200 overflow-hidden flex-shrink-0",
                      useExclude ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600"
                    )}
                  >
                    <span className={clsx(
                      "absolute top-[4px] w-[16px] h-[16px] bg-white rounded-full shadow transition-all duration-200",
                      useExclude ? "left-[27px]" : "left-[4px]"
                    )} />
                  </button>
                </label>

                {useExclude && (
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      value={settings.auto_clean.exclude_start_hour ?? 22}
                      onChange={e => setSettings(prev => ({
                        ...prev,
                        auto_clean: { ...prev.auto_clean, exclude_start_hour: Number(e.target.value) },
                      }))}
                      className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{fmtHour(i)}</option>
                      ))}
                    </select>
                    <span className="text-sm text-slate-400">~</span>
                    <select
                      value={settings.auto_clean.exclude_end_hour ?? 8}
                      onChange={e => setSettings(prev => ({
                        ...prev,
                        auto_clean: { ...prev.auto_clean, exclude_end_hour: Number(e.target.value) },
                      }))}
                      className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{fmtHour(i)}</option>
                      ))}
                    </select>
                    <span className="text-xs text-slate-400 ml-1">
                      {(() => {
                        const s = settings.auto_clean.exclude_start_hour ?? 22;
                        const e = settings.auto_clean.exclude_end_hour ?? 8;
                        return s > e ? `(${t("settings.midnight")})` : "";
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── 설정 프리셋 ───────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-purple-500 inline-block" />
              {t("settings.presets")}
              <span className="text-xs font-normal text-slate-400">({t("settings.presetClick")})</span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(settings.profiles ?? []).map((profile: SettingsProfile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => {
                    setSettings(prev => ({
                      ...prev,
                      auto_clean: {
                        ...prev.auto_clean,
                        enabled: profile.auto_clean_enabled,
                        threshold_percent: profile.auto_clean_threshold,
                        interval_seconds: profile.auto_clean_interval_seconds,
                      },
                      warn_threshold_percent: profile.warn_threshold_percent,
                    }));
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60
                    border border-slate-200 dark:border-slate-700
                    hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20
                    transition-all text-center group"
                >
                  <span className="text-2xl leading-none">{profile.icon}</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                    {profile.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {profile.auto_clean_threshold}% / {profile.auto_clean_interval_seconds < 60
                      ? `${profile.auto_clean_interval_seconds}초`
                      : `${Math.floor(profile.auto_clean_interval_seconds / 60)}분`}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* ── CPU 급등 감지 ─────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-orange-500 inline-block" />
              {t("settings.cpuSpike")}
            </h3>
            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-sm font-medium">CPU 70%+ 급등 프로세스 알림</div>
                  <div className="text-xs text-slate-400 mt-0.5">{t("settings.cpuSpikeDesc")}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettings(prev => ({
                  ...prev,
                  hot_process_detection: !(prev.hot_process_detection ?? true),
                }))}
                className={clsx(
                  "relative w-11 h-6 rounded-full transition-colors duration-200 overflow-hidden flex-shrink-0",
                  (settings.hot_process_detection ?? true) ? "bg-orange-500" : "bg-slate-300 dark:bg-slate-600"
                )}
              >
                <span className={clsx(
                  "absolute top-[4px] w-[16px] h-[16px] bg-white rounded-full shadow transition-all duration-200",
                  (settings.hot_process_detection ?? true) ? "left-[27px]" : "left-[4px]"
                )} />
              </button>
            </label>
          </section>

          {/* ── 보호 프로세스 ──────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-emerald-500 inline-block" />
              {t("settings.protected")}
              <span className="text-xs font-normal text-slate-400">(자동·수동 정리에서 제외)</span>
            </h3>

            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder={t("settings.protectedPlaceholder")}
                value={newProtected}
                onChange={e => setNewProtected(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addProtected()}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
              />
              <button onClick={addProtected} className="btn btn-secondary">
                <Plus className="w-3.5 h-3.5" /> {t("settings.add")}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[2rem]">
              {settings.protected_processes.length === 0 ? (
                <span className="text-xs text-slate-400">{t("settings.noProtected")}</span>
              ) : (
                settings.protected_processes.map(name => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono"
                  >
                    {name}
                    <button onClick={() => removeProtected(name)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </section>

          {/* ── 스케줄 자동 정리 (기능 5) ──────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-teal-500 inline-block" />
              <CalendarDays className="w-4 h-4 text-teal-500" />
              {t("settings.scheduler")}
            </h3>
            <p className="text-xs text-slate-400">{t("settings.schedulerDesc")}</p>

            {/* 새 스케줄 추가 */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={newSchedTime}
                  onChange={e => setNewSchedTime(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                />
                <button onClick={addSchedule} className="btn btn-secondary text-xs">
                  <Plus className="w-3.5 h-3.5" /> {t("settings.addSchedule")}
                </button>
              </div>
              {/* 요일 선택 */}
              <div className="flex gap-1.5 flex-wrap">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleSchedDay(i)}
                    className={clsx(
                      "w-8 h-8 rounded-full text-xs font-semibold border transition-colors",
                      newSchedDays.includes(i)
                        ? "bg-teal-600 border-teal-600 text-white"
                        : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 hover:border-teal-400"
                    )}
                  >
                    {label}
                  </button>
                ))}
                <span className="text-xs text-slate-400 flex items-center ml-1">
                  (미선택 = 매일)
                </span>
              </div>
            </div>

            {/* 스케줄 목록 */}
            <div className="space-y-2">
              {(settings.schedules ?? []).length === 0 ? (
                <span className="text-xs text-slate-400">{t("settings.noSchedule")}</span>
              ) : (
                (settings.schedules ?? []).map(sched => (
                  <div
                    key={sched.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                  >
                    {/* 활성/비활성 */}
                    <button
                      type="button"
                      onClick={() => toggleScheduleEnabled(sched.id)}
                      className={clsx(
                        "relative w-9 h-5 rounded-full transition-colors duration-200 overflow-hidden flex-shrink-0",
                        sched.enabled ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-600"
                      )}
                    >
                      <span className={clsx(
                        "absolute top-[3px] w-[14px] h-[14px] bg-white rounded-full shadow transition-all duration-200",
                        sched.enabled ? "left-[21px]" : "left-[3px]"
                      )} />
                    </button>
                    <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-200 w-12">{sched.time}</span>
                    <div className="flex gap-1 flex-1">
                      {sched.days.length === 0 ? (
                        <span className="text-xs text-slate-400">매일</span>
                      ) : sched.days.sort().map(d => (
                        <span key={d} className="text-[10px] px-1 py-0.5 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-semibold">
                          {DAY_LABELS[d]}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => removeSchedule(sched.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ── 실행 중 정리 건너뜀 (기능 9) ──────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-amber-500 inline-block" />
              <SkipForward className="w-4 h-4 text-amber-500" />
              {t("settings.skipIfRunning")}
            </h3>
            <p className="text-xs text-slate-400">{t("settings.skipIfRunningDesc")}</p>

            <div className="flex gap-2">
              <input
                ref={skipInputRef}
                type="text"
                placeholder={t("settings.protectedPlaceholder")}
                value={newSkipProcess}
                onChange={e => setNewSkipProcess(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addSkipProcess()}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
              />
              <button onClick={addSkipProcess} className="btn btn-secondary">
                <Plus className="w-3.5 h-3.5" /> {t("settings.add")}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[2rem]">
              {(settings.skip_if_running ?? []).length === 0 ? (
                <span className="text-xs text-slate-400">{t("settings.noProtected")}</span>
              ) : (
                (settings.skip_if_running ?? []).map(name => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-mono"
                  >
                    {name}
                    <button onClick={() => removeSkipProcess(name)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </section>
        </div>

        {/* 푸터 */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={importSettings} className="btn btn-ghost text-xs" title={t("settings.import")}>
            <Upload className="w-3.5 h-3.5" /> {t("settings.import")}
          </button>
          <button onClick={exportSettings} className="btn btn-ghost text-xs" title={t("settings.export")}>
            <Download className="w-3.5 h-3.5" /> {t("settings.export")}
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="btn btn-ghost">{t("settings.cancel")}</button>
          <button onClick={save} disabled={saving} className="btn btn-secondary">
            <Save className="w-3.5 h-3.5" />
            {saving ? t("settings.saving") : t("settings.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
