SYSTEM_PROCESS_NAMES = {
    "system", "system idle process", "registry", "smss.exe", "csrss.exe",
    "wininit.exe", "winlogon.exe", "lsass.exe", "lsaiso.exe", "services.exe",
    "svchost.exe", "dwm.exe", "fontdrvhost.exe", "dllhost.exe",
    "spoolsv.exe", "searchindexer.exe", "securityhealthservice.exe",
    "msdtc.exe", "wudfhost.exe", "taskhostw.exe", "ctfmon.exe",
    "sihost.exe", "audiodg.exe", "runtimebroker.exe",
    # Windows memory/VM internals
    "memcompression", "vmmem", "vmwp.exe", "vmcompute.exe",
    "ntoskrnl.exe", "hal.dll",
}

PROTECTED_NAMES = {
    "python.exe", "pythonw.exe",
}


def is_system_process(name: str, pid: int) -> bool:
    if pid in (0, 4):
        return True
    return name.lower() in SYSTEM_PROCESS_NAMES


def is_safe_to_kill(name: str, pid: int, mem_bytes: int, threshold_mb: int) -> bool:
    if is_system_process(name, pid):
        return False
    if name.lower() in PROTECTED_NAMES:
        return False
    return mem_bytes >= threshold_mb * 1024 * 1024


def classify_processes(proc_list: list[dict], threshold_mb: int) -> list[dict]:
    for p in proc_list:
        p["is_system"] = is_system_process(p["name"], p["pid"])
        p["safe_kill"] = is_safe_to_kill(p["name"], p["pid"], p["mem_bytes"], threshold_mb)
    return proc_list
