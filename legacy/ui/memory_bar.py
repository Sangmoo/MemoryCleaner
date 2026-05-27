import customtkinter as ctk


class MemoryBar(ctk.CTkFrame):
    def __init__(self, master, **kwargs):
        super().__init__(master, **kwargs)

        self._label_title = ctk.CTkLabel(self, text="RAM 사용현황", font=ctk.CTkFont(size=13, weight="bold"))
        self._label_title.pack(anchor="w", padx=16, pady=(12, 4))

        self._bar = ctk.CTkProgressBar(self, height=18, corner_radius=9)
        self._bar.pack(fill="x", padx=16, pady=(0, 4))
        self._bar.set(0)

        self._label_detail = ctk.CTkLabel(self, text="", font=ctk.CTkFont(size=12))
        self._label_detail.pack(anchor="w", padx=16, pady=(0, 12))

    def update_stats(self, used_gb: float, total_gb: float, percent: float):
        self._bar.set(percent / 100)
        color = self._bar_color(percent)
        self._bar.configure(progress_color=color)
        self._label_detail.configure(
            text=f"{used_gb:.1f} GB / {total_gb:.1f} GB  ({percent:.1f}%)"
        )

    @staticmethod
    def _bar_color(pct: float) -> str:
        if pct < 60:
            return "#2FA572"
        elif pct < 80:
            return "#E0A020"
        return "#D94040"


class BeforeAfterPanel(ctk.CTkFrame):
    def __init__(self, master, **kwargs):
        super().__init__(master, **kwargs)

        title = ctk.CTkLabel(self, text="Kill 결과", font=ctk.CTkFont(size=13, weight="bold"))
        title.grid(row=0, column=0, columnspan=3, sticky="w", padx=16, pady=(12, 8))

        ctk.CTkLabel(self, text="Before", font=ctk.CTkFont(size=11)).grid(row=1, column=0, padx=16)
        ctk.CTkLabel(self, text="→").grid(row=1, column=1)
        ctk.CTkLabel(self, text="After", font=ctk.CTkFont(size=11)).grid(row=1, column=2, padx=16)

        self._before_bar = ctk.CTkProgressBar(self, height=14, corner_radius=7, width=180)
        self._before_bar.grid(row=2, column=0, padx=16, pady=4)
        self._before_bar.set(0)

        ctk.CTkLabel(self, text="").grid(row=2, column=1)

        self._after_bar = ctk.CTkProgressBar(self, height=14, corner_radius=7, width=180)
        self._after_bar.grid(row=2, column=2, padx=16, pady=4)
        self._after_bar.set(0)

        self._before_label = ctk.CTkLabel(self, text="-", font=ctk.CTkFont(size=11))
        self._before_label.grid(row=3, column=0, padx=16)
        self._after_label = ctk.CTkLabel(self, text="-", font=ctk.CTkFont(size=11))
        self._after_label.grid(row=3, column=2, padx=16)

        self._recovery_label = ctk.CTkLabel(self, text="", font=ctk.CTkFont(size=13, weight="bold"))
        self._recovery_label.grid(row=4, column=0, columnspan=3, pady=(8, 12))

    def update_result(self, result: dict):
        b = result["before_pct"] / 100
        a = result["after_pct"] / 100
        self._before_bar.set(b)
        self._after_bar.set(a)
        self._before_bar.configure(progress_color=self._color(result["before_pct"]))
        self._after_bar.configure(progress_color=self._color(result["after_pct"]))
        self._before_label.configure(text=f"{result['before_pct']:.1f}%")
        self._after_label.configure(text=f"{result['after_pct']:.1f}%")

        gb = result["recovered_gb"]
        pct = result["recovery_pct"]
        sign = "+" if gb > 0 else ""
        color = "#2FA572" if gb > 0 else "#D94040"
        self._recovery_label.configure(
            text=f"확보: {sign}{gb:.2f} GB  ({sign}{pct:.1f}%)",
            text_color=color,
        )

    @staticmethod
    def _color(pct: float) -> str:
        if pct < 60:
            return "#2FA572"
        elif pct < 80:
            return "#E0A020"
        return "#D94040"
