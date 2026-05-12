#!/bin/bash
# Kill any existing processes
pkill -f "next dev" 2>/dev/null
pkill -f "scraper-service" 2>/dev/null
sleep 1

# Start scraper service
cd /home/z/my-project/mini-services/scraper-service
bun index.ts &> /tmp/scraper-service.log &

# Start Next.js dev server  
cd /home/z/my-project
node ./node_modules/.bin/next dev -p 3000 &> /tmp/next-dev.log &

# Wait and verify
sleep 8
echo "Scraper health:"
curl -s http://localhost:3030/health || echo "FAILED"
echo ""
echo "Next.js status:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "FAILED"
echo ""

# Keep the script running to keep children alive
wait
