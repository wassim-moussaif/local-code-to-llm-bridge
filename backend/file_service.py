"""
File system scanner and tree generation utilities.
"""

from pathlib import Path
from typing import List, Dict, Any, Optional
from security import is_ignored, resolve_safe_path

def get_file_tree(base_dir: Path) -> List[Dict[str, Any]]:
    """
    Recursively scans the base_dir and returns a structured list of files/directories.
    Filters out binaries, .git, node_modules, etc.
    """
    results: List[Dict[str, Any]] = []
    
    if not base_dir.exists() or not base_dir.is_dir():
        return results

    # Recursive directory walk
    for item in sorted(base_dir.rglob("*")):
        if is_ignored(item, base_dir):
            continue
            
        try:
            rel_path = str(item.relative_to(base_dir)).replace("\\", "/")
            stat = item.stat()
            is_file = item.is_file()
            
            results.append({
                "name": item.name,
                "path": rel_path,
                "is_dir": item.is_dir(),
                "size": stat.st_size if is_file else 0,
                "mtime": stat.st_mtime,
                "extension": item.suffix.lstrip(".").lower() if is_file else "",
            })
        except Exception:
            continue
            
    return results

def read_file_content(base_dir: Path, requested_path: str) -> Dict[str, Any]:
    """
    Safely reads file text content, enforcing workspace boundary.
    """
    safe_target = resolve_safe_path(base_dir, requested_path)
    
    if not safe_target.exists():
        raise FileNotFoundError(f"File not found: {requested_path}")
        
    if safe_target.is_dir():
        raise IsADirectoryError(f"Target is a directory: {requested_path}")
        
    # Read text content safely
    try:
        content = safe_target.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        raise ValueError(f"Unable to read file as text: {str(e)}")

    stat = safe_target.stat()
    rel_path = str(safe_target.relative_to(base_dir)).replace("\\", "/")

    return {
        "path": rel_path,
        "name": safe_target.name,
        "extension": safe_target.suffix.lstrip(".").lower(),
        "size": stat.st_size,
        "content": content,
    }

def write_file_content(base_dir: Path, requested_path: str, content: str) -> Dict[str, Any]:
    """
    Safely writes or overwrites a file. Automatically creates parent directories.
    Enforces workspace boundary.
    """
    safe_target = resolve_safe_path(base_dir, requested_path)
    
    # Create parent directories if they don't exist
    safe_target.parent.mkdir(parents=True, exist_ok=True)
    
    # Write content
    safe_target.write_text(content, encoding="utf-8")
    stat = safe_target.stat()
    rel_path = str(safe_target.relative_to(base_dir)).replace("\\", "/")

    return {
        "status": "success",
        "path": rel_path,
        "bytes_written": len(content.encode("utf-8")),
        "size": stat.st_size,
    }
