#!/usr/bin/env bash
# Friengineers — one-click start script
cd "$(dirname "$0")"
exec python3 run.py "$@"
