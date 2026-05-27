import tkinter as tk
from tkinter import ttk
import customtkinter as ctk

COLUMNS = ("sel", "name", "pid", "mem_mb", "tag")
COL_DISPLAY = {"sel": "✓", "name": "프로세스명", "pid": "PID", "mem_mb": "메모리(MB)", "tag": "분류"}
COL_WIDTH = {"sel": 36, "name": 240, "pid": 72, "mem_mb": 110, "tag": 72}
COL_ANCHOR = {"sel": "center", "name": "w", "pid": "center", "mem_mb": "e", "tag": "center"}

THEMES: dict[str, dict] = {
    "Dark": {
        "bg":        "#1e1e1e",
        "head_bg":   "#2c2c2c",
        "head_fg":   "#cccccc",
        "row_odd":   "#252525",
        "row_even":  "#2e2e2e",
        "fg_normal": "#d4d4d4",
        # 시스템: 어두운 네이비 배경 + 흐린 청색 텍스트 → 일반 행과 확연히 구분
        "fg_sys":    "#3a5070",
        "bg_sys":    "#0d111c",
        # 추천: 진한 호박색 배경 + 밝은 골드 텍스트
        "fg_rec":    "#f5c518",
        "bg_rec":    "#2a1a00",
        "sel_bg":    "#1f538d",
        "sel_fg":    "#ffffff",
    },
    "Light": {
        "bg":        "#f8f8f8",
        "head_bg":   "#d0d4d8",
        "head_fg":   "#1a1a1a",
        "row_odd":   "#ffffff",
        "row_even":  "#f2f4f6",
        "fg_normal": "#1a1a1a",
        # 시스템: 파란 회색 배경 + 중간 청회색 텍스트 → 흰 일반 행과 확연히 구분
        "fg_sys":    "#6688aa",
        "bg_sys":    "#c8d4e0",
        # 추천: 연노란 배경 + 진한 갈색-골드 텍스트
        "fg_rec":    "#7a4800",
        "bg_rec":    "#fff3c4",
        "sel_bg":    "#2a6db5",
        "sel_fg":    "#ffffff",
    },
}


def _apply_style(mode: str):
    t = THEMES.get(mode, THEMES["Dark"])
    style = ttk.Style()
    style.theme_use("default")

    style.configure("MemTool.Treeview",
                    background=t["row_odd"],
                    foreground=t["fg_normal"],
                    rowheight=26,
                    fieldbackground=t["row_odd"],
                    borderwidth=0,
                    font=("Segoe UI", 10))
    style.configure("MemTool.Treeview.Heading",
                    background=t["head_bg"],
                    foreground=t["head_fg"],
                    font=("Segoe UI", 10, "bold"),
                    relief="flat",
                    padding=(4, 4))
    style.map("MemTool.Treeview",
              background=[("selected", t["sel_bg"])],
              foreground=[("selected", t["sel_fg"])])
    style.map("MemTool.Treeview.Heading",
              background=[("active", t["head_bg"])])
    return t


