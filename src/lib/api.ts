import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import type {
  AppSettings, CleanupOptions, EmptySetReport, HistoryEntry, MemorySnapshot,
  ProcessDetails, ProcessInfo, RecoveryReport, StartupProgram,
  SystemInfo, SystemStats, TempCleanupReport,
} from "./types";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return tauriInvoke<T>(cmd, args);
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export const api = {
  // ── 메모리 ──────────────────────────────────────────────────────────
  getMemory(): Promise<MemorySnapshot> {
    return isTauri ? invoke("get_memory") : http("/api/memory");
  },

  // ── 프로세스 ─────────────────────────────────────────────────────────
  getProcesses(thresholdMb: number): Promise<ProcessInfo[]> {
    return isTauri
      ? invoke("get_processes", { threshold_mb: thresholdMb })
      : http(`/api/processes?threshold_mb=${thresholdMb}`);
  },
  getProcessDetails(pid: number): Promise<ProcessDetails> {
    return invoke("get_process_details", { pid });
  },
  killProcesses(pids: number[]): Promise<RecoveryReport> {
    return isTauri
      ? invoke("kill_processes", { pids })
      : http("/api/kill", { method: "POST", body: JSON.stringify({ pids }) });
  },
  emptyWorkingSet(pids: number[]): Promise<EmptySetReport> {
    return invoke("empty_working_set", { pids });
  },

  // ── 임시 파일 ─────────────────────────────────────────────────────────
  cleanupTempFiles(): Promise<TempCleanupReport> {
    return invoke("cleanup_temp_files");
  },
  cleanupDisk(options: CleanupOptions): Promise<TempCleanupReport> {
    return invoke("cleanup_disk", { options });
  },

  // ── 설정 ──────────────────────────────────────────────────────────────
  getSettings(): Promise<AppSettings> {
    return invoke("get_settings");
  },
  saveSettings(settings: AppSettings): Promise<void> {
    return invoke("save_settings_cmd", { settings });
  },

  // ── 앱 자동 시작 ──────────────────────────────────────────────────────
  getAppAutostart(): Promise<boolean> {
    return invoke("get_app_autostart");
  },
  setAppAutostart(enabled: boolean): Promise<void> {
    return invoke("set_app_autostart", { enabled });
  },

  // ── 히스토리 ──────────────────────────────────────────────────────────
  getHistory(): Promise<HistoryEntry[]> {
    return invoke("get_history");
  },
  clearHistory(): Promise<void> {
    return invoke("clear_history");
  },

  // ── 시작 프로그램 ──────────────────────────────────────────────────────
  getStartupPrograms(): Promise<StartupProgram[]> {
    return invoke("get_startup_programs_cmd");
  },
  toggleStartup(name: string, source: string, enabled: boolean): Promise<void> {
    return invoke("toggle_startup", { name, source, enabled });
  },

  // ── v0.3.0 신규 ────────────────────────────────────────────────────────
  getSystemInfo(): Promise<SystemInfo> {
    return invoke("get_system_info");
  },
  getSystemStats(): Promise<SystemStats> {
    return invoke("get_system_stats");
  },
  setProcessPriority(pid: number, level: "idle" | "below_normal" | "normal"): Promise<void> {
    return invoke("set_process_priority", { pid, level });
  },
  exportHistoryCsv(): Promise<string> {
    return invoke("export_history_csv");
  },
  flushAllWorkingSets(): Promise<EmptySetReport> {
    return invoke("flush_all_working_sets");
  },

  // ── v1.2.0 신규 ────────────────────────────────────────────────────────
  saveRamHistory(history: number[]): Promise<void> {
    return invoke("save_ram_history", { history });
  },
  loadRamHistory(): Promise<number[]> {
    return invoke("load_ram_history");
  },
};

export { isTauri };
