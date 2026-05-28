mod commands;
mod history;
mod settings;
mod startup;

use commands::AppState;
use settings::load_settings;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use sysinfo::{ProcessesToUpdate, System};
use tauri::{AppHandle, Emitter, Manager};

// ── 자동 정리 백그라운드 루프 ───────────────────────────────────────────────

// ── 트레이 아이콘 동적 생성 (RAM 사용률에 따라 색상 변경) ──────────────────

fn make_status_icon(percent: f64) -> Vec<u8> {
    let (r, g, b) = if percent < 60.0 {
        (74u8, 222, 128)   // 초록
    } else if percent < 80.0 {
        (250, 204, 21)     // 노랑
    } else {
        (239, 68, 68)      // 빨강
    };

    let size: usize = 32;
    let mut rgba = vec![0u8; size * size * 4];

    let cx = size as f32 / 2.0 - 0.5;
    let cy = size as f32 / 2.0 - 0.5;
    let outer_r = (size as f32 / 2.0) - 1.0;
    let inner_r = outer_r - 6.0;

    for y in 0..size {
        for x in 0..size {
            let dx = x as f32 - cx;
            let dy = y as f32 - cy;
            let dist = (dx * dx + dy * dy).sqrt();
            let i = (y * size + x) * 4;

            if dist <= outer_r && dist >= inner_r {
                // 도넛 링
                rgba[i]     = r;
                rgba[i + 1] = g;
                rgba[i + 2] = b;
                rgba[i + 3] = 255;
            } else if dist < inner_r {
                // 안쪽 채움 (어두운 색)
                rgba[i]     = 30;
                rgba[i + 1] = 30;
                rgba[i + 2] = 40;
                rgba[i + 3] = 230;
            }
            // 바깥은 투명 (0,0,0,0)
        }
    }

    rgba
}

