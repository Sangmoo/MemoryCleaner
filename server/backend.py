"""
FastAPI backend for the Docker / web deployment variant.
Serves the built React frontend (/) and exposes /api/* endpoints.

NOTE: When run inside Docker, processes are scoped to the container's PID
namespace (unless --pid=host is passed). For full host control, run as
a native binary or use --pid=host --privileged on Linux hosts.
"""
import os
import time
import psutil
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

SYSTEM_NAMES = {
    "system", "system idle process", "registry", "smss.exe", "csrss.exe",
    "wininit.exe", "winlogon.exe", "lsass.exe", "lsaiso.exe", "services.exe",
    "svchost.exe", "dwm.exe", "fontdrvhost.exe", "dllhost.exe",
    "spoolsv.exe", "searchindexer.exe", "taskhostw.exe", "ctfmon.exe",
    "sihost.exe", "audiodg.exe", "runtimebroker.exe",
    "memcompression", "vmmem", "vmwp.exe", "vmcompute.exe",
    "ntoskrnl.exe", "hal.dll",
    "systemd", "init", "kthreadd", "kworker", "ksoftirqd",
}


def is_system_process(name: str, pid: int) -> bool:
    if pid in (0, 1, 4):
        return True
    return name.lower() in SYSTEM_NAMES


class KillRequest(BaseModel):
    pids: list[int]


@asynccontextmanager
async def lifespan(_: FastAPI):
    print(f"Memory Cleaner backend started, host RAM = "
          f"{psutil.virtual_memory().total / (1024**3):.1f} GB")
    yield


app = FastAPI(title="Memory Cleaner API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"],
    allow_methods=["*"], allow_headers=["*"],
)


# ── API ────────────────────────────────────────────────────────────────

@app.get("/api/memory")
def get_memory():
    vm = psutil.virtual_memory()
    gb = 1024 ** 3
    return {
        "total": vm.total,
        "used": vm.used,
        "available": vm.available,
        "percent": vm.percent,
        "total_gb": vm.total / gb,
        "used_gb": vm.used / gb,
        "available_gb": vm.available / gb,
    }


@app.get("/api/processes")
def get_processes(threshold_mb: int = 500):
    threshold_bytes = threshold_mb * 1024 * 1024
    out = []
    for proc in psutil.process_iter(["pid", "name", "memory_info"]):
        try:
            info = proc.info
            mem = info["memory_info"]
            if mem is None:
                continue
            name = info["name"] or "Unknown"
            pid = info["pid"]
            is_sys = is_system_process(name, pid)
            out.append({
                "pid": pid,
                "name": name,
                "mem_bytes": mem.rss,
                "mem_mb": mem.rss / (1024 ** 2),
                "is_system": is_sys,
                "safe_kill": (not is_sys) and mem.rss >= threshold_bytes,
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
    out.sort(key=lambda x: x["mem_bytes"], reverse=True)
    return out[:300]


@app.post("/api/kill")
def kill_processes(req: KillRequest):
    vm_before = psutil.virtual_memory()
    results = []
    for pid in req.pids:
        try:
            p = psutil.Process(pid)
            name = p.name()
            mem_before = p.memory_info().rss
            p.kill()
            p.wait(timeout=3)
            results.append({
                "pid": pid, "name": name, "mem_freed": mem_before,
                "success": True, "error": None,
            })
        except psutil.NoSuchProcess:
            results.append({"pid": pid, "name": "?", "mem_freed": 0,
                            "success": False, "error": "프로세스 없음"})
        except psutil.AccessDenied:
            results.append({"pid": pid, "name": "?", "mem_freed": 0,
                            "success": False, "error": "권한 거부"})
        except Exception as e:
            results.append({"pid": pid, "name": "?", "mem_freed": 0,
                            "success": False, "error": str(e)})

    time.sleep(0.5)
    vm_after = psutil.virtual_memory()
    recovered = vm_after.available - vm_before.available
    return {
        "before_percent": vm_before.percent,
        "after_percent": vm_after.percent,
        "recovered_bytes": recovered,
        "recovered_gb": recovered / (1024 ** 3),
        "recovery_pct": (recovered / vm_before.total) * 100 if vm_before.total > 0 else 0,
        "results": results,
    }


# ── Static frontend ───────────────────────────────────────────────────

DIST = Path(__file__).resolve().parent.parent / "dist"

if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/")
    def root():
        return FileResponse(DIST / "index.html")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        f = DIST / full_path
        if f.is_file():
            return FileResponse(f)
        return FileResponse(DIST / "index.html")
else:
    @app.get("/")
    def root_dev():
        return {"status": "ok",
                "note": "Frontend dist not built. Run `npm run build` first."}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 80101))
    uvicorn.run(app, host="0.0.0.0", port=port)
