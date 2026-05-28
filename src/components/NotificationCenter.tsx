import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X, CheckCircle2, AlertTriangle, Flame, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useT } from "../lib/i18n";

export type NotifType = "auto_clean" | "mem_warn" | "cpu_spike" | "info";

export interface Notif {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  time: Date;
  read: boolean;
}

interface Props {
  notifs: Notif[];
  open: boolean;
  onToggle: () => void;
  onRead: () => void;
  onClear: () => void;
  maxCount?: number;
}

const TYPE_CFG: Record<NotifType, {
  icon: React.ReactNode;
  color: string;
}> = {
  auto_clean: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30",
  },
  mem_warn: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-red-500 bg-red-100 dark:bg-red-900/30",
  },
  cpu_spike: {
    icon: <Flame className="w-4 h-4" />,
    color: "text-orange-500 bg-orange-100 dark:bg-orange-900/30",
  },
  info: {
    icon: <Bell className="w-4 h-4" />,
    color: "text-brand-500 bg-brand-100 dark:bg-brand-900/30",
  },
};

// 기능 11: 필터 탭
type FilterType = "all" | "auto_clean" | "mem_warn" | "cpu_spike";

function fmtTime(d: Date) {
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH}시간 전`;
  return d.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export function NotificationCenter({ notifs, open, onToggle, onRead, onClear, maxCount = 50 }: Props) {
  const t = useT();
  // bellRef: 벨 버튼 영역, dropdownRef: createPortal로 렌더된 드롭다운 패널
  // 두 ref 모두 체크해야 패널 내부 클릭이 "외부 클릭"으로 오인되지 않음
  const bellRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const unread = notifs.filter(n => !n.read).length;

  // 필터별 개수
  const counts: Record<FilterType, number> = {
    all:        notifs.length,
    auto_clean: notifs.filter(n => n.type === "auto_clean").length,
    mem_warn:   notifs.filter(n => n.type === "mem_warn").length,
    cpu_spike:  notifs.filter(n => n.type === "cpu_spike").length,
  };

  // 필터 적용된 목록
  const filtered = filter === "all" ? notifs : notifs.filter(n => n.type === filter);

  // 바깥 클릭 시 닫기
  // Portal 패널은 document.body에 붙어 있어 bellRef.contains()로는 잡히지 않음
  // → dropdownRef도 함께 확인해야 패널 안쪽 버튼 클릭이 outside-click으로 오인되지 않음
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inBell     = bellRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inBell && !inDropdown) {
        onToggle();
      }
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onToggle]);

  // 패널 열릴 때 자동으로 모두 읽음
  useEffect(() => {
    if (open && unread > 0) onRead();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const filterTabs: Array<{ key: FilterType; label: string }> = [
    { key: "all",        label: t("notifications.all") },
    { key: "auto_clean", label: t("notifications.autoClean") },
    { key: "mem_warn",   label: t("notifications.memWarn") },
    { key: "cpu_spike",  label: t("notifications.cpuSpike") },
  ];

  return (
    <div className="relative" ref={bellRef}>
      {/* 벨 버튼 */}
      <button
        onClick={onToggle}
        className={clsx(
          "btn btn-ghost !px-2 relative",
          open && "bg-slate-100 dark:bg-slate-700"
        )}
        title={t("notifications.title")}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* 드롭다운 패널 */}
      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[300] w-80 max-h-[480px] flex flex-col
            bg-white dark:bg-slate-800 rounded-2xl shadow-2xl
            border border-slate-200 dark:border-slate-700 animate-fade-in"
          style={{ top: 56, right: 16 }}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t("notifications.title")}</span>
              <span className="text-[10px] font-mono text-slate-400 tabular-nums">{notifs.length} / {maxCount}</span>
            </div>
            <div className="flex items-center gap-1">
              {notifs.length > 0 && (
                <button
                  onClick={onClear}
                  className="btn btn-ghost !px-1.5 text-xs text-slate-400 hover:text-red-500"
                  title={t("notifications.clear")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={onToggle} className="btn btn-ghost !px-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 기능 11: 필터 탭 */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 px-2 pt-1 gap-0.5 overflow-x-auto">
            {filterTabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={clsx(
                  "flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap",
                  filter === key
                    ? "bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border-b-2 border-brand-500"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                {label}
                {counts[key] > 0 && (
                  <span className={clsx(
                    "text-[9px] px-1 py-0.5 rounded-full font-bold",
                    filter === key
                      ? "bg-brand-600 text-white"
                      : "bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300"
                  )}>
                    {counts[key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 알림 목록 */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {t("notifications.empty")}
              </div>
            ) : (
              [...filtered].reverse().map(n => {
                const cfg = TYPE_CFG[n.type];
                return (
                  <div
                    key={n.id}
                    className={clsx(
                      "flex items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0",
                      !n.read && "bg-brand-50/40 dark:bg-brand-900/10"
                    )}
                  >
                    <div className={clsx("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0", cfg.color)}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight">{n.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5 leading-snug">{n.message}</div>
                    </div>
                    <span className="text-[10px] text-slate-300 dark:text-slate-500 flex-shrink-0 mt-0.5">
                      {fmtTime(n.time)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
