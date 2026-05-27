use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HistoryEntry {
    pub timestamp: String,
    pub process_name: String,
    pub pid: u32,
    pub mem_freed_mb: f64,
    pub success: bool,
    pub error: Option<String>,
    pub trigger: String, // "manual" | "auto"
}

const MAX_HISTORY: usize = 500;

pub fn history_path(data_dir: &PathBuf) -> PathBuf {
    data_dir.join("history.json")
}

pub fn load_history(data_dir: &PathBuf) -> Vec<HistoryEntry> {
    let path = history_path(data_dir);
    if let Ok(content) = fs::read_to_string(&path) {
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    }
}

pub fn save_history(data_dir: &PathBuf, history: &[HistoryEntry]) -> Result<(), String> {
    let path = history_path(data_dir);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(history).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

pub fn append_entries(data_dir: &PathBuf, new_entries: Vec<HistoryEntry>) -> Result<(), String> {
    let mut history = load_history(data_dir);
    history.extend(new_entries);
    if history.len() > MAX_HISTORY {
        let drain = history.len() - MAX_HISTORY;
        history.drain(0..drain);
    }
    save_history(data_dir, &history)
}
