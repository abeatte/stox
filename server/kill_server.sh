#!/bin/bash
cd "$(dirname "$0")"
lsof -ti :3001 | xargs kill -15 2>/dev/null; sleep 2; lsof -ti :3001 | xargs kill -9 2>/dev/null; pkill -f 'puppeteer.*Google Chrome for Testing' 2>/dev/null; echo 'Server, and Puppeteer processes cleared'