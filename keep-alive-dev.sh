#!/bin/bash
trap "" HUP TERM INT
while true; do
  cd /home/z/my-project
  node ./node_modules/.bin/next dev -p 3000 2>&1 | tee -a /home/z/my-project/dev.log
  echo "Server died at $(date), restarting in 5 seconds..." >> /home/z/my-project/dev.log
  sleep 5
done
