#!/bin/bash
# Splorer CLI wrapper — installed to /usr/local/bin/splorer
# Delegates to the Node.js CLI bundled with the app or runs commands directly.

APP_PATH="/Applications/Splorer.app"
CLI_SCRIPT="$APP_PATH/Contents/Resources/cli/splorer.mjs"

# If the app has a bundled CLI, use it
if [ -f "$CLI_SCRIPT" ] && command -v node &>/dev/null; then
    exec node "$CLI_SCRIPT" "$@"
fi

# Fallback: if no args or a path, open with the app
if [ $# -eq 0 ]; then
    open "$APP_PATH"
elif [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Splorer CLI"
    echo ""
    echo "Usage:"
    echo "  xplorer [folder]        Open folder in Splorer"
    echo "  xplorer login           Login to xplorer.space"
    echo "  xplorer publish         Publish extension to marketplace"
    echo "  xplorer extensions      List your published extensions"
    echo "  xplorer whoami          Show current user"
    echo "  xplorer create [name]   Create new extension"
    echo ""
    echo "Requires: Node.js (for login/publish commands)"
elif [ -d "$1" ] || [ -f "$1" ]; then
    open -a Splorer "$1"
else
    echo "Error: Node.js not found. Install Node.js for full CLI features."
    echo "For now, you can open folders: xplorer /path/to/folder"
    exit 1
fi
