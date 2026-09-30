"""
Local Code-to-LLM Bridge Backend Server
Listens on localhost:3387
Connects browser extensions (Google AI Studio, ChatGPT, Claude) to the local filesystem safely.
"""

import os
import argparse
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from security import resolve_safe_path
from file_service import get_file_tree, read_file_content, write_file_content

# Initialize FastAPI application
app = FastAPI(
    title="Local Code-to-LLM Bridge",
    description="Local filesystem server for pushing local code to LLMs & pulling generated snippets back.",
    version="1.0.0"
)

# Active workspace directory (Defaults to current working directory)
WORKSPACE_DIR: Path = Path(os.environ.get("WORKSPACE_ROOT", os.getcwd())).resolve()

# Setup CORS to allow Chrome Extension origins and local testing
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^(chrome-extension://.*|http://localhost(:\d+)?|https://aistudio\.google\.com|https://chatgpt\.com|https://claude\.ai)$",
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class WriteFileRequest(BaseModel):
    path: str = Field(..., description="Relative path of the target file inside the workspace")
    content: str = Field(..., description="Full text content of the file to save")

class SaveWithDialogRequest(BaseModel):
    content: str = Field(..., description="Content of the snippet to save")
    suggested_filename: Optional[str] = Field(default="", description="Suggested file path or name")

class SetWorkspaceRequest(BaseModel):
    workspace_path: str = Field(..., description="Absolute or relative path to set as active workspace")

@app.get("/health")
def health_check():
    """
    Heartbeat and workspace status check.
    Used by browser extension to verify localhost:3387 is active.
    """
    global WORKSPACE_DIR
    return {
        "status": "online",
        "service": "code-to-llm-bridge",
        "port": 3387,
        "workspace": str(WORKSPACE_DIR),
        "exists": WORKSPACE_DIR.exists() and WORKSPACE_DIR.is_dir()
    }

@app.get("/files")
def list_files():
    """
    Returns list of scanned project files and folders, excluding ignored/binary assets.
    """
    global WORKSPACE_DIR
    try:
        files = get_file_tree(WORKSPACE_DIR)
        return {
            "workspace": str(WORKSPACE_DIR),
            "count": len(files),
            "files": files
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scan workspace: {str(e)}")

@app.get("/file")
def get_file(path: str = Query(..., description="Relative path to file inside workspace")):
    """
    Retrieves safe text content of a file.
    """
    global WORKSPACE_DIR
    try:
        data = read_file_content(WORKSPACE_DIR, path)
        return data
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except IsADirectoryError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.post("/file")
def save_file(payload: WriteFileRequest):
    """
    Saves/overwrites file with generated code content.
    Automatically creates directories. Restricts to workspace bounds.
    """
    global WORKSPACE_DIR
    try:
        result = write_file_content(WORKSPACE_DIR, payload.path, payload.content)
        return result
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.post("/save-dialog")
def save_with_dialog(payload: SaveWithDialogRequest):
    """
    Opens native OS Save As file dialog pre-navigated to current workspace directory.
    Saves the content immediately to chosen path without requiring manual path entry.
    """
    global WORKSPACE_DIR
    try:
        from folder_picker import pick_save_file
        chosen = pick_save_file(str(WORKSPACE_DIR), payload.suggested_filename)
        if not chosen:
            return {"status": "cancelled", "saved": False}

        chosen_path = Path(chosen).resolve()
        # Ensure parent exists
        chosen_path.parent.mkdir(parents=True, exist_ok=True)
        chosen_path.write_text(payload.content, encoding="utf-8")

        # Compute relative path if within workspace
        rel_path = chosen_path.name
        try:
            rel_path = str(chosen_path.relative_to(WORKSPACE_DIR))
        except ValueError:
            pass

        return {
            "status": "success",
            "saved": True,
            "path": rel_path,
            "absolute_path": str(chosen_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file via dialog: {str(e)}")

@app.post("/workspace")
def change_workspace(payload: SetWorkspaceRequest):
    """
    Switch active workspace root folder dynamically.
    """
    global WORKSPACE_DIR
    target = Path(payload.workspace_path).expanduser().resolve()
    if not target.exists() or not target.is_dir():
        raise HTTPException(status_code=400, detail=f"Directory does not exist: {str(target)}")
    
    WORKSPACE_DIR = target
    return {
        "status": "success",
        "workspace": str(WORKSPACE_DIR)
    }

@app.post("/browse-folder")
def browse_folder():
    """
    Opens the native OS file explorer / directory picker dialog on the local host machine.
    Uses native PowerShell on Windows, AppleScript on macOS, Zenity/Tkinter on Linux.
    """
    global WORKSPACE_DIR
    try:
        from folder_picker import pick_folder
        chosen = pick_folder(str(WORKSPACE_DIR))
        if chosen:
            chosen_path = Path(chosen).resolve()
            if chosen_path.exists() and chosen_path.is_dir():
                WORKSPACE_DIR = chosen_path
                return {
                    "status": "success",
                    "workspace": str(WORKSPACE_DIR),
                    "selected": True
                }
        return {
            "status": "cancelled",
            "workspace": str(WORKSPACE_DIR),
            "selected": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not open folder dialog: {str(e)}")

def run_cli():
    import uvicorn
    parser = argparse.ArgumentParser(description="Run Local Code-to-LLM Bridge Server")
    parser.add_argument("--workspace", "-w", type=str, default=".", help="Root directory of local workspace (default: current directory)")
    parser.add_argument("--port", "-p", type=int, default=3387, help="Server port (default: 3387)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host address (default: 127.0.0.1)")
    args = parser.parse_args()

    global WORKSPACE_DIR
    target_dir = Path(args.workspace).expanduser().resolve()
    if target_dir.exists() and target_dir.is_dir():
        WORKSPACE_DIR = target_dir
    else:
        print(f"[!] Warning: Directory '{args.workspace}' not found. Using '{WORKSPACE_DIR}' instead.")

    print(f"\n=======================================================")
    print(f"🚀 Code-to-LLM Bridge Server Active")
    print(f"📡 URL:       http://{args.host}:{args.port}")
    print(f"📁 Workspace: {WORKSPACE_DIR}")
    print(f"🛡️  Security:  Restricted strictly to workspace")
    print(f"=======================================================\n")

    uvicorn.run(app, host=args.host, port=args.port)

if __name__ == "__main__":
    run_cli()
