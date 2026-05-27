import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import type {
  AppSettings, EmptySetReport, HistoryEntry, MemorySnapshot,
  ProcessDetails, ProcessInfo, RecoveryReport, StartupProgram,
  TempCleanupReport,
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
};

export { isTauri };
