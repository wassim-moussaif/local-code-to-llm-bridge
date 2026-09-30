# Local Code-to-LLM Bridge ⚡

Fast, ADHD-friendly, bi-directional link between your local project workspace and browser LLMs (**Google AI Studio**, **Google Gemini**, **ChatGPT**, and **Claude**).

- **Backend:** Python FastAPI running on `localhost:3387`
- **Frontend / Extension:** Chrome Manifest V3 extension with native OS File Explorer integration
- **Security:** Strict directory boundary enforcement (no path traversal outside active workspace)

---

## 🚀 Key Features

1. **⚡ Push Local Code to LLM Prompt:**
   - Click the inline **"⚡ Push Code"** button (or press `Ctrl + Shift + K`).
   - Pick files using fuzzy search, select multiple, and inject markdown-formatted blocks right into the prompt.
2. **⚡ Push Highlighted Selection:**
   - Highlight any text or code snippet in the browser.
   - Click the floating **"⚡ Push"** pill to instantly send it to the prompt box wrapped in triple backticks.
3. **💾 Pull / Save to Local Disk (Native File Explorer):**
   - Click **"💾 Save to Local"** on any LLM code block, or highlight any text to click the floating **"💾 Save to Local"** pill.
   - Automatically opens your **native OS File Explorer / "Save As" dialog pre-navigated to your project folder** (zero manual path typing!).
4. **📁 1-Click Folder Picker:**
   - In the extension popup, click **"📁 Browse Folder"** to visually pick your project directory using Windows Explorer, macOS Finder, or Linux file dialog.

---

## ⚡ Quick Start (2 Minutes)

### Step 1: Start the Local Backend Server

Make sure you have **Python 3.9+** installed:

#### Windows:
```bash
# Double-click start-backend.bat, or run:
cd backend
pip install -r requirements.txt
python main.py --workspace "C:\path\to\your\project"
```

#### macOS / Linux:
```bash
cd backend
pip install -r requirements.txt
python3 main.py --workspace ~/path/to/your/project
```

The backend starts listening on `http://127.0.0.1:3387`.

---

### Step 2: Install the Browser Extension

1. Open **Chrome**, **Brave**, or **Edge** and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click the **"Load unpacked"** button.
4. Select the `extension/` folder in this repository.
5. Pin the **Code-to-LLM Bridge** icon to your browser toolbar.
6. Click the extension icon — it should show `🟢 Online` connected to `http://127.0.0.1:3387`.

---

## 🎯 Supported LLM Platforms

- **Google AI Studio** (`https://aistudio.google.com/*`)
- **Google Gemini** (`https://gemini.google.com/*`)
- **ChatGPT** (`https://chatgpt.com/*`)
- **Claude** (`https://claude.ai/*`)

---

## 💻 CLI Commands & Arguments Reference

You can launch the backend server with custom flags directly from the command line:

```bash
python backend/main.py [OPTIONS]
```

### Available CLI Flags:

| Flag | Short | Default | Description |
|---|---|---|---|
| `--workspace` | `-w` | `.` (Current directory) | Absolute or relative path to your local project folder to mount as workspace |
| `--port` | `-p` | `3387` | Local port for FastAPI server (`localhost:3387`) |
| `--host` | | `127.0.0.1` | Network interface address to bind to |
| `--help` | `-h` | | Show help message with all available options |

### Common CLI Examples:

```bash
# 1. Run in current directory (default)
python backend/main.py

# 2. Run targeting a specific workspace folder
python backend/main.py --workspace "D:\Projects\my-react-app"

# 3. Run on a different port (e.g. 5000)
python backend/main.py --workspace ~/projects/ai-app --port 5000

# 4. Using the ready-to-run scripts:
# Windows:
.\start-backend.bat

# macOS / Linux:
chmod +x ./start-backend.sh
./start-backend.sh
```

---

## 🛠️ How to Use

| Action | How to do it | What happens |
|---|---|---|
| **Push Full Files** | Click **⚡ Push Code** near prompt or press <kbd>Ctrl+Shift+K</kbd> | Opens local file selector modal; injects selected files with paths into prompt |
| **Push Text Selection** | Highlight any text/code on page $\rightarrow$ click floating **⚡ Push** | Injects selected text formatted in markdown backticks into prompt |
| **Save Code to Local** | Click **💾 Save to Local** on code block header | Opens native OS Save File dialog right in your project folder |
| **Save Selection to Local** | Highlight text/code $\rightarrow$ click floating **💾 Save to Local** | Opens native OS Save File dialog with selected text |
| **Switch Workspace** | Open extension popup $\rightarrow$ click **📁 Browse Folder** | Opens native OS directory picker to choose a new project folder |

---



## 🔒 Security Architecture

- **Root Lockdown:** All read/write operations are resolved against the canonical `WORKSPACE_DIR` using `pathlib.Path.resolve()`.
- **Traversal Prevention:** Any attempt to use `../` to access files outside the workspace raises a `403 Forbidden`.
- **Background Proxy:** Browser extension network requests are routed through `background.js` service worker, preserving strict web CORS and CSP rules.
