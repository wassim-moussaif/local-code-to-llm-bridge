"""
Security utility module for the Local Code-to-LLM Bridge.
Prevents directory traversal, symlink attacks, and restricts file system
operations strictly to the designated workspace root directory.
"""

from pathlib import Path
from typing import Set

# Files and directory patterns that must always be ignored / shielded
DEFAULT_IGNORED_DIRS: Set[str] = {
    ".git",
    "node_modules",
    "venv",
    ".venv",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".turbo",
    ".idea",
    ".vscode",
}

DEFAULT_IGNORED_FILES: Set[str] = {
    ".env",
    ".env.local",
    ".env.production",
    ".DS_Store",
    "thumbs.db",
    "id_rsa",
    "id_ed25519",
}

BINARY_EXTENSIONS: Set[str] = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svgz",
    ".mp3", ".wav", ".ogg", ".mp4", ".mov", ".avi", ".mkv",
    ".zip", ".tar", ".gz", ".7z", ".rar",
    ".pdf", ".docx", ".xlsx", ".pptx",
    ".pyc", ".pyo", ".so", ".dylib", ".dll", ".exe", ".bin", ".wasm",
    ".sqlite", ".db", ".sqlite3"
}

def resolve_safe_path(base_dir: Path, requested_path: str) -> Path:
    """
    Safely resolves a path relative to the base directory.
    Raises PermissionError if path attempts to break out of base_dir.
    """
    # Normalize input
    clean_req = requested_path.strip().lstrip("/\\")
    
    # Resolve target absolute path
    base_resolved = base_dir.resolve()
    target_path = (base_resolved / clean_req).resolve()
    
    # Path traversal check
    try:
        # Python 3.9+ is_relative_to
        if not target_path.is_relative_to(base_resolved):
            raise PermissionError(f"Access denied: '{requested_path}' escapes workspace boundary.")
    except AttributeError:
        # Fallback for earlier versions
        common = Path(os.path.commonpath([str(base_resolved), str(target_path)]))
        if common != base_resolved:
            raise PermissionError(f"Access denied: '{requested_path}' escapes workspace boundary.")
            
    return target_path

def is_ignored(path: Path, base_dir: Path) -> bool:
    """
    Checks if a path should be skipped based on ignored directory or file patterns.
    """
    try:
        rel_parts = path.relative_to(base_dir).parts
    except ValueError:
        return True

    for part in rel_parts:
        if part in DEFAULT_IGNORED_DIRS:
            return True
        if part.startswith(".") and part != "." and part != "..":
            # Hidden dot directories or special config
            if part in {".git", ".venv", ".cache"}:
                return True

    if path.is_file():
        if path.name in DEFAULT_IGNORED_FILES:
            return True
        if path.suffix.lower() in BINARY_EXTENSIONS:
            return True

    return False