async fn auto_clean_loop(app: AppHandle) {
    let mut ticker = tokio::time::interval(Duration::from_secs(5));
    let mut last_clean = Instant::now();
    let mut warned_above = false;         // 경고 알림 상태 (히스테리시스)
    let mut last_icon_band: i8 = -1;      // 0=초록, 1=노랑, 2=빨강
    // 핫 프로세스 감지 상태 (PID → 경고 발령됨)
    let mut hot_warned: std::collections::HashMap<u32, bool> = std::collections::HashMap::new();
    // 스케줄러: 마지막으로 실행된 시:분 (중복 실행 방지)
    let mut last_schedule_run: Option<String> = None;

    loop {
        ticker.tick().await;

        let state: tauri::State<AppState> = app.state::<AppState>();

        // ── 항상: 메모리 읽고 트레이 툴팁/아이콘 실시간 갱신 ───────────────
        let percent = {
            let Ok(mut sys) = state.system.lock() else { continue };
            sys.refresh_memory();
            let t = sys.total_memory();
            let u = sys.used_memory();
            if t > 0 { (u as f64 / t as f64) * 100.0 } else { 0.0 }
        };

        let band: i8 = if percent < 60.0 { 0 } else if percent < 80.0 { 1 } else { 2 };

        if let Some(tray) = app.tray_by_id("main") {
            let tooltip = format!("Memory Cleaner  ·  RAM {:.0}%", percent);
            let _ = tray.set_tooltip(Some(&tooltip));

            // 색상 밴드가 바뀐 경우에만 아이콘 교체 (CPU 절약)
            if band != last_icon_band {
                let rgba = make_status_icon(percent);
                let img = tauri::image::Image::new(&rgba, 32, 32);
                let _ = tray.set_icon(Some(img));
                last_icon_band = band;
            }
        }

        // ── 자동 정리 + 경고: 설정 확인 ────────────────────────────────────
        let (enabled, threshold_pct, interval_secs, protected, excl_start, excl_end,
             warn_enabled, warn_threshold, hot_detection, schedules, skip_if_running,
             process_rules) = {
            let Ok(s) = state.settings.lock() else { continue };
            (
                s.auto_clean.enabled,
                s.auto_clean.threshold_percent,
                s.auto_clean.interval_seconds,
                s.protected_processes.clone(),
                s.auto_clean.exclude_start_hour,
                s.auto_clean.exclude_end_hour,
                s.warn_notifications_enabled,
                s.warn_threshold_percent,
                s.hot_process_detection,
                s.schedules.clone(),
                s.skip_if_running.iter().map(|s| s.to_lowercase()).collect::<Vec<_>>(),
                s.process_rules.clone(),
            )
        };

        // ── 프로세스 규칙 체크 (기능 #4) ───────────────────────────────────
        if !process_rules.is_empty() {
            // 규칙에 매칭되는 PID 수집
            let matches: Vec<(u32, String, String, u64)> = {
                match state.system.lock() {
                    Ok(mut sys) => {
                        sys.refresh_processes(ProcessesToUpdate::All, true);
                        let mut found: Vec<(u32, String, String, u64)> = Vec::new();
                        for (pid, p) in sys.processes() {
                            let name = p.name().to_string_lossy().to_string();
                            let lname = name.to_lowercase();
                            let pid_u32 = pid.as_u32();
                            if commands::is_sys_name(&name) { continue; }
                            let mem_mb = p.memory() / 1_048_576;
                            for rule in &process_rules {
                                if rule.process_name.to_lowercase() == lname && mem_mb >= rule.threshold_mb {
                                    found.push((pid_u32, name.clone(), rule.action.clone(), mem_mb));
                                    break;
                                }
                            }
                        }
                        found
                    }
                    Err(_) => Vec::new(),
                }
            };

            for (pid, name, action, mem_mb) in matches {
                if action == "kill" {
                    if let Ok(_) = commands::do_kill(&*state, vec![pid], "rule") {
                        let _ = app.emit("rule-triggered", serde_json::json!({
                            "pid": pid, "name": name, "action": "kill", "mem_mb": mem_mb
                        }));
                    }
                } else if action == "compress" {
                    let _ = commands::empty_working_set(vec![pid]);
                    let _ = app.emit("rule-triggered", serde_json::json!({
                        "pid": pid, "name": name, "action": "compress", "mem_mb": mem_mb
                    }));
                }
            }
        }

        // ── 메모리 경고 알림 (자동정리와 독립) ──────────────────────────────
        if warn_enabled {
            if percent >= warn_threshold {
                if !warned_above {
                    use tauri_plugin_notification::NotificationExt;
                    let _ = app.notification().builder()
                        .title("Memory Cleaner — ⚠️ 메모리 경고")
                        .body(&format!("RAM 사용률 {:.1}% — 정리를 권장합니다.", percent))
                        .show();
                    let _ = app.emit("memory-warning", percent);
                    warned_above = true;
                }
            } else if percent < warn_threshold - 5.0 {
                warned_above = false;
            }
        }

        // ── 핫 프로세스 감지 (CPU 급등) ─────────────────────────────────────
        if hot_detection {
            let spikes: Vec<(u32, String, f32)> = {
                let Ok(mut sys) = state.system.lock() else { continue };
                sys.refresh_processes(ProcessesToUpdate::All, false);
                let mut found = vec![];
                for (pid, p) in sys.processes() {
                    let cpu  = p.cpu_usage();
                    let name = p.name().to_string_lossy().to_string();
                    let pid_u32 = pid.as_u32();
                    if commands::is_sys_name(&name) { continue; }
                    let was_hot = hot_warned.get(&pid_u32).copied().unwrap_or(false);
                    if cpu > 70.0 && !was_hot {
                        hot_warned.insert(pid_u32, true);
                        found.push((pid_u32, name, cpu));
                    } else if cpu < 25.0 && was_hot {
                        hot_warned.remove(&pid_u32);
                    }
                }
                found
            };
            for (pid, name, cpu) in spikes {
                let _ = app.emit("hot-process", serde_json::json!({
                    "pid": pid, "name": name, "cpu": cpu
                }));
            }
        }

        // ── 스케줄러: 매 tick 현재 시:분 확인하여 일치 스케줄 실행 (기능 5) ──
        {
            use chrono::{Datelike, Timelike};
            let now = chrono::Local::now();
            let current_hm = format!("{:02}:{:02}", now.hour(), now.minute());
            let current_weekday = now.weekday().num_days_from_sunday() as u8; // 0=일, 6=토

            // 이미 이 분에 실행했으면 스킵
            let already_ran = last_schedule_run.as_deref() == Some(&current_hm);
            if !already_ran {
                let should_run = schedules.iter().any(|s| {
                    s.enabled
                        && s.time == current_hm
                        && (s.days.is_empty() || s.days.contains(&current_weekday))
                });

                if should_run {
                    last_schedule_run = Some(current_hm.clone());
                    // skip_if_running 체크 + PID 수집을 한 번의 락으로
                    let (should_skip, sched_pids) = {
                        match state.system.lock() {
                            Ok(mut sys) => {
                                sys.refresh_processes(ProcessesToUpdate::All, true);
                                let skip = sys.processes().values().any(|p| {
                                    let name = p.name().to_string_lossy().to_lowercase();
                                    skip_if_running.contains(&name)
                                });
                                let pids = if skip {
                                    vec![]
                                } else {
                                    sys.processes()
                                        .iter()
                                        .filter_map(|(pid, p)| {
                                            let name = p.name().to_string_lossy().to_string();
                                            let pid_u32 = pid.as_u32();
                                            if pid_u32 == 0 || pid_u32 == 4 || commands::is_sys_name(&name) { return None; }
                                            if protected.contains(&name.to_lowercase()) { return None; }
                                            Some(pid_u32)
                                        })
                                        .collect()
                                };
                                (skip, pids)
                            }
                            Err(_) => (false, vec![]),
                        }
                    };

                    if !should_skip && !sched_pids.is_empty() {
                        if let Ok(report) = commands::do_kill(&*state, sched_pids, "schedule") {
                            let killed = report.results.iter().filter(|r| r.success).count();
                            if killed > 0 {
                                let _ = app.emit("auto-clean-done", killed);
                                use tauri_plugin_notification::NotificationExt;
                                let body = format!(
                                    "[스케줄] {}개 프로세스 종료, {:.1}% → {:.1}%",
                                    killed, report.before_percent, report.after_percent
                                );
                                let _ = app.notification().builder()
                                    .title("Memory Cleaner — 스케줄 정리 완료")
                                    .body(&body)
                                    .show();
                            }
                        }
                    }
                }
            }

            // 분이 바뀌면 last_schedule_run 초기화 (다음 분에 다시 실행 가능하도록)
            if let Some(ref ran) = last_schedule_run {
                if ran != &current_hm {
                    last_schedule_run = None;
                }
            }
        }

        if !enabled { continue; }
        if last_clean.elapsed() < Duration::from_secs(interval_secs) { continue; }

        // 제외 시간대 확인
        if let (Some(start), Some(end)) = (excl_start, excl_end) {
            use chrono::Timelike;
            let hour = chrono::Local::now().hour() as u8;
            let excluded = if start <= end {
                hour >= start && hour < end
            } else {
                hour >= start || hour < end
            };
            if excluded { continue; }
        }

        // 임계값 체크
        if percent < threshold_pct { continue; }

        // ── skip_if_running 체크 (기능 9) ──────────────────────────────────
        if !skip_if_running.is_empty() {
            let should_skip = match state.system.lock() {
                Ok(mut sys) => {
                    sys.refresh_processes(ProcessesToUpdate::All, false);
                    sys.processes().values().any(|p| {
                        let name = p.name().to_string_lossy().to_lowercase();
                        skip_if_running.contains(&name)
                    })
                }
                Err(_) => false,
            };
            if should_skip { continue; }
        }

        // PID 수집
        let pids: Vec<u32> = {
            let Ok(mut sys) = state.system.lock() else { continue };
            sys.refresh_processes(ProcessesToUpdate::All, true);
            sys.processes()
                .iter()
                .filter_map(|(pid, p)| {
                    let name = p.name().to_string_lossy().to_string();
                    let pid_u32 = pid.as_u32();
                    if pid_u32 == 0 || pid_u32 == 4 || commands::is_sys_name(&name) { return None; }
                    if protected.contains(&name.to_lowercase()) { return None; }
                    Some(pid_u32)
                })
                .collect()
        };
        if pids.is_empty() { continue; }

        last_clean = Instant::now();
        if let Ok(report) = commands::do_kill(&*state, pids, "auto") {
            let killed = report.results.iter().filter(|r| r.success).count();
            if killed > 0 {
                let _ = app.emit("auto-clean-done", killed);
                use tauri_plugin_notification::NotificationExt;
                let body = format!(
                    "{}개 프로세스 종료, {:.1}% → {:.1}%",
                    killed, report.before_percent, report.after_percent
                );
                let _ = app.notification().builder()
                    .title("Memory Cleaner — 자동 정리 완료")
                    .body(&body)
                    .show();
            }
        }
    }
}

