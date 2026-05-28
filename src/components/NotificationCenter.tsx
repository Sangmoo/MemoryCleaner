import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, X, CheckCircle2, AlertTriangle, Flame, Trash2 } from "lucide-react";
import clsx from "clsx";

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

export function NotificationCenter({ notifs, open, onToggle, onRead, onClear }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const unread = notifs.filter(n => !n.read).length;

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
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

  return (
    <div className="relative" ref={panelRef}>
      {/* 벨 버튼 */}
      <button
        onClick={onToggle}
        className={clsx(
          "btn btn-ghost !px-2 relative",
          open && "bg-slate-100 dark:bg-slate-700"
        )}
        title="알림 센터"
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
          className="fixed z-[300] w-80 max-h-[420px] flex flex-col
            bg-white dark:bg-slate-800 rounded-2xl shadow-2xl
            border border-slate-200 dark:border-slate-700 animate-fade-in"
          style={{ top: 56, right: 16 }}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">알림 센터</span>
            <div className="flex items-center gap-1">
              {notifs.length > 0 && (
                <button
                  onClick={onClear}
                  className="btn btn-ghost !px-1.5 text-xs text-slate-400 hover:text-red-500"
                  title="전체 지우기"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={onToggle} className="btn btn-ghost !px-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 알림 목록 */}
          <div className="overflow-y-auto flex-1">
            {notifs.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                알림이 없습니다
              </div>
            ) : (
              [...notifs].reverse().map(n => {
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
