export interface ProcessInfo {
  pid: number;
  name: string;
  mem_mb: number;
  mem_bytes: number;
  cpu_percent: number;
  is_system: boolean;
  safe_kill: boolean;
  is_protected: boolean;
}

export interface ProcessDetails {
  pid: number;
  name: string;
  exe_path: string;
  cmd: string[];
  mem_mb: number;
  cpu_percent: number;
  status: string;
}

export interface MemorySnapshot {
  total: number;
  used: number;
  available: number;
  percent: number;
  total_gb: number;
  used_gb: number;
  available_gb: number;
}

export interface KillResult {
  pid: number;
  name: string;
  mem_freed: number;
  success: boolean;
  error: string | null;
}

export interface RecoveryReport {
  before_percent: number;
  after_percent: number;
  recovered_bytes: number;
  recovered_gb: number;
  recovery_pct: number;
  results: KillResult[];
}

export interface AutoCleanConfig {
  enabled: boolean;
  threshold_percent: number;
  interval_seconds: number;
  exclude_start_hour: number | null;
  exclude_end_hour: number | null;
}

export interface AppSettings {
  auto_clean: AutoCleanConfig;
  protected_processes: string[];
  theme: string;
  autostart: boolean;
  process_refresh_seconds: number;
}

export interface HistoryEntry {
  timestamp: string;
  process_name: string;
  pid: number;
  mem_freed_mb: number;
  success: boolean;
  error: string | null;
  trigger: "manual" | "auto";
}

export interface StartupProgram {
  name: string;
  command: string;
  enabled: boolean;
  source: "HKCU" | "HKLM";
}

export interface EmptySetReport {
  processed: number;
  failed: number;
}

export interface TempCleanupReport {
  files_deleted: number;
  dirs_deleted: number;
  bytes_freed: number;
  errors: number;
}
