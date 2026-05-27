use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StartupProgram {
    pub name: String,
    pub command: String,
    pub enabled: bool,
    pub source: String, // "HKCU" | "HKLM"
}

// ── Windows 구현 ──────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
pub fn get_startup_programs() -> Vec<StartupProgram> {
    use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ};
    use winreg::RegKey;

    let run_paths: &[(_, &str, &str)] = &[
        (HKEY_CURRENT_USER,  r"Software\Microsoft\Windows\CurrentVersion\Run", "HKCU"),
        (HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", "HKLM"),
    ];
    let approved_paths: &[(_, &str, &str)] = &[
        (HKEY_CURRENT_USER,  r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run", "HKCU"),
        (HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run", "HKLM"),
    ];

    let mut programs: Vec<StartupProgram> = Vec::new();

    // 1) Run 키에서 이름 + 커맨드 읽기
    for (hive, path, source) in run_paths {
        let hive_key = RegKey::predef(*hive);
        let Ok(key) = hive_key.open_subkey_with_flags(path, KEY_READ) else { continue };
        let names: Vec<String> = key
            .enum_values()
            .filter_map(|r| r.ok())
            .map(|(n, _)| n)
            .collect();
        for name in names {
            let command: String = key.get_value(&name).unwrap_or_default();
            programs.push(StartupProgram {
                name: name.clone(),
                command,
                enabled: true,
                source: source.to_string(),
            });
        }
    }

    // 2) StartupApproved 키로 비활성 여부 반영
    for (hive, path, source) in approved_paths {
        let hive_key = RegKey::predef(*hive);
        let Ok(key) = hive_key.open_subkey_with_flags(path, KEY_READ) else { continue };
        for (name, value) in key.enum_values().filter_map(|r| r.ok()) {
            let disabled = value.bytes.first().map(|&b| b == 0x03).unwrap_or(false);
            if disabled {
                for prog in programs.iter_mut() {
                    if prog.name == name && prog.source == *source {
                        prog.enabled = false;
                    }
                }
            }
        }
    }

    programs
}

#[cfg(target_os = "windows")]
pub fn set_startup_enabled(name: &str, source: &str, enabled: bool) -> Result<(), String> {
    use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, REG_BINARY};
    use winreg::RegKey;
    use winreg::RegValue;

    let (hive, approved_path) = match source {
        "HKCU" => (HKEY_CURRENT_USER,  r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run"),
        "HKLM" => (HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run"),
        _ => return Err("알 수 없는 소스".into()),
    };

    let hive_key = RegKey::predef(hive);
    // StartupApproved 키가 없으면 생성
    let (key, _) = hive_key
        .create_subkey(approved_path)
        .map_err(|e| e.to_string())?;

    // 0x02… = 활성, 0x03… = 비활성 (12바이트)
    let flag: u8 = if enabled { 0x02 } else { 0x03 };
    let mut bytes = vec![0u8; 12];
    bytes[0] = flag;

    key.set_raw_value(name, &RegValue { bytes, vtype: REG_BINARY })
        .map_err(|e| e.to_string())
}

// ── 비-Windows 스텁 ──────────────────────────────────────────────────────

#[cfg(not(target_os = "windows"))]
pub fn get_startup_programs() -> Vec<StartupProgram> { Vec::new() }

#[cfg(not(target_os = "windows"))]
pub fn set_startup_enabled(_name: &str, _source: &str, _enabled: bool) -> Result<(), String> {
    Err("Windows 전용 기능입니다.".into())
}
