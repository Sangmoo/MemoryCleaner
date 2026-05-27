use chrono::Local;
use serde::Serialize;
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use sysinfo::{Pid, ProcessesToUpdate, System};

use crate::history::{append_entries, load_history, HistoryEntry};
use crate::settings::{save_settings, AppSettings};
use crate::startup::{get_startup_programs, set_startup_enabled, StartupProgram};

// ── 공유 상태 ─────────────────────────────────────────────────────────────

pub struct AppState {
    pub system: Mutex<System>,
    pub settings: Mutex<AppSettings>,
    pub data_dir: PathBuf,
}

// ── DTOs ─────────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct MemorySnapshot {
    pub total: u64,
    pub used: u64,
    pub available: u64,
    pub percent: f64,
    pub total_gb: f64,
    pub used_gb: f64,
    pub available_gb: f64,
}

#[derive(Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub mem_mb: f64,
    pub mem_bytes: u64,
    pub cpu_percent: f32,
    pub is_system: bool,
    pub safe_kill: bool,
    pub is_protected: bool,
}

#[derive(Serialize)]
pub struct ProcessDetails {
    pub pid: u32,
    pub name: String,
    pub exe_path: String,
    pub cmd: Vec<String>,
    pub mem_mb: f64,
    pub cpu_percent: f32,
    pub status: String,
}

#[derive(Serialize)]
pub struct KillResult {
    pub pid: u32,
    pub name: String,
    pub mem_freed: u64,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Serialize)]
pub struct RecoveryReport {
    pub before_percent: f64,
    pub after_percent: f64,
    pub recovered_bytes: i64,
    pub recovered_gb: f64,
    pub recovery_pct: f64,
    pub results: Vec<KillResult>,
}

#[derive(Serialize)]
pub struct EmptySetReport {
    pub processed: usize,
    pub failed: usize,
}

#[derive(Serialize)]
pub struct TempCleanupReport {
    pub files_deleted: usize,
    pub dirs_deleted: usize,
    pub bytes_freed: u64,
    pub errors: usize,
}

// ── System 프로세스 판별 ────────────────────────────────────────────────

fn system_process_names() -> &'static HashSet<&'static str> {
    use std::sync::OnceLock;
    static NAMES: OnceLock<HashSet<&'static str>> = OnceLock::new();
    NAMES.get_or_init(|| {
        [
            "system", "system idle process", "registry", "smss.exe", "csrss.exe",
            "wininit.exe", "winlogon.exe", "lsass.exe", "lsaiso.exe", "services.exe",
            "svchost.exe", "dwm.exe", "fontdrvhost.exe", "dllhost.exe",
            "spoolsv.exe", "searchindexer.exe", "securityhealthservice.exe",
            "msdtc.exe", "wudfhost.exe", "taskhostw.exe", "ctfmon.exe",
            "sihost.exe", "audiodg.exe", "runtimebroker.exe",
            "memcompression", "vmmem", "vmwp.exe", "vmcompute.exe",
            "ntoskrnl.exe", "hal.dll",
            "systemd", "init", "kthreadd", "kworker",
        ]
        .into_iter()
        .collect()
    })
}

pub fn is_sys_name(name: &str) -> bool {
    system_process_names().contains(name.to_lowercase().as_str())
}

fn is_system_process(name: &str, pid: u32) -> bool {
    pid == 0 || pid == 4 || is_sys_name(name)
}

// ── 메모리 스냅샷 (내부 헬퍼) ────────────────────────────────────────────

pub fn memory_snapshot_from(sys: &System) -> Result<MemorySnapshot, String> {
    let total = sys.total_memory();
    let used = sys.used_memory();
    let available = sys.available_memory();
    let percent = if total > 0 { (used as f64 / total as f64) * 100.0 } else { 0.0 };
    let gb = 1_073_741_824_f64;
    Ok(MemorySnapshot {
        total, used, available, percent,
        total_gb:     total     as f64 / gb,
        used_gb:      used      as f64 / gb,
        available_gb: available as f64 / gb,
    })
}

// ── 메모리 명령 ────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_memory(state: tauri::State<AppState>) -> Result<MemorySnapshot, String> {
    let mut sys = state.system.lock().map_err(|e| e.to_string())?;
    sys.refresh_memory();
    memory_snapshot_from(&sys)
}

// ── 프로세스 목록 ─────────────────────────────────────────────────────────

