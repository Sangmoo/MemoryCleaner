import psutil
from dataclasses import dataclass


@dataclass
class MemorySnapshot:
    total: int
    used: int
    available: int
    percent: float

    @property
    def total_gb(self) -> float:
        return self.total / (1024 ** 3)

    @property
    def used_gb(self) -> float:
        return self.used / (1024 ** 3)

    @property
    def available_gb(self) -> float:
        return self.available / (1024 ** 3)


def take_snapshot() -> MemorySnapshot:
    vm = psutil.virtual_memory()
    return MemorySnapshot(
        total=vm.total,
        used=vm.used,
        available=vm.available,
        percent=vm.percent,
    )


def calc_recovery(before: MemorySnapshot, after: MemorySnapshot) -> dict:
    recovered_bytes = after.available - before.available
    recovered_gb = recovered_bytes / (1024 ** 3)
    recovery_pct = (recovered_bytes / before.total) * 100 if before.total > 0 else 0
    return {
        "recovered_bytes": recovered_bytes,
        "recovered_gb": recovered_gb,
        "recovery_pct": recovery_pct,
        "before_pct": before.percent,
        "after_pct": after.percent,
    }
