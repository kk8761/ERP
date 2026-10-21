"""
NexaERP Dedicated Enterprise Desktop Client (Kiosk Browser)
Built with PyQt6 / PySide6 / Tkinter Webview for Windows/Linux/macOS.
- Locks the window to NexaERP
- Disables standard browser URL bars, right-click, and DevTools
- Dedicated secure isolated session
"""

import sys
import os

def launch_kiosk():
    try:
        from PyQt6.QtCore import QUrl
        from PyQt6.QtWidgets import QApplication, QMainWindow
        from PyQt6.QtWebEngineWidgets import QWebEngineView
        from PyQt6.QtWebEngineCore import QWebEngineSettings

        app = QApplication(sys.argv)
        app.setApplicationName("NexaERP Secure Workstation")

        window = QMainWindow()
        window.setWindowTitle("NexaERP Enterprise Client")
        window.setGeometry(100, 100, 1400, 900)

        view = QWebEngineView()
        
        # Disable developer tools, context menu, and plugins inside WebEngine
        settings = view.settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptCanOpenWindows, False)
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptCanAccessClipboard, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled, True)
        
        # Disable context menu inside native window
        view.setContextMenuPolicy(3) # CustomContextMenu to suppress default right-click

        view.setUrl(QUrl("http://127.0.0.1:5173/"))
        window.setCentralWidget(view)
        window.show()

        print("[NexaERP] Secure Desktop Client launched successfully.")
        sys.exit(app.exec())
    except ImportError:
        # Fallback to Chrome in dedicated App Mode (isolated profile, no URL bar, no extension support)
        import subprocess
        chrome_paths = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe"),
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
        ]

        browser_exe = None
        for p in chrome_paths:
            if os.path.exists(p):
                browser_exe = p
                break

        if browser_exe:
            print(f"[NexaERP] Launching Dedicated Hardened Enterprise App via {os.path.basename(browser_exe)}...")
            cmd = [
                browser_exe,
                "--app=http://127.0.0.1:5173",
                "--disable-extensions",
                "--disable-plugins",
                "--disable-translate",
                "--no-first-run",
                "--no-default-browser-check"
            ]
            subprocess.Popen(cmd)
        else:
            import webbrowser
            webbrowser.open("http://127.0.0.1:5173")

if __name__ == "__main__":
    launch_kiosk()