// ── 트레이 구성 ──────────────────────────────────────────────────────────
// 기능 4: [앱 열기 / Quick Clean / 전체 RAM 플러시 / --- / 종료]

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
    use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

    let show        = MenuItem::with_id(app, "show",       "앱 열기",         true, None::<&str>)?;
    let quick_clean = MenuItem::with_id(app, "quick_clean","Quick Clean",     true, None::<&str>)?;
    let flush_ram   = MenuItem::with_id(app, "flush_ram",  "전체 RAM 플러시", true, None::<&str>)?;
    let sep         = PredefinedMenuItem::separator(app)?;
    let quit        = MenuItem::with_id(app, "quit",       "종료",            true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quick_clean, &flush_ram, &sep, &quit])?;

    TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("Memory Cleaner")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "quick_clean" => {
                // 트레이 Quick Clean → 프론트엔드로 이벤트 전달
                let _ = app.emit("tray-quick-clean", ());
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "flush_ram" => {
                // 트레이 전체 RAM 플러시 → 프론트엔드로 이벤트 전달
                let _ = app.emit("tray-flush-ram", ());
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    if w.is_visible().unwrap_or(false) { let _ = w.hide(); }
                    else { let _ = w.show(); let _ = w.set_focus(); }
                }
            }
        })
        .build(app)?;

    Ok(())
}