#[tauri::command(rename_all = "snake_case")]
pub fn get_processes(
    threshold_mb: u64,
    state: tauri::State<AppState>,
) -> Result<Vec<ProcessInfo>, String> {
    let protected = {
        let s = state.settings.lock().map_err(|e| e.to_string())?;
        s.protected_processes.clone()
    };
    let threshold_bytes = threshold_mb * 1024 * 1024;

    let mut sys = state.system.lock().map_err(|e| e.to_string())?;
    sys.refresh_processes(ProcessesToUpdate::All, true);

    let mut list: Vec<ProcessInfo> = sys
        .processes()
        .iter()
        .map(|(pid, p)| {
            let name = p.name().to_string_lossy().to_string();
            let pid_u32 = pid.as_u32();
            let mem = p.memory();
            let is_sys = is_system_process(&name, pid_u32);
            let is_protected = protected.contains(&name.to_lowercase());
            let safe_kill = !is_sys && !is_protected && mem >= threshold_bytes;
            ProcessInfo {
                pid: pid_u32, name,
                mem_mb: mem as f64 / 1_048_576.0,
                mem_bytes: mem,
                cpu_percent: p.cpu_usage(),
                is_system: is_sys,
                safe_kill,
                is_protected,
            }
        })
        .collect();

    list.sort_by(|a, b| b.mem_bytes.cmp(&a.mem_bytes));
    list.truncate(300);
    Ok(list)
}

// ── 프로세스 상세 정보 ────────────────────────────────────────────────────

#[tauri::command]
pub fn get_process_details(
    pid: u32,
    state: tauri::State<AppState>,
) -> Result<ProcessDetails, String> {
    let mut sys = state.system.lock().map_err(|e| e.to_string())?;
    sys.refresh_processes(ProcessesToUpdate::Some(&[Pid::from_u32(pid)]), false);

    match sys.process(Pid::from_u32(pid)) {
        Some(p) => Ok(ProcessDetails {
            pid,
            name: p.name().to_string_lossy().to_string(),
            exe_path: p.exe()
                .map(|e| e.to_string_lossy().to_string())
                .unwrap_or_default(),
            cmd: p.cmd()
                .iter()
                .map(|s| s.to_string_lossy().to_string())
                .collect(),
            mem_mb: p.memory() as f64 / 1_048_576.0,
            cpu_percent: p.cpu_usage(),
            status: format!("{:?}", p.status()),
        }),
        None => Err("프로세스를 찾을 수 없습니다.".into()),
    }
}

// ── 프로세스 종료 (공유 로직) ─────────────────────────────────────────────

pub fn do_kill(
    state: &AppState,
    pids: Vec<u32>,
    trigger: &str,
) -> Result<RecoveryReport, String> {
    let before = {
        let mut sys = state.system.lock().map_err(|e| e.to_string())?;
        sys.refresh_memory();
        memory_snapshot_from(&sys)?
    };

    let mut results: Vec<KillResult> = Vec::new();
    let mut history_entries: Vec<HistoryEntry> = Vec::new();
    let ts = Local::now().to_rfc3339();

    {
        let mut sys = state.system.lock().map_err(|e| e.to_string())?;
        sys.refresh_processes(ProcessesToUpdate::All, true);
        for pid_raw in &pids {
            let pid = Pid::from_u32(*pid_raw);
            match sys.process(pid) {
                Some(p) => {
                    let name = p.name().to_string_lossy().to_string();
                    let mem  = p.memory();
                    let (ok, err) = if p.kill() { (true, None) } else { (false, Some("권한 부족".into())) };
                    results.push(KillResult { pid: *pid_raw, name: name.clone(), mem_freed: if ok { mem } else { 0 }, success: ok, error: err.clone() });
                    history_entries.push(HistoryEntry {
                        timestamp: ts.clone(), process_name: name,
                        pid: *pid_raw, mem_freed_mb: if ok { mem as f64 / 1_048_576.0 } else { 0.0 },
                        success: ok, error: err, trigger: trigger.to_string(),
                    });
                }
                None => results.push(KillResult { pid: *pid_raw, name: "?".into(), mem_freed: 0, success: false, error: Some("프로세스 없음".into()) }),
            }
        }
    }

    std::thread::sleep(Duration::from_millis(500));

    let after = {
        let mut sys = state.system.lock().map_err(|e| e.to_string())?;
        sys.refresh_memory();
        memory_snapshot_from(&sys)?
    };

    let _ = append_entries(&state.data_dir, history_entries);

    let recovered = after.available as i64 - before.available as i64;
    let recovered_gb = recovered as f64 / 1_073_741_824.0;
    let recovery_pct = if before.total > 0 { (recovered as f64 / before.total as f64) * 100.0 } else { 0.0 };

    Ok(RecoveryReport {
        before_percent: before.percent,
        after_percent: after.percent,
        recovered_bytes: recovered,
        recovered_gb,
        recovery_pct,
        results,
    })
}

#[tauri::command]
pub fn kill_processes(pids: Vec<u32>, state: tauri::State<AppState>) -> Result<RecoveryReport, String> {
    do_kill(&*state, pids, "manual")
}

