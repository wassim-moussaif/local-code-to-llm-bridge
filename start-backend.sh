#!/usr/bin/env bash
# Quickstart script for Local Code-to-LLM Bridge

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/backend"

echo "=========================================="
echo "  ⚡ Starting Code-to-LLM Local Backend   "
echo "  URL: http://127.0.0.1:3387             "
echo "=========================================="

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
echo "Installing/verifying dependencies..."
pip install -q -r requirements.txt

WORKSPACE_PATH="${1:-..}"
echo "Active workspace root: $WORKSPACE_PATH"

python main.py --workspace "$WORKSPACE_PATH" --port 3387
