import psutil
from core.analyzer import classify_processes


MAX_DISPLAY = 200


def get_process_list(threshold_mb: int = 50) -> list[dict]:
    procs = []
    for proc in psutil.process_iter(["pid", "name", "memory_info"]):
        try:
            info = proc.info
            mem = info["memory_info"]
            if mem is None:
                continue
            procs.append({
                "pid": info["pid"],
                "name": info["name"] or "Unknown",
                "mem_bytes": mem.rss,
                "mem_mb": mem.rss / (1024 ** 2),
                "status": "running",
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    procs.sort(key=lambda x: x["mem_bytes"], reverse=True)
    procs = procs[:MAX_DISPLAY]
    return classify_processes(procs, threshold_mb)


def kill_processes(pid_list: list[int]) -> list[dict]:
    results = []
    for pid in pid_list:
        try:
            proc = psutil.Process(pid)
            name = proc.name()
            mem_before = proc.memory_info().rss
            proc.kill()
            proc.wait(timeout=3)
            results.append({
                "pid": pid,
                "name": name,
                "mem_freed": mem_before,
                "success": True,
                "error": None,
            })
        except psutil.NoSuchProcess:
            results.append({"pid": pid, "name": "?", "mem_freed": 0, "success": False, "error": "Already gone"})
        except psutil.AccessDenied:
            results.append({"pid": pid, "name": "?", "mem_freed": 0, "success": False, "error": "Access denied"})
        except Exception as e:
            results.append({"pid": pid, "name": "?", "mem_freed": 0, "success": False, "error": str(e)})
    return results
