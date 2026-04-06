#!/bin/bash
# POS System — Stop all services
pkill -f "node dist/main.js" 2>/dev/null
pkill -f vite 2>/dev/null
echo "All POS services stopped."
