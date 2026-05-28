import { useEffect, useRef, useState } from "react";
import { X, Plus, Save, Monitor, Clock, RefreshCw, Bell, Download, Upload } from "lucide-react";
import clsx from "clsx";
import { api, isTauri } from "../lib/api";
import type { AppSettings } from "../lib/types";

interface Props {
  initial: AppSettings;
  onSave: (s: AppSettings) => Promise<void>;
  onClose: () => void;
}

export function SettingsModal({ initial, onSave, onClose }: Props) {
  const [settings, setSettings] = useState<AppSettings>(
    JSON.parse(JSON.stringify(initial)) // deep clone
  );
  const [autostart, setAutostart] = useState(false);
  const [autostartLoading, setAutostartLoading] = useState(false);
  const [newProtected, setNewProtected] = useState("");
  const [saving, setSaving] = useState(false);
  const [useExclude, setUseExclude] = useState(
    initial.auto_clean.exclude_start_hour !== null && initial.auto_clean.exclude_start_hour !== undefined
  );
  const inputRef = useRef<HTMLInputElement>(null);

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
      // 제외 시간대 미사용 시 null로 초기화
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
      };
      await onSave(toSave);
      onClose();
    } catch (e) {
      alert("저장 실패: " + String(e));
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
      alert("자동 시작 설정 실패: " + String(e));
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
        alert("설정을 가져왔습니다. 저장 버튼을 눌러 적용하세요.");
      } catch (e) {
        alert("가져오기 실패: " + String(e));
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
          <h2 className="text-base font-bold">설정</h2>
          <button onClick={onClose} className="btn btn-ghost !px-2"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">

          {/* ── 앱 설정 ──────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-slate-400 inline-block" />
              앱 설정
            </h3>

            {/* 새로고침 간격 */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-sm font-medium">프로세스 목록 새로고침 간격</div>
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
                  <div className="text-sm font-medium">Windows 시작 시 자동 실행</div>
                  <div className="text-xs text-slate-400 mt-0.5">로그인 후 자동으로 트레이에 실행됩니다.</div>
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
          </section>

          {/* ── 메모리 경고 알림 ──────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-red-500 inline-block" />
              메모리 경고 알림
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
                <div className="text-sm font-medium mb-1">경고 임계값</div>
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
              자동 정리
            </h3>

            {/* 활성/비활성 토글 */}
            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
              <div>
                <div className="text-sm font-medium">자동 정리 활성화</div>
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
                  <div className="text-sm font-medium mb-1">임계 메모리 사용률</div>
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
                  <div className="text-sm font-medium">실행 간격</div>
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
                      <div className="text-sm font-medium">자동 정리 제외 시간대</div>
                      <div className="text-xs text-slate-400 mt-0.5">지정한 시간대엔 자동 정리를 건너뜁니다.</div>
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
                        return s > e ? "(자정 넘김)" : "";
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── 보호 프로세스 ──────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-emerald-500 inline-block" />
              보호 프로세스
              <span className="text-xs font-normal text-slate-400">(자동·수동 정리에서 제외)</span>
            </h3>

            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="예: chrome.exe"
                value={newProtected}
                onChange={e => setNewProtected(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addProtected()}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
              />
              <button onClick={addProtected} className="btn btn-secondary">
                <Plus className="w-3.5 h-3.5" /> 추가
              </button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[2rem]">
              {settings.protected_processes.length === 0 ? (
                <span className="text-xs text-slate-400">보호 중인 프로세스가 없습니다.</span>
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
        </div>

        {/* 푸터 */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={importSettings} className="btn btn-ghost text-xs" title="JSON 파일로부터 설정 가져오기">
            <Upload className="w-3.5 h-3.5" /> 가져오기
          </button>
          <button onClick={exportSettings} className="btn btn-ghost text-xs" title="설정을 JSON 파일로 내보내기">
            <Download className="w-3.5 h-3.5" /> 내보내기
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="btn btn-ghost">취소</button>
          <button onClick={save} disabled={saving} className="btn btn-secondary">
            <Save className="w-3.5 h-3.5" />
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