// ── 앱 진입점 ─────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 이미 실행 중일 때 중복 실행 → 창을 앞으로 가져옴
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
                let _ = w.unminimize();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_local_data_dir()
                .unwrap_or_else(|_| std::env::temp_dir().join("mem-tool"));

            let settings = load_settings(&data_dir);
            let mut sys = System::new_all();
            sys.refresh_all();

            app.manage(AppState {
                system: Mutex::new(sys),
                settings: Mutex::new(settings),
                data_dir,
            });

            let window = app.get_webview_window("main").unwrap();
            let win_close = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = win_close.hide();
                }
            });

            setup_tray(app)?;

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(auto_clean_loop(handle));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_memory,
            commands::get_processes,
            commands::get_process_details,
            commands::kill_processes,
            commands::empty_working_set,
            commands::cleanup_temp_files,
            commands::cleanup_disk,
            commands::get_settings,
            commands::save_settings_cmd,
            commands::get_app_autostart,
            commands::set_app_autostart,
            commands::get_history,
            commands::clear_history,
            commands::get_startup_programs_cmd,
            commands::toggle_startup,
            // v0.3.0 신규
            commands::get_system_info,
            commands::get_system_stats,
            commands::set_process_priority,
            commands::export_history_csv,
            // v1.0 신규
            commands::flush_all_working_sets,
            // v1.2 신규
            commands::save_ram_history,
            commands::load_ram_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
