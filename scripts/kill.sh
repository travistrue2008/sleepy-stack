#!/usr/bin/env bash

set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "Error: Please provide a port number." >&2
    echo "Usage: $0 <port_number>" >&2
    exit 1
fi

if [[ ! "$1" =~ ^[0-9]+$ ]]; then
    echo "Error: '$1' is not a valid port number." >&2
    exit 1
fi

PORT="$1"
PID=$(lsof -t -i tcp:"$PORT" 2>/dev/null || true)

if [ -z "$PID" ]; then
    echo "No process found running on port $PORT."
    exit 0
fi

echo "Found process(es) ($PID) on port $PORT. Terminating..."

if ! kill -9 "$PID" 2>/dev/null; then
    echo "Permission denied. Retrying with sudo..."
    sudo kill -9 "$PID"
fi

echo "Port $PORT is now free."
