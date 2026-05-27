import time
import threading
import customtkinter as ctk
import tkinter as tk
from tkinter import messagebox

from core.memory import take_snapshot, calc_recovery
from core.processes import get_process_list, kill_processes
from ui.memory_bar import MemoryBar, BeforeAfterPanel
from ui.process_table import ProcessTable

REFRESH_INTERVAL_MS = 3000

# 임계값 스텝 (MB 단위): 500MB, 1GB, 2GB, 3GB, 5GB, 10GB
THRESHOLD_STEPS = [100, 500, 1024, 2048, 3072, 5120, 10240]


def _fmt_threshold(mb: int) -> str:
    if mb < 1024:
        return f"{mb} MB"
    return f"{mb / 1024:.0f} GB" if mb % 1024 == 0 else f"{mb / 1024:.1f} GB"


class MemToolApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Memory Cleaner")
        self.geometry("880x720")
        self.minsize(740, 580)
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")

        self._threshold_mb = tk.IntVar(value=500)
        self._current_procs: list[dict] = []
        self._build_ui()
        self._refresh_memory_bar()
        self._refresh_process_list()

    # ── Layout ────────────────────────────────────────────────────────────────

    def _build_ui(self):
        self.columnconfigure(0, weight=1)
        self.rowconfigure(2, weight=1)

        self._build_topbar()
        self._build_memory_section()
        self._build_process_section()
        self._build_action_bar()
        self._build_result_section()

    def _build_topbar(self):
        bar = ctk.CTkFrame(self, height=46, corner_radius=0)
        bar.grid(row=0, column=0, sticky="ew")
        bar.columnconfigure(1, weight=1)

        ctk.CTkLabel(
            bar, text="  ⚡ Memory Cleaner",
            font=ctk.CTkFont(size=15, weight="bold"),
        ).grid(row=0, column=0, sticky="w", padx=8)

        self._theme_btn = ctk.CTkButton(
            bar, text="🌙 다크", width=110, height=30,
            font=ctk.CTkFont(size=12),
            command=self._toggle_theme,
        )
        self._theme_btn.grid(row=0, column=2, padx=12, pady=8)

    def _build_memory_section(self):
        self._mem_bar = MemoryBar(self, corner_radius=10)
        self._mem_bar.grid(row=1, column=0, sticky="ew", padx=12, pady=(8, 0))

    def _build_process_section(self):
        frame = ctk.CTkFrame(self, corner_radius=10)
        frame.grid(row=2, column=0, sticky="nsew", padx=12, pady=8)
        frame.columnconfigure(0, weight=1)
        frame.rowconfigure(2, weight=1)

        # ── 컨트롤 행 1: 제목 + 임계값 + 선택 버튼 ────────────────
        row1 = ctk.CTkFrame(frame, fg_color="transparent")
        row1.grid(row=0, column=0, sticky="ew", padx=10, pady=(10, 2))

        ctk.CTkLabel(
            row1, text="프로세스 목록",
            font=ctk.CTkFont(size=13, weight="bold"),
        ).pack(side="left", padx=(0, 16))

        # 임계값 ─ 표시 라벨 + ▼▲ 버튼
        ctk.CTkLabel(row1, text="추천 기준:", font=ctk.CTkFont(size=11)).pack(side="left")

        self._threshold_label = ctk.CTkLabel(
            row1, text=_fmt_threshold(self._threshold_mb.get()),
            font=ctk.CTkFont(size=11, weight="bold"), width=60,
        )
        self._threshold_label.pack(side="left", padx=(4, 0))

        step_btn_cfg = dict(width=28, height=26, font=ctk.CTkFont(size=12), text_color=("gray10", "gray95"))
        ctk.CTkButton(row1, text="▲", command=self._threshold_up,
                       fg_color=("gray80", "gray35"), hover_color=("gray65", "gray45"),
                       **step_btn_cfg).pack(side="left", padx=(2, 0))
        ctk.CTkButton(row1, text="▼", command=self._threshold_down,
                       fg_color=("gray80", "gray35"), hover_color=("gray65", "gray45"),
                       **step_btn_cfg).pack(side="left", padx=(2, 12))

        btn_cfg = dict(height=28, font=ctk.CTkFont(size=11))
        ctk.CTkButton(row1, text="새로고침", width=76, command=self._refresh_process_list, **btn_cfg).pack(side="left", padx=2)
        ctk.CTkButton(row1, text="전체 선택", width=76, command=self._select_all, **btn_cfg).pack(side="left", padx=2)
        ctk.CTkButton(row1, text="추천 선택", width=76, command=self._select_recommended, **btn_cfg).pack(side="left", padx=2)

        # 전체 해제: 다크/라이트 모두 명확히 보이는 색상 고정
        self._deselect_btn = ctk.CTkButton(
            row1, text="전체 해제", width=76,
            fg_color=("gray72", "gray38"),
            hover_color=("gray58", "gray50"),
            text_color=("gray10", "gray95"),
            border_width=0,
            command=self._deselect_all, **btn_cfg,
        )
        self._deselect_btn.pack(side="left", padx=2)

        # ── 컨트롤 행 2: 선택 정보 + 범례 ────────────────────────
        row2 = ctk.CTkFrame(frame, fg_color="transparent")
        row2.grid(row=1, column=0, sticky="ew", padx=10, pady=(0, 4))

        self._selection_label = ctk.CTkLabel(
            row2,
            text="선택: 0개   |   예상 확보: ~0 MB",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=("gray30", "gray80"),
            anchor="w",
        )
        self._selection_label.pack(side="left")

        # 범례
        legend = ctk.CTkFrame(row2, fg_color="transparent")
        legend.pack(side="right")
        for color, label in [("#6688aa", "시스템"), ("#f5c518", "추천"), ("gray60", "일반")]:
            ctk.CTkLabel(legend, text=f"● {label}", font=ctk.CTkFont(size=10),
                          text_color=color).pack(side="left", padx=6)

        # ── 테이블 ──────────────────────────────────────────────────
        self._table = ProcessTable(
            frame,
            on_selection_change=self._update_selection_label,
            corner_radius=6,
        )
        self._table.grid(row=2, column=0, sticky="nsew", padx=8, pady=(0, 8))

    def _build_action_bar(self):
        bar = ctk.CTkFrame(self, height=50, corner_radius=0)
        bar.grid(row=3, column=0, sticky="ew")
        bar.columnconfigure(0, weight=1)

        self._status_label = ctk.CTkLabel(
            bar, text="", font=ctk.CTkFont(size=11),
            text_color=("gray40", "gray65"),
        )
        self._status_label.pack(side="left", padx=16)

        self._kill_btn = ctk.CTkButton(
            bar,
            text="선택한 프로세스 Kill",
            height=34, width=210,
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color="#C0392B", hover_color="#922B21",
            command=self._confirm_kill,
        )
        self._kill_btn.pack(side="right", padx=16, pady=8)

    def _build_result_section(self):
        self._result_panel = BeforeAfterPanel(self, corner_radius=10)
        self._result_panel.grid(row=4, column=0, sticky="ew", padx=12, pady=(0, 12))
        self._result_panel.grid_remove()

    # ── 임계값 스텝 ───────────────────────────────────────────────

    def _threshold_up(self):
        cur = self._threshold_mb.get()
        nxt = next((s for s in THRESHOLD_STEPS if s > cur), THRESHOLD_STEPS[-1])
        self._threshold_mb.set(nxt)
        self._threshold_label.configure(text=_fmt_threshold(nxt))
        self._refresh_process_list()

    def _threshold_down(self):
        cur = self._threshold_mb.get()
        nxt = next((s for s in reversed(THRESHOLD_STEPS) if s < cur), THRESHOLD_STEPS[0])
        self._threshold_mb.set(nxt)
        self._threshold_label.configure(text=_fmt_threshold(nxt))
        self._refresh_process_list()

    # ── Actions ───────────────────────────────────────────────────────────────

    def _toggle_theme(self):
        current = ctk.get_appearance_mode()
        new_mode = "light" if current == "Dark" else "dark"
        ctk.set_appearance_mode(new_mode)
        self._theme_btn.configure(text="☀ 라이트" if new_mode == "light" else "🌙 다크")
        self._table.refresh_style()

    def _refresh_memory_bar(self):
        snap = take_snapshot()
        self._mem_bar.update_stats(snap.used_gb, snap.total_gb, snap.percent)
        self.after(REFRESH_INTERVAL_MS, self._refresh_memory_bar)

    def _refresh_process_list(self):
        self._kill_btn.configure(state="disabled", text="불러오는 중…")
        self._status_label.configure(text="프로세스 목록 로딩 중…")
        threshold = self._threshold_mb.get()
        threading.Thread(target=self._load_procs_bg, args=(threshold,), daemon=True).start()

    def _load_procs_bg(self, threshold: int):
        t0 = time.time()
        procs = get_process_list(threshold_mb=threshold)
        elapsed = time.time() - t0
        self.after(0, lambda: self._apply_proc_list(procs, elapsed))

    def _apply_proc_list(self, procs, elapsed: float):
        self._current_procs = procs
        self._table.load_processes(procs)
        rec = sum(1 for p in procs if p.get("safe_kill"))
        self._status_label.configure(
            text=f"{len(procs)}개 프로세스  |  추천 {rec}개  |  로드 {elapsed:.2f}s"
        )
        self._kill_btn.configure(state="normal", text="선택한 프로세스 Kill")

    def _select_all(self):
        self._table.select_all()

    def _select_recommended(self):
        self._table.select_recommended()

    def _deselect_all(self):
        self._table.deselect_all()

    def _update_selection_label(self):
        pids = self._table.get_selected_pids()
        pid_set = set(pids)
        total_mb = sum(p["mem_mb"] for p in self._current_procs if p["pid"] in pid_set)
        if total_mb >= 1024:
            mem_str = f"{total_mb / 1024:.1f} GB"
        else:
            mem_str = f"{total_mb:.0f} MB"
        self._selection_label.configure(
            text=f"선택: {len(pids)}개   |   예상 확보: ~{mem_str}"
        )

    def _confirm_kill(self):
        pids = self._table.get_selected_pids()
        if not pids:
            messagebox.showinfo("알림", "Kill할 프로세스를 선택해 주세요.")
            return

        pid_set = set(pids)
        names = [p["name"] for p in self._current_procs if p["pid"] in pid_set]
        preview = "\n".join(f"  • {n}" for n in names[:15])
        if len(names) > 15:
            preview += f"\n  … 외 {len(names) - 15}개"

        ok = messagebox.askyesno(
            "Kill 확인",
            f"아래 {len(pids)}개 프로세스를 종료합니다:\n\n{preview}\n\n계속하시겠습니까?",
        )
        if ok:
            self._execute_kill(pids)

    def _execute_kill(self, pids: list[int]):
        self._kill_btn.configure(state="disabled", text="종료 중…")
        before_snap = take_snapshot()
        threading.Thread(target=self._kill_bg, args=(pids, before_snap), daemon=True).start()

    def _kill_bg(self, pids, before_snap):
        results = kill_processes(pids)
        time.sleep(0.6)
        after_snap = take_snapshot()
        self.after(0, lambda: self._show_result(results, before_snap, after_snap))

    def _show_result(self, results, before_snap, after_snap):
        recovery = calc_recovery(before_snap, after_snap)
        success = sum(1 for r in results if r["success"])
        fail = len(results) - success

        self._result_panel.update_result(recovery)
        self._result_panel.grid()

        msg = f"완료: {success}개 종료"
        if fail:
            msg += f", {fail}개 실패"
        msg += f"\n메모리 확보: {recovery['recovered_gb']:+.2f} GB ({recovery['recovery_pct']:+.1f}%)"
        if fail:
            failed = [r["name"] for r in results if not r["success"]]
            msg += "\n\n실패:\n" + "\n".join(f"  • {n}" for n in failed)

        messagebox.showinfo("Kill 완료", msg)
        self._kill_btn.configure(state="normal", text="선택한 프로세스 Kill")
        self._refresh_process_list()
