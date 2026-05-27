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

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppSettings {
    pub auto_clean: AutoCleanConfig,
    pub protected_processes: Vec<String>,
    pub theme: String,
    /// Windows 로그인 시 자동 시작 여부 (설정 캐시용, 실제 값은 레지스트리)
    #[serde(default)]
    pub autostart: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            auto_clean: AutoCleanConfig::default(),
            protected_processes: Vec::new(),
            theme: "dark".to_string(),
            autostart: false,
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
