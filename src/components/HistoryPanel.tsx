import { useEffect, useState } from "react";
import { Trash2, RefreshCw, Download } from "lucide-react";
import clsx from "clsx";
import { api } from "../lib/api";
import { toast } from "../lib/toast";
import { useT } from "../lib/i18n";
import type { HistoryEntry } from "../lib/types";

export function HistoryPanel() {
  const t = useT();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setEntries(await api.getHistory()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const clear = async () => {
    if (!confirm(t("history.confirmClear"))) return;
    await api.clearHistory();
    setEntries([]);
  };

  const exportCsv = async () => {
    try {
      const csv = await api.exportHistoryCsv();
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ts = new Date().toISOString().slice(0, 10);
      a.download = `memory-cleaner-history-${ts}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(String(e), t("history.csvFail"));
    }
  };

  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
    } catch { return iso; }
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {t("history.count", entries.length)}
        </span>
        <div className="flex gap-2">
          <button onClick={load} className="btn btn-secondary" disabled={loading}>
            <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} /> {t("history.refresh")}
          </button>
          <button onClick={exportCsv} className="btn btn-secondary" disabled={entries.length === 0} title={t("history.csv")}>
            <Download className="w-3.5 h-3.5" /> {t("history.csv")}
          </button>
          <button onClick={clear} className="btn btn-ghost text-red-500" disabled={entries.length === 0}>
            <Trash2 className="w-3.5 h-3.5" /> {t("history.clear")}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden flex-1 min-h-0">
        {/* 헤더 */}
        <div className="flex items-center px-3 py-2 bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <div className="w-36">{t("history.colTime")}</div>
          <div className="flex-1">{t("history.colProcess")}</div>
          <div className="w-20 text-right">{t("history.colMemory")}</div>
          <div className="w-16 text-center">{t("history.colResult")}</div>
          <div className="w-14 text-center">{t("history.colTrigger")}</div>
        </div>

        <div className="overflow-y-auto h-full">
          {entries.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">{t("history.empty")}</div>
          ) : (
            [...entries].reverse().map((e, i) => (
              <div
                key={i}
                className={clsx(
                  "flex items-center px-3 py-2 text-sm border-b border-slate-100 dark:border-slate-800",
                  i % 2 === 0 ? "bg-white dark:bg-surface-dark" : "bg-slate-50/60 dark:bg-surface-dark-alt/30"
                )}
              >
                <div className="w-36 text-xs font-mono text-slate-400">{fmtTime(e.timestamp)}</div>
                <div className="flex-1 truncate font-medium text-slate-700 dark:text-slate-200">{e.process_name}</div>
                <div className="w-20 text-right font-mono text-xs text-slate-500">
                  {e.mem_freed_mb < 1024
                    ? `${e.mem_freed_mb.toFixed(1)} MB`
                    : `${(e.mem_freed_mb / 1024).toFixed(2)} GB`}
                </div>
                <div className="w-16 flex justify-center">
                  <span className={clsx("chip", e.success ? "chip-rec" : "chip-sys")}>
                    {e.success ? t("history.success") : t("history.failed")}
                  </span>
                </div>
                <div className="w-14 flex justify-center">
                  <span className={clsx("chip", e.trigger === "auto" ? "chip-rec" : "chip-nor")}>
                    {e.trigger === "auto" ? t("history.auto") : t("history.manual")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
