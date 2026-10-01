import sys
import subprocess
import os
from pathlib import Path

def pick_folder(initial_dir="."):
    initial_dir = os.path.abspath(initial_dir)
    print(f"[CodeBridge] pick_folder requested with initial_dir: {initial_dir}")

    # 1. Windows uses the Universal Tkinter Fallback (see below) because PowerShell's ShowDialog($form) can freeze when called from a background process.

    # 2. macOS: AppleScript native choose folder dialog
    if sys.platform == "darwin":
        osa_script = f'''
        tell application "System Events"
            activate
            try
                set chosenFolder to choose folder with prompt "Select Project Workspace Folder:" default location POSIX file "{initial_dir}"
                return POSIX path of chosenFolder
            on error
                return ""
            end try
        end tell
        '''
        try:
            res = subprocess.run(["osascript", "-e", osa_script], capture_output=True, text=True, timeout=120)
            out = res.stdout.strip()
            if out and os.path.isdir(out):
                return out
        except Exception as e:
            print(f"[CodeBridge] macOS folder picker error: {e}")

    # 3. Linux: Zenity / KDialog
    if sys.platform.startswith("linux"):
        for cmd in [
            ["zenity", "--file-selection", "--directory", f"--filename={initial_dir}/", "--title=Select Project Workspace Folder"],
            ["kdialog", "--getexistingdirectory", initial_dir, "--title", "Select Project Workspace Folder"]
        ]:
            try:
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
                out = res.stdout.strip()
                if out and os.path.isdir(out):
                    return out
            except Exception:
                continue

    # 4. Universal Tkinter Fallback
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.wm_attributes("-topmost", 1)
        root.focus_force()
        chosen = filedialog.askdirectory(initialdir=initial_dir, title="Select Project Workspace Folder")
        root.destroy()
        if chosen and os.path.isdir(chosen):
            return chosen
    except Exception as e:
        print(f"[CodeBridge] Tkinter folder picker error: {e}")

    return None

def pick_save_file(initial_dir=".", suggested_filename=""):
    """
    Opens OS native 'Save As' file dialog located in the project directory.
    Returns the absolute path chosen by the user.
    """
    initial_dir = os.path.abspath(initial_dir)
    default_name = os.path.basename(suggested_filename) if suggested_filename else "code_snippet.txt"
    sub_dir = os.path.dirname(suggested_filename) if suggested_filename else ""
    if sub_dir:
        candidate_dir = os.path.join(initial_dir, sub_dir)
        if os.path.isdir(candidate_dir):
            initial_dir = candidate_dir

    print(f"[CodeBridge] pick_save_file requested: dir={initial_dir}, default_name={default_name}")

    # 1. Windows uses the Universal Tkinter Fallback (see below) because PowerShell's ShowDialog($form) can freeze when called from a background process.

    # 2. macOS: AppleScript native choose file name
    if sys.platform == "darwin":
        osa_script = f'''
        tell application "System Events"
            activate
            try
                set chosenFile to choose file name with prompt "Save Code to Local File:" default name "{default_name}" default location POSIX file "{initial_dir}"
                return POSIX path of chosenFile
            on error
                return ""
            end try
        end tell
        '''
        try:
            res = subprocess.run(["osascript", "-e", osa_script], capture_output=True, text=True, timeout=120)
            out = res.stdout.strip()
            if out:
                return out
        except Exception as e:
            print(f"[CodeBridge] macOS save file picker error: {e}")

    # 3. Linux: Zenity / KDialog
    if sys.platform.startswith("linux"):
        try:
            res = subprocess.run(
                ["zenity", "--file-selection", "--save", "--confirm-overwrite", f"--filename={os.path.join(initial_dir, default_name)}", "--title=Save Code to Local File"],
                capture_output=True,
                text=True,
                timeout=120
            )
            out = res.stdout.strip()
            if out:
                return out
        except Exception as e:
            print(f"[CodeBridge] Linux save file picker error: {e}")

    # 4. Universal Tkinter Fallback
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.wm_attributes("-topmost", 1)
        root.focus_force()
        chosen = filedialog.asksaveasfilename(
            initialdir=initial_dir,
            initialfile=default_name,
            title="Save Code to Local File"
        )
        root.destroy()
        if chosen:
            return chosen
    except Exception as e:
        print(f"[CodeBridge] Tkinter save file picker error: {e}")

    return None
