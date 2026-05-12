#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting Next.js dev server..." >> /home/z/my-project/dev.log
  npx next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  echo "Server died, restarting in 3s..." >> /home/z/my-project/dev.log
  sleep 3
done
