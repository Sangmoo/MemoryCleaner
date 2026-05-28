use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AutoCleanConfig {
    pub enabled: bool,
    pub threshold_percent: f64,
    pub interval_seconds: u64,
    /// 자동 정리 제외 시간대 시작 (0-23), None = 제외 없음
    #[serde(default)]
    pub exclude_start_hour: Option<u8>,
    /// 자동 정리 제외 시간대 종료 (0-23, exclusive)
    #[serde(default)]
    pub exclude_end_hour: Option<u8>,
}

impl Default for AutoCleanConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            threshold_percent: 85.0,
            interval_seconds: 60,
            exclude_start_hour: None,
            exclude_end_hour: None,
        }
    }
}

/// 설정 프리셋 (게임/업무/절전 모드 등)
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SettingsProfile {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub auto_clean_enabled: bool,
    pub auto_clean_threshold: f64,
    pub auto_clean_interval_seconds: u64,
    pub warn_threshold_percent: f64,
}

/// 자동 정리 스케줄
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CleanSchedule {
    pub id: String,
    /// HH:MM 형식 (예: "03:00")
    pub time: String,
    /// 요일 0=일, 1=월, ..., 6=토
    #[serde(default)]
    pub days: Vec<u8>,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool { true }

fn default_profiles() -> Vec<SettingsProfile> {
    vec![
        SettingsProfile {
            id: "game".into(), name: "게임 모드".into(), icon: "🎮".into(),
            auto_clean_enabled: true, auto_clean_threshold: 92.0,
            auto_clean_interval_seconds: 300, warn_threshold_percent: 95.0,
        },
        SettingsProfile {
            id: "work".into(), name: "업무 모드".into(), icon: "💼".into(),
            auto_clean_enabled: true, auto_clean_threshold: 80.0,
            auto_clean_interval_seconds: 60, warn_threshold_percent: 85.0,
        },
        SettingsProfile {
            id: "power_save".into(), name: "절전 모드".into(), icon: "🔋".into(),
            auto_clean_enabled: true, auto_clean_threshold: 70.0,
            auto_clean_interval_seconds: 30, warn_threshold_percent: 75.0,
        },
    ]
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppSettings {
    pub auto_clean: AutoCleanConfig,
    pub protected_processes: Vec<String>,
    pub theme: String,
    /// Windows 로그인 시 자동 시작 여부 (설정 캐시용, 실제 값은 레지스트리)
    #[serde(default)]
    pub autostart: bool,
    /// 프로세스 목록 자동 새로고침 간격 (초)
    #[serde(default = "default_process_refresh_secs")]
    pub process_refresh_seconds: u64,
    /// 메모리 경고 알림 활성화
    #[serde(default = "default_warn_enabled")]
    pub warn_notifications_enabled: bool,
    /// 메모리 경고 임계값 (%)
    #[serde(default = "default_warn_threshold")]
    pub warn_threshold_percent: f64,
    /// 설정 프리셋 목록
    #[serde(default = "default_profiles")]
    pub profiles: Vec<SettingsProfile>,
    /// 온보딩 투어 완료 여부
    #[serde(default)]
    pub onboarding_done: bool,
    /// CPU 급등 감지 활성화
    #[serde(default = "default_hot_detection")]
    pub hot_process_detection: bool,
    /// 자동 정리 스케줄 목록 (기능 5)
    #[serde(default)]
    pub schedules: Vec<CleanSchedule>,
    /// 이 프로세스가 실행 중이면 자동 정리 건너뜀 (기능 9)
    #[serde(default)]
    pub skip_if_running: Vec<String>,
    /// 표시 언어 (기능 10)
    #[serde(default = "default_language")]
    pub language: String,
}

fn default_process_refresh_secs() -> u64 { 10 }
fn default_warn_enabled() -> bool { true }
fn default_warn_threshold() -> f64 { 90.0 }
fn default_hot_detection() -> bool { true }
fn default_language() -> String { "ko".to_string() }

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            auto_clean: AutoCleanConfig::default(),
            protected_processes: Vec::new(),
            theme: "dark".to_string(),
            autostart: false,
            process_refresh_seconds: 10,
            warn_notifications_enabled: true,
            warn_threshold_percent: 90.0,
            profiles: default_profiles(),
            onboarding_done: false,
            hot_process_detection: true,
            schedules: Vec::new(),
            skip_if_running: Vec::new(),
            language: "ko".to_string(),
        }
    }
}

pub fn settings_path(data_dir: &PathBuf) -> PathBuf {
    data_dir.join("settings.json")
}

pub fn load_settings(data_dir: &PathBuf) -> AppSettings {
    let path = settings_path(data_dir);
    if let Ok(content) = fs::read_to_string(&path) {
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        AppSettings::default()
    }
}

pub fn save_settings(data_dir: &PathBuf, settings: &AppSettings) -> Result<(), String> {
    let path = settings_path(data_dir);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}
