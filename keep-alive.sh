#!/bin/bash
cd /home/z/my-project
while true; do
  if ! lsof -i :3000 > /dev/null 2>&1; then
    echo "[$(date)] Starting Next.js..." >> /home/z/my-project/dev.log
    bun run dev >> /home/z/my-project/dev.log 2>&1 &
    DEV_PID=$!
    sleep 8
    # Verify it started
    if lsof -i :3000 > /dev/null 2>&1; then
      echo "[$(date)] Next.js started on PID $DEV_PID" >> /home/z/my-project/dev.log
    else
      echo "[$(date)] Failed to start Next.js" >> /home/z/my-project/dev.log
    fi
  fi
  sleep 10
done