// ── EmptyWorkingSet ───────────────────────────────────────────────────────

#[tauri::command]
pub fn empty_working_set(pids: Vec<u32>) -> Result<EmptySetReport, String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::CloseHandle;
        use windows::Win32::System::ProcessStatus::EmptyWorkingSet;
        use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_SET_QUOTA};
        let access = PROCESS_QUERY_INFORMATION | PROCESS_SET_QUOTA;
        let (mut processed, mut failed) = (0usize, 0usize);
        for pid in &pids {
            unsafe {
                match OpenProcess(access, false, *pid) {
                    Ok(h) => { if EmptyWorkingSet(h).is_ok() { processed += 1; } else { failed += 1; } let _ = CloseHandle(h); }
                    Err(_) => { failed += 1; }
                }
            }
        }
        Ok(EmptySetReport { processed, failed })
    }
    #[cfg(not(target_os = "windows"))]
    Err("Windows 전용 기능입니다.".into())
}

// ── 임시 파일 정리 ────────────────────────────────────────────────────────

fn clean_dir(dir: &std::path::Path, report: &mut TempCleanupReport) {
    let Ok(entries) = std::fs::read_dir(dir) else { report.errors += 1; return; };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            let size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
            match std::fs::remove_file(&path) {
                Ok(_) => { report.files_deleted += 1; report.bytes_freed += size; }
                Err(_) => { report.errors += 1; }
            }
        } else if path.is_dir() {
            clean_dir(&path, report);
            if std::fs::remove_dir(&path).is_ok() { report.dirs_deleted += 1; }
        }
    }
}

#[tauri::command]
pub fn cleanup_temp_files() -> Result<TempCleanupReport, String> {
    let mut report = TempCleanupReport { files_deleted: 0, dirs_deleted: 0, bytes_freed: 0, errors: 0 };
    let mut dirs: Vec<std::path::PathBuf> = Vec::new();

    if let Ok(t) = std::env::var("TEMP") { dirs.push(t.into()); }
    if let Ok(t) = std::env::var("TMP")  {
        let p: std::path::PathBuf = t.into();
        if !dirs.contains(&p) { dirs.push(p); }
    }
    #[cfg(target_os = "windows")]
    {
        let win = std::path::PathBuf::from(r"C:\Windows\Temp");
        if win.exists() { dirs.push(win); }
    }

    for d in &dirs { if d.exists() { clean_dir(d, &mut report); } }
    Ok(report)
}

// ── 설정 ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_settings(state: tauri::State<AppState>) -> Result<AppSettings, String> {
    Ok(state.settings.lock().map_err(|e| e.to_string())?.clone())
}

#[tauri::command]
pub fn save_settings_cmd(
    settings: AppSettings,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    save_settings(&state.data_dir, &settings)?;
    *state.settings.lock().map_err(|e| e.to_string())? = settings;
    Ok(())
}

// ── 앱 자동 시작 ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_app_autostart() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::{HKEY_CURRENT_USER, KEY_READ};
        use winreg::RegKey;
        let key = RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey_with_flags(r"Software\Microsoft\Windows\CurrentVersion\Run", KEY_READ)
            .map_err(|e| e.to_string())?;
        Ok(key.get_value::<String, _>("MemoryCleaner").is_ok())
    }
    #[cfg(not(target_os = "windows"))]
    Ok(false)
}

#[tauri::command]
pub fn set_app_autostart(enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::HKEY_CURRENT_USER;
        use winreg::RegKey;
        let (key, _) = RegKey::predef(HKEY_CURRENT_USER)
            .create_subkey(r"Software\Microsoft\Windows\CurrentVersion\Run")
            .map_err(|e| e.to_string())?;
        if enabled {
            let exe = std::env::current_exe()
                .map_err(|e| e.to_string())?
                .to_string_lossy()
                .to_string();
            key.set_value("MemoryCleaner", &exe).map_err(|e| e.to_string())?;
        } else {
            let _ = key.delete_value("MemoryCleaner");
        }
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    Err("Windows 전용 기능입니다.".into())
}

// ── 히스토리 ──────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_history(state: tauri::State<AppState>) -> Result<Vec<HistoryEntry>, String> {
    Ok(load_history(&state.data_dir))
}

#[tauri::command]
pub fn clear_history(state: tauri::State<AppState>) -> Result<(), String> {
    crate::history::save_history(&state.data_dir, &[])
}

// ── 시작 프로그램 ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_startup_programs_cmd() -> Result<Vec<StartupProgram>, String> {
    Ok(get_startup_programs())
}

#[tauri::command]
pub fn toggle_startup(name: String, source: String, enabled: bool) -> Result<(), String> {
    set_startup_enabled(&name, &source, enabled)
}
