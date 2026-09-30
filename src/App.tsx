/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FolderCode,
  Terminal,
  Zap,
  Download,
  Copy,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  FileCode,
  Layers,
  ArrowRightLeft,
  Play,
  RotateCw,
  Cpu,
  Sparkles
} from 'lucide-react';

interface ServerStatus {
  status: 'checking' | 'online' | 'offline';
  workspace?: string;
  filesCount?: number;
  error?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'run' | 'anyfolder' | 'overview' | 'server' | 'extension' | 'simulator'>('run');
  const [serverStatus, setServerStatus] = useState<ServerStatus>({ status: 'checking' });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Playground simulation states
  const [simPrompt, setSimPrompt] = useState('Here is my updated App.tsx component for the dashboard...');
  const [simCode, setSimCode] = useState(`// src/components/Dashboard.tsx
import React from 'react';

export function Dashboard() {
  return (
    <div className="p-6 bg-slate-900 text-white rounded-lg">
      <h2 className="text-xl font-bold text-sky-400">Project Telemetry</h2>
      <p className="text-slate-400 mt-2">Active nodes: 12 · Latency: 14ms</p>
    </div>
  );
}`);
  const [simSaveStatus, setSimSaveStatus] = useState<string | null>(null);

  // Check health against localhost:3387
  const checkLocalServer = async () => {
    setServerStatus({ status: 'checking' });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('http://127.0.0.1:3387/health', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        // Also fetch file count
        const filesRes = await fetch('http://127.0.0.1:3387/files');
        const filesData = filesRes.ok ? await filesRes.json() : { count: 0 };
        setServerStatus({
          status: 'online',
          workspace: data.workspace,
          filesCount: filesData.count || 0
        });
      } else {
        setServerStatus({ status: 'offline', error: `Server returned HTTP ${res.status}` });
      }
    } catch (err: any) {
      setServerStatus({
        status: 'offline',
        error: 'Cannot reach http://127.0.0.1:3387. Run "python backend/main.py" locally.'
      });
    }
  };

  useEffect(() => {
    checkLocalServer();
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSimSave = async () => {
    setSimSaveStatus('saving');
    try {
      const res = await fetch('http://127.0.0.1:3387/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'src/components/Dashboard.tsx',
          content: simCode
        })
      });
      if (res.ok) {
        setSimSaveStatus('success');
      } else {
        setSimSaveStatus('error');
      }
    } catch {
      setSimSaveStatus('error');
    }
    setTimeout(() => setSimSaveStatus(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                Local Code-to-LLM Bridge
                <span className="text-[10px] font-mono uppercase bg-slate-800 text-sky-400 px-1.5 py-0.5 rounded border border-slate-700">
                  v1.0 MV3
                </span>
              </span>
              <span className="text-xs text-slate-400 block">
                Google AI Studio · Gemini · ChatGPT · Claude · localhost:3387
              </span>
            </div>
          </div>

          {/* Localhost connection badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={checkLocalServer}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono border transition ${
                serverStatus.status === 'online'
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80 hover:bg-emerald-900/40'
                  : serverStatus.status === 'checking'
                  ? 'bg-amber-950/40 text-amber-400 border-amber-800/60 animate-pulse'
                  : 'bg-rose-950/40 text-rose-400 border-rose-900/60 hover:bg-rose-900/40'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  serverStatus.status === 'online'
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : serverStatus.status === 'checking'
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
              />
              <span>
                {serverStatus.status === 'online'
                  ? '127.0.0.1:3387 Active'
                  : serverStatus.status === 'checking'
                  ? 'Pinging Server...'
                  : 'Server Offline'}
              </span>
              <RotateCw className="w-3 h-3 ml-1 opacity-70 hover:opacity-100" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('run')}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${
              activeTab === 'run'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Complete Run Guide
          </button>
          <button
            onClick={() => setActiveTab('anyfolder')}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${
              activeTab === 'anyfolder'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderCode className="w-3.5 h-3.5" />
            Use with Any Folder (No Copying)
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === 'overview'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            System Overview & Flow
          </button>
          <button
            onClick={() => setActiveTab('server')}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === 'server'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Python Backend (Port 3387)
          </button>
          <button
            onClick={() => setActiveTab('extension')}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === 'extension'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chrome Extension (MV3)
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === 'simulator'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Interactive Sandbox
          </button>
        </div>

        {/* TAB 0: COMPLETE RUN GUIDE */}
        {activeTab === 'run' && (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono uppercase text-sky-400 font-semibold tracking-wider">Step-By-Step Setup</span>
                <h2 className="text-xl font-bold text-white mt-1">How to Run the Bridge Completely</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Follow these 3 simple steps to get bi-directional Push/Pull working between your local code and AI Studio/ChatGPT/Claude.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={checkLocalServer}
                  className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Test Local Server Connection
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="p-5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center border border-sky-500/30">
                      1
                    </span>
                    <h3 className="font-semibold text-white text-sm">Start Local Python Backend (`localhost:3387`)</h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Terminal</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Open a terminal in the root of this project and run the pre-configured launcher:
                </p>

                {/* macOS / Linux */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-400 font-medium">macOS / Linux:</div>
                  <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-xs flex items-center justify-between">
                    <span className="text-sky-300">chmod +x start-backend.sh && ./start-backend.sh</span>
                    <button
                      onClick={() => copyToClipboard('chmod +x start-backend.sh && ./start-backend.sh', 'sh_cmd')}
                      className="text-slate-400 hover:text-white p-1 rounded"
                    >
                      {copiedKey === 'sh_cmd' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Windows */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-400 font-medium">Windows (PowerShell / Command Prompt):</div>
                  <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-xs flex items-center justify-between">
                    <span className="text-sky-300">.\start-backend.bat</span>
                    <button
                      onClick={() => copyToClipboard('.\\start-backend.bat', 'bat_cmd')}
                      className="text-slate-400 hover:text-white p-1 rounded"
                    >
                      {copiedKey === 'bat_cmd' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Manual */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-400 font-medium">Or manually:</div>
                  <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-xs flex items-center justify-between">
                    <span className="text-slate-300">cd backend && pip install -r requirements.txt && python main.py --workspace ..</span>
                    <button
                      onClick={() => copyToClipboard('cd backend && pip install -r requirements.txt && python main.py --workspace ..', 'manual_cmd')}
                      className="text-slate-400 hover:text-white p-1 rounded"
                    >
                      {copiedKey === 'manual_cmd' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center border border-sky-500/30">
                      2
                    </span>
                    <h3 className="font-semibold text-white text-sm">Load Unpacked Extension into Chrome / Brave</h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Browser</span>
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">a.</span>
                    <span>Navigate to <code className="bg-slate-950 text-sky-300 px-1 py-0.5 rounded border border-slate-800">chrome://extensions</code> in your browser.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">b.</span>
                    <span>Turn ON <b>"Developer mode"</b> toggle switch (upper-right corner).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">c.</span>
                    <span>Click <b>"Load unpacked"</b> (upper-left corner).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">d.</span>
                    <span>Select the <code className="bg-slate-950 text-sky-300 px-1 py-0.5 rounded border border-slate-800">extension/</code> folder in this project root.</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center border border-sky-500/30">
                      3
                    </span>
                    <h3 className="font-semibold text-white text-sm">Use on Google AI Studio, ChatGPT, or Claude</h3>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">Ready to Use</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-950/60 rounded border border-slate-800/80 space-y-2">
                    <div className="font-semibold text-sky-400 flex items-center gap-1.5">
                      <Zap className="w-4 h-4" />
                      Push (Local & Selection $\rightarrow$ LLM)
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Click the injected <b>"⚡ Push Code"</b> button (or <kbd className="bg-slate-800 px-1 rounded text-slate-200">Ctrl+Shift+K</kbd>) to insert full files. Or <b>highlight/select any text or code snippet</b> anywhere on the page to see the floating <b>"⚡ Push Selection"</b> button (or right-click $\rightarrow$ Push Selection)!
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/60 rounded border border-slate-800/80 space-y-2">
                    <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Download className="w-4 h-4" />
                      Pull (LLM $\rightarrow$ Local)
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Click the <b>"💾 Save to Local"</b> button on any code block header, or <b>highlight/select any lines of code or text</b> to pop up the floating <b>"💾 Save to Local"</b> button. It opens native File Explorer right in your project folder!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: USE WITH ANY FOLDER WITHOUT COPYING */}
        {activeTab === 'anyfolder' && (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-mono uppercase text-sky-400 font-semibold tracking-wider">Universal Workflow</span>
              <h2 className="text-xl font-bold text-white mt-1">Use With Any Project Folder (Zero File Copying)</h2>
              <p className="text-xs text-slate-400 mt-1">
                You never need to copy any files, scripts, or extension folders into your other projects. Here are the 3 cleanest ways to use it anywhere:
              </p>
            </div>

            <div className="space-y-4">
              {/* Option A: Point --workspace */}
              <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-950 text-sky-400 border border-sky-800">
                      Option 1 (Fastest)
                    </span>
                    <h3 className="text-sm font-semibold text-white">Pass the Target Folder as an Argument</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">No installation needed</span>
                </div>
                <p className="text-xs text-slate-300">
                  Keep this bridge repository anywhere (e.g. in your <code>Tools/</code> or <code>Downloads/</code> folder). Simply pass your target project path to the launcher:
                </p>
                <div className="space-y-2">
                  <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-xs flex items-center justify-between">
                    <span className="text-sky-300">./start-backend.sh /path/to/any/project</span>
                    <button
                      onClick={() => copyToClipboard('./start-backend.sh /path/to/any/project', 'opt1_mac')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'opt1_mac' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-xs flex items-center justify-between">
                    <span className="text-sky-300">.\start-backend.bat C:\Users\YourName\MyOtherProject</span>
                    <button
                      onClick={() => copyToClipboard('.\\start-backend.bat C:\\Users\\YourName\\MyOtherProject', 'opt1_win')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'opt1_win' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Option B: Global CLI command */}
              <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Option 2 (Most Convenient)
                    </span>
                    <h3 className="text-sm font-semibold text-white">Global Terminal Command: `codebridge`</h3>
                  </div>
                  <span className="text-xs text-emerald-400 font-mono">1-Time Install</span>
                </div>
                <p className="text-xs text-slate-300">
                  Install the package globally in your Python environment once:
                </p>
                <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-xs flex items-center justify-between">
                  <span className="text-emerald-300">pip install -e .</span>
                  <button
                    onClick={() => copyToClipboard('pip install -e .', 'pip_install_e')}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'pip_install_e' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-300">
                  After that, you can open a terminal in <b>ANY directory on your computer</b> and run:
                </p>
                <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-xs flex items-center justify-between">
                  <span className="text-white">codebridge</span>
                  <button
                    onClick={() => copyToClipboard('codebridge', 'codebridge_cmd')}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'codebridge_cmd' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  It automatically serves whatever directory you are standing in as the active workspace!
                </p>
              </div>

              {/* Option C: Live Extension Switcher */}
              <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-950 text-purple-400 border border-purple-800">
                      Option 3 (UI Switcher)
                    </span>
                    <h3 className="text-sm font-semibold text-white">Switch Folder On-the-Fly via Extension Popup</h3>
                  </div>
                  <span className="text-xs text-purple-400 font-mono">Zero Terminal Restarts</span>
                </div>
                <p className="text-xs text-slate-300">
                  Keep the Python server running in the background. Whenever you switch tasks, click the extension icon in Chrome toolbar, type your new project path into the <b>"Switch folder path"</b> box, and hit <b>Switch</b>!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Value prop banner */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 relative overflow-hidden">
              <div className="max-w-2xl">
                <span className="text-xs uppercase font-mono tracking-wider text-sky-400 font-semibold">
                  Zero Copy-Paste Engineering
                </span>
                <h1 className="text-2xl font-bold text-white mt-1 mb-2">
                  Seamlessly push local code to LLMs & save generated files back in 1 click.
                </h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Eliminates tedious manual copy-pasting between your editor and browser LLMs. Safe, fast, and sandboxed inside your local workspace.
                </p>
              </div>
            </div>

            {/* Architecture Flow */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                <div className="w-8 h-8 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                  1
                </div>
                <h3 className="font-semibold text-white text-base">Local Server</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  FastAPI on <code className="text-sky-400">127.0.0.1:3387</code>. Exposes directory scanning, safe reading, and atomic writing restricted strictly to your workspace.
                </p>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800/80">
                  python backend/main.py --workspace .
                </div>
              </div>

              <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                <div className="w-8 h-8 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                  2
                </div>
                <h3 className="font-semibold text-white text-base">MV3 Extension</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Background service worker executes requests to <code className="text-sky-400">localhost:3387</code>, avoiding LLM page CSP & CORS blocks completely.
                </p>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800/80">
                  Load unpacked: /extension
                </div>
              </div>

              <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                <div className="w-8 h-8 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                  3
                </div>
                <h3 className="font-semibold text-white text-base">Smart DOM Observers</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Directly hooks into <b>Google AI Studio</b>, <b>ChatGPT</b>, and <b>Claude</b>. Injects prompt inserters and 1-click "Save to Local" buttons on code blocks.
                </p>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800/80">
                  Shortcut: Ctrl + Shift + K
                </div>
              </div>
            </div>

            {/* Supported Platforms */}
            <div className="p-5 rounded-lg bg-slate-900/80 border border-slate-800">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                Target Platforms with Built-In DOM Adapters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-950/60 rounded border border-slate-800/60">
                  <div className="text-xs font-semibold text-sky-300">Google AI Studio</div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">aistudio.google.com</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Hooks into prompt textarea & code responses. Auto-detects filename comments.
                  </div>
                </div>
                <div className="p-3 bg-slate-950/60 rounded border border-slate-800/60">
                  <div className="text-xs font-semibold text-emerald-300">ChatGPT</div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">chatgpt.com</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Injects button into prompt bar. Detects code blocks in chat turns.
                  </div>
                </div>
                <div className="p-3 bg-slate-950/60 rounded border border-slate-800/60">
                  <div className="text-xs font-semibold text-amber-300">Claude</div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">claude.ai</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Hooks contenteditable prose editor & code snippet artifacts.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PYTHON SERVER */}
        {activeTab === 'server' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Python Backend Server (`localhost:3387`)</h2>
                <p className="text-xs text-slate-400">
                  Lightweight, asynchronous FastAPI service providing strictly jailed workspace access.
                </p>
              </div>
              <button
                onClick={() => copyToClipboard('pip install -r backend/requirements.txt && python backend/main.py', 'run_cmd')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-mono text-sky-400 rounded border border-slate-700 flex items-center gap-1.5"
              >
                {copiedKey === 'run_cmd' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy Run Command
              </button>
            </div>

            {/* Security Highlights */}
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">Path Traversal & Boundary Protection</h4>
                <p className="text-xs text-slate-400 mt-1">
                  All endpoints run through <code>resolve_safe_path()</code>. Any request attempting relative jumps (e.g. <code>../../etc/passwd</code>) triggers an instant <code>403 Forbidden</code>. Sensitive files (like <code>.env</code> and SSH keys) and heavy folders (<code>node_modules</code>, <code>.git</code>) are automatically hidden.
                </p>
              </div>
            </div>

            {/* Endpoints specification */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider">REST Endpoints</h3>
              <div className="space-y-2">
                <div className="p-3 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-sky-950 text-sky-400 border border-sky-800 rounded">
                      GET
                    </span>
                    <span className="font-mono text-xs text-slate-200">/health</span>
                  </div>
                  <span className="text-xs text-slate-400">Pings server & returns current workspace folder</span>
                </div>

                <div className="p-3 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-sky-950 text-sky-400 border border-sky-800 rounded">
                      GET
                    </span>
                    <span className="font-mono text-xs text-slate-200">/files</span>
                  </div>
                  <span className="text-xs text-slate-400">Scans project directory and returns file list & metadata</span>
                </div>

                <div className="p-3 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-sky-950 text-sky-400 border border-sky-800 rounded">
                      GET
                    </span>
                    <span className="font-mono text-xs text-slate-200">/file?path=src/App.tsx</span>
                  </div>
                  <span className="text-xs text-slate-400">Reads text content safely</span>
                </div>

                <div className="p-3 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                      POST
                    </span>
                    <span className="font-mono text-xs text-slate-200">/file</span>
                  </div>
                  <span className="text-xs text-slate-400">Saves code to target file, creating directories if required</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EXTENSION */}
        {activeTab === 'extension' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Browser Extension (Manifest V3)</h2>
              <p className="text-xs text-slate-400">
                Packed with background proxying, keyboard hotkeys, and automatic DOM adapters.
              </p>
            </div>

            {/* Setup instructions */}
            <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-white">How to Load Unpacked in Chrome / Brave / Edge</h3>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
                <li>
                  Open your browser and navigate to{' '}
                  <code className="bg-slate-950 text-sky-400 px-1 py-0.5 rounded border border-slate-800">
                    chrome://extensions
                  </code>
                </li>
                <li>Enable the <b>Developer mode</b> switch located in the top-right corner.</li>
                <li>
                  Click the <b>"Load unpacked"</b> button in the top-left corner.
                </li>
                <li>
                  Select the <code className="bg-slate-950 text-sky-400 px-1 py-0.5 rounded border border-slate-800">extension/</code> directory from this project.
                </li>
                <li>
                  Open the extension popup to verify your server connection is active.
                </li>
              </ol>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900 rounded border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
                  <Zap className="w-4 h-4" />
                  Push (Local $\rightarrow$ LLM)
                </div>
                <p className="text-xs text-slate-400">
                  Hit <kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded font-mono text-[10px]">Ctrl + Shift + K</kbd> on any supported LLM page to bring up the file selector. Search, check the files you need, and insert them directly into the prompt.
                </p>
              </div>

              <div className="p-4 bg-slate-900 rounded border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <Download className="w-4 h-4" />
                  Pull (LLM $\rightarrow$ Local)
                </div>
                <p className="text-xs text-slate-400">
                  Every code block generated by the LLM receives an inline <b>"💾 Save to Local"</b> button. Filenames in comments or headers are automatically extracted for 1-click saves.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SIMULATOR / TESTBENCH */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Simulated LLM Testbench</h2>
              <p className="text-xs text-slate-400">
                Test how the bridge interacts with your local server right from this browser tab.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Push Simulation */}
              <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-sky-400 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Push Simulator (Insert to Prompt)
                  </h3>
                  <button
                    onClick={async () => {
                      if (serverStatus.status !== 'online') {
                        alert('Server not connected on localhost:3387');
                        return;
                      }
                      try {
                        const res = await fetch('http://127.0.0.1:3387/files');
                        const data = await res.json();
                        const firstFile = data.files.find((f: any) => !f.is_dir);
                        if (firstFile) {
                          const fileRes = await fetch(`http://127.0.0.1:3387/file?path=${encodeURIComponent(firstFile.path)}`);
                          const fileData = await fileRes.json();
                          setSimPrompt(prev => `${prev}\n\n### File: \`${fileData.path}\`\n\`\`\`${fileData.extension}\n${fileData.content}\n\`\`\``);
                        } else {
                          alert('No files found in workspace.');
                        }
                      } catch (e: any) {
                        alert('Error: ' + e.message);
                      }
                    }}
                    className="px-2.5 py-1 text-xs bg-sky-600 hover:bg-sky-500 text-white font-medium rounded flex items-center gap-1"
                  >
                    <span>⚡ Push Local File</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Simulates injecting selected files into an LLM prompt textarea.
                </p>
                <textarea
                  value={simPrompt}
                  onChange={(e) => setSimPrompt(e.target.value)}
                  rows={8}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-slate-200 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              {/* Pull Simulation */}
              <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Pull Simulator (Save to Disk)
                  </h3>
                  <button
                    onClick={handleSimSave}
                    disabled={simSaveStatus === 'saving'}
                    className={`px-3 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition ${
                      simSaveStatus === 'success'
                        ? 'bg-emerald-600 text-white'
                        : simSaveStatus === 'error'
                        ? 'bg-rose-600 text-white'
                        : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60'
                    }`}
                  >
                    {simSaveStatus === 'saving' ? (
                      <span>Saving...</span>
                    ) : simSaveStatus === 'success' ? (
                      <span>✓ Saved to local!</span>
                    ) : simSaveStatus === 'error' ? (
                      <span>✗ Failed (Offline?)</span>
                    ) : (
                      <span>💾 Save to src/components/Dashboard.tsx</span>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Simulates the inline code block button parsing the filepath comment and sending it to <code>localhost:3387</code>.
                </p>
                <textarea
                  value={simCode}
                  onChange={(e) => setSimCode(e.target.value)}
                  rows={8}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-400">
        Local Code-to-LLM Bridge · Built for fast, distraction-free software development
      </footer>
    </div>
  );
}