class ProcessTable(ctk.CTkFrame):
    def __init__(self, master, on_selection_change=None, **kwargs):
        super().__init__(master, **kwargs)
        self._on_selection_change = on_selection_change
        self._selected_pids: set[int] = set()
        self._pid_to_iid: dict[int, str] = {}
        self._iid_to_pid: dict[str, int] = {}
        self._system_pids: set[int] = set()
        self._proc_data: list[dict] = []
        self._theme = THEMES["Dark"]
        self._build()

    def _build(self):
        self.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)
        self._theme = _apply_style(ctk.get_appearance_mode())

        self._tree = ttk.Treeview(
            self, columns=COLUMNS, show="headings",
            selectmode="none", style="MemTool.Treeview",
        )
        for col in COLUMNS:
            self._tree.heading(col, text=COL_DISPLAY[col])
            self._tree.column(col, width=COL_WIDTH[col], anchor=COL_ANCHOR[col],
                               stretch=(col == "name"), minwidth=COL_WIDTH[col])

        vsb = ttk.Scrollbar(self, orient="vertical", command=self._tree.yview)
        self._tree.configure(yscrollcommand=vsb.set)
        self._tree.grid(row=0, column=0, sticky="nsew")
        vsb.grid(row=0, column=1, sticky="ns")

        self._apply_tags()
        self._tree.bind("<Button-1>", self._on_click)

    def _apply_tags(self):
        t = self._theme
        self._tree.tag_configure("sys_odd",  background=t["bg_sys"],  foreground=t["fg_sys"])
        self._tree.tag_configure("sys_even", background=t["bg_sys"],  foreground=t["fg_sys"])
        self._tree.tag_configure("rec_odd",  background=t["bg_rec"],  foreground=t["fg_rec"])
        self._tree.tag_configure("rec_even", background=t["bg_rec"],  foreground=t["fg_rec"])
        self._tree.tag_configure("nor_odd",  background=t["row_odd"], foreground=t["fg_normal"])
        self._tree.tag_configure("nor_even", background=t["row_even"], foreground=t["fg_normal"])

    def refresh_style(self):
        self._theme = _apply_style(ctk.get_appearance_mode())
        self._apply_tags()
        self._tree.configure(style="MemTool.Treeview")
        if self._proc_data:
            self.load_processes(self._proc_data)

    def load_processes(self, proc_list: list[dict]):
        self._proc_data = proc_list
        self._pid_to_iid.clear()
        self._iid_to_pid.clear()
        self._system_pids.clear()
        self._tree.delete(*self._tree.get_children())

        for i, p in enumerate(proc_list):
            pid = p["pid"]
            is_sys = p.get("is_system", False)
            is_rec = p.get("safe_kill", False)
            parity = "odd" if i % 2 == 0 else "even"

            if is_sys:
                self._system_pids.add(pid)
                tag, sel_mark, tag_label = f"sys_{parity}", "⊘", "시스템"
            elif is_rec:
                checked = pid in self._selected_pids
                tag, sel_mark, tag_label = f"rec_{parity}", ("☑" if checked else "☐"), "추천"
            else:
                checked = pid in self._selected_pids
                tag, sel_mark, tag_label = f"nor_{parity}", ("☑" if checked else "☐"), "일반"

            iid = self._tree.insert(
                "", "end",
                values=(sel_mark, p["name"], pid, f"{p['mem_mb']:.1f}", tag_label),
                tags=(tag,),
            )
            self._pid_to_iid[pid] = iid
            self._iid_to_pid[iid] = pid

        if self._on_selection_change:
            self._on_selection_change()

    def _on_click(self, event):
        if self._tree.identify_region(event.x, event.y) != "cell":
            return
        iid = self._tree.identify_row(event.y)
        if not iid:
            return
        pid = self._iid_to_pid.get(iid)
        if pid is None or pid in self._system_pids:
            return
        if pid in self._selected_pids:
            self._selected_pids.discard(pid)
            self._set_check(iid, False)
        else:
            self._selected_pids.add(pid)
            self._set_check(iid, True)
        if self._on_selection_change:
            self._on_selection_change()

    def _set_check(self, iid: str, checked: bool):
        vals = list(self._tree.item(iid, "values"))
        vals[0] = "☑" if checked else "☐"
        self._tree.item(iid, values=vals)

    def get_selected_pids(self) -> list[int]:
        return [p["pid"] for p in self._proc_data
                if p["pid"] in self._selected_pids and p["pid"] not in self._system_pids]

    def select_all(self):
        for p in self._proc_data:
            if p.get("is_system"):
                continue
            pid = p["pid"]
            self._selected_pids.add(pid)
            iid = self._pid_to_iid.get(pid)
            if iid:
                self._set_check(iid, True)
        if self._on_selection_change:
            self._on_selection_change()

    def select_recommended(self):
        for p in self._proc_data:
            if p.get("safe_kill") and not p.get("is_system"):
                pid = p["pid"]
                self._selected_pids.add(pid)
                iid = self._pid_to_iid.get(pid)
                if iid:
                    self._set_check(iid, True)
        if self._on_selection_change:
            self._on_selection_change()

    def deselect_all(self):
        for pid in list(self._selected_pids):
            iid = self._pid_to_iid.get(pid)
            if iid:
                self._set_check(iid, False)
        self._selected_pids.clear()
        if self._on_selection_change:
            self._on_selection_change()
