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
    let mut warned_above = false;     // 경고 알림 상태 (히스테리시스)
    let mut last_icon_band: i8 = -1;  // 0=초록, 1=노랑, 2=빨강

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

        // ── 자동 정리: 설정 확인 ────────────────────────────────────────────
        let (enabled, threshold_pct, interval_secs, protected, excl_start, excl_end,
             warn_enabled, warn_threshold) = {
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
            )
        };

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
                // 5% 히스테리시스로 다시 경고 가능 상태 복귀
                warned_above = false;
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

        // 임계값 체크 (percent 이미 위에서 읽음)
        if percent < threshold_pct { continue; }

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

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

    let show = MenuItem::with_id(app, "show", "앱 열기", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "종료",   true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("Memory Cleaner")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => { if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.set_focus(); } }
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
