import sys
import ctypes


def is_admin() -> bool:
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except Exception:
        return False


def elevate():
    ctypes.windll.shell32.ShellExecuteW(
        None, "runas", sys.executable, " ".join(sys.argv), None, 1
    )
    sys.exit(0)


if __name__ == "__main__":
    if not is_admin():
        elevate()

    from ui.app import MemToolApp
    app = MemToolApp()
    app.mainloop()
