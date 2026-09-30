# Local Code-to-LLM Bridge

Fast, ADHD-friendly, bi-directional link between your local project workspace and browser LLMs (**Google AI Studio**, **ChatGPT**, and **Claude**).

- **Port:** `localhost:3387`
- **Security:** Strict directory isolation (prevents path traversal outside your project folder).
- **Extension:** Manifest V3 with background proxying and reactive DOM observers.

---

## ⚡ Quick Start in 2 Minutes

### Step 1: Run the Local Python Backend

Ensure you have Python 3.9+ installed:

```bash
cd backend
pip install -r requirements.txt
python main.py --workspace /path/to/your/project
```

The server will start on `http://127.0.0.1:3387`.

### Step 2: Load the Browser Extension

1. Open Chrome, Brave, or Edge and go to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in top-right corner).
3. Click **"Load unpacked"**.
4. Select the `extension/` directory from this repository.
5. Click the extension icon in your toolbar to verify the status shows **Online**.

---

## 🚀 How to Use

### 1. Push Local Code into Prompt (Local $\rightarrow$ LLM)
- Open **Google AI Studio**, **ChatGPT**, or **Claude**.
- Click the **"⚡ Push Code"** button beside the prompt box (or press `Ctrl + Shift + K`).
- Select the files you want to include.
- Click **"Inject into Prompt"** — the code is formatted with markdown file paths and added to your prompt!

### 2. Pull Generated Code Back to Disk (LLM $\rightarrow$ Local)
- When the LLM generates a code snippet, a **"💾 Save to Local"** button will appear on the code block.
- If the model included a file path comment (e.g. `// src/App.tsx`), it auto-populates.
- Click to save — the file is immediately written to your local project disk!
