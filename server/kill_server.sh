#!/bin/bash
# Gracefully stop the Stox backend (port 3001) and clean up ONLY the Chrome
# instances its Puppeteer scraper launched — matched via the unique
# `stox-puppeteer-profile` user-data-dir, so other Puppeteer / Playwright /
# Chrome-for-Testing processes on the machine are left untouched.
#
# Previous versions ran `pkill -f 'puppeteer.*Google Chrome for Testing'`,
# which killed every Puppeteer-launched Chrome system-wide.
cd "$(dirname "$0")" || exit 0
PORT=3001

# 1. SIGTERM the server first — its shutdown handler closes Chrome cleanly
#    (browser.close()), so the fallback below usually finds nothing to do.
pids=$(lsof -ti "tcp:$PORT" 2>/dev/null)
[ -n "$pids" ] && kill -TERM $pids 2>/dev/null

# 2. Wait up to ~3s for a graceful exit.
for _ in 1 2 3 4 5 6; do
  sleep 0.5
  [ -z "$(lsof -ti "tcp:$PORT" 2>/dev/null)" ] && break
done

# 3. Force-kill anything still bound to the port.
pids=$(lsof -ti "tcp:$PORT" 2>/dev/null)
[ -n "$pids" ] && kill -9 $pids 2>/dev/null

# 4. Fallback: reap any Stox Chrome orphaned by an ungraceful shutdown.
#    Scoped to our profile dir so it only ever matches this app's browser.
pkill -f 'stox-puppeteer-profile' 2>/dev/null

echo "Stox backend (port $PORT) stopped; Stox Chrome cleaned up."
