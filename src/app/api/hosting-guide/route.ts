import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const guide = request.nextUrl.searchParams.get('platform');

  const windowsGuide = `# DiscGolf Companion - Windows Hosting Guide

## Prerequisites

- **Node.js 20+** or **Bun** runtime
- **Git** for cloning the repository
- A **Supabase** account (free tier works)

## Step 1: Install Prerequisites

### Option A: Using Bun (Recommended)
1. Download and install Bun from https://bun.sh
2. Open PowerShell or Command Prompt and verify:
   \`\`\`
   bun --version
   \`\`\`

### Option B: Using Node.js
1. Download Node.js 20+ from https://nodejs.org
2. Verify installation:
   \`\`\`
   node --version
   npm --version
   \`\`\`

## Step 2: Clone and Install

\`\`\`bash
git clone <your-repo-url> disc-golf-companion
cd disc-golf-companion
bun install
# OR: npm install
\`\`\`

## Step 3: Set Up Supabase

1. Go to https://supabase.com and create a free project
2. Go to **Project Settings → API**
3. Copy your **Project URL** and **anon/public key**
4. Create a \`.env.local\` file in the project root:
   \`\`\`
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   \`\`\`
5. Go to **SQL Editor** in Supabase dashboard
6. Copy the contents of \`supabase/migration.sql\` and run it
7. **Optional**: Disable email confirmation in **Authentication → Settings → Email** (turn off "Confirm email") for easier testing

## Step 4: Set Up the Database

\`\`\`bash
bun run db:push
# OR: npx prisma db push
\`\`\`

This creates the SQLite database for course data.

## Step 5: Start the Scraper Service

The scraper runs on a separate port and provides course data:

\`\`\`bash
cd mini-services/scraper-service
bun install
bun --hot index.ts
\`\`\`

The scraper will start on port 3030.

## Step 6: Start the Application

### Development Mode
\`\`\`bash
bun run dev
\`\`\`
The app will be available at http://localhost:3000

### Production Mode
\`\`\`bash
bun run build
bun run start
\`\`\`

## Step 7: Sync Course Data

Open your browser and visit:
\`\`\`
http://localhost:3000/api/sync
\`\`\`
This will scrape course data from frisbeegolfradat.fi (takes 2-5 minutes on first run).

## Running as a Windows Service (Optional)

To keep the app running after logging out, use **NSSM** (Non-Sucking Service Manager):

1. Download NSSM from https://nssm.cc
2. Install services:
   \`\`\`bash
   nssm install DiscGolfApp "C:\\\\path\\\\to\\\\bun.exe" "run start"
   nssm install DiscGolfScraper "C:\\\\path\\\\to\\\\bun.exe" "--hot index.ts"
   \`\`\`
3. Set the working directory for each service to the project folder
4. Start the services:
   \`\`\`bash
   nssm start DiscGolfApp
   nssm start DiscGolfScraper
   \`\`\`

## Firewall Configuration

If you want to access the app from other devices on your network:
1. Open **Windows Defender Firewall**
2. Add an inbound rule for port 3000 (TCP)
3. Optionally add port 3030 for the scraper

## Troubleshooting

- **"Supabase not configured"**: Make sure \`.env.local\` exists with correct values
- **Port 3000 in use**: Change the port in \`package.json\` dev script
- **Scraper not responding**: Make sure the scraper service is running on port 3030
- **Courses not loading**: Visit \`/api/sync\` to sync course data`;

  const linuxGuide = `# DiscGolf Companion - Linux Hosting Guide

## Prerequisites

- **Bun** or **Node.js 20+**
- **Git**
- A **Supabase** account (free tier works)
- **systemd** (for production service)

## Step 1: Install Bun

\`\`\`bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
\`\`\`

### Or use Node.js instead:
\`\`\`bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
\`\`\`

## Step 2: Clone and Install

\`\`\`bash
git clone <your-repo-url> disc-golf-companion
cd disc-golf-companion
bun install
\`\`\`

## Step 3: Set Up Supabase

1. Go to https://supabase.com and create a free project
2. Go to **Project Settings → API**
3. Copy your **Project URL** and **anon/public key**
4. Create \`.env.local\`:
   \`\`\`bash
   cat > .env.local << 'EOF'
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   EOF
   \`\`\`
5. Run the SQL migration in Supabase **SQL Editor**:
   \`\`\`bash
   cat supabase/migration.sql
   \`\`\`
   Copy and execute this in the Supabase SQL Editor.
6. **Optional**: Disable email confirmation in **Authentication → Settings → Email** for easier testing

## Step 4: Set Up the Database

\`\`\`bash
bun run db:push
\`\`\`

## Step 5: Start the Scraper Service

\`\`\`bash
cd mini-services/scraper-service
bun install
bun --hot index.ts &
cd ../..
\`\`\`

## Step 6: Build and Run

### Development
\`\`\`bash
bun run dev
\`\`\`

### Production
\`\`\`bash
bun run build
bun run start
\`\`\`

## Step 7: Sync Course Data

\`\`\`bash
curl http://localhost:3000/api/sync
\`\`\`

## Production Setup with systemd

### Main Application Service

Create \`/etc/systemd/system/discgolf-app.service\`:
\`\`\`ini
[Unit]
Description=DiscGolf Companion App
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/disc-golf-companion
ExecStart=/root/.bun/bin/bun run start
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
\`\`\`

### Scraper Service

Create \`/etc/systemd/system/discgolf-scraper.service\`:
\`\`\`ini
[Unit]
Description=DiscGolf Companion Scraper
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/disc-golf-companion/mini-services/scraper-service
ExecStart=/root/.bun/bin/bun --hot index.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
\`\`\`

### Enable and start:
\`\`\`bash
sudo systemctl daemon-reload
sudo systemctl enable discgolf-app discgolf-scraper
sudo systemctl start discgolf-scraper
sudo systemctl start discgolf-app
sudo systemctl status discgolf-app discgolf-scraper
\`\`\`

## Reverse Proxy with Nginx

Install Nginx:
\`\`\`bash
sudo apt install nginx
\`\`\`

Create \`/etc/nginx/sites-available/discgolf\`:
\`\`\`nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/scraper/ {
        proxy_pass http://127.0.0.1:3030/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
\`\`\`

Enable the site:
\`\`\`bash
sudo ln -s /etc/nginx/sites-available/discgolf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
\`\`\`

## SSL with Let's Encrypt

\`\`\`bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
\`\`\`

## Docker Setup (Alternative)

Create \`docker-compose.yml\`:
\`\`\`yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    restart: unless-stopped
    depends_on:
      - scraper

  scraper:
    build: ./mini-services/scraper-service
    ports:
      - "3030:3030"
    restart: unless-stopped
\`\`\`

Run:
\`\`\`bash
docker-compose up -d
\`\`\`

## Troubleshooting

- **Check logs**: \`sudo journalctl -u discgolf-app -f\`
- **Restart services**: \`sudo systemctl restart discgolf-app\`
- **"Supabase not configured"**: Verify \`.env.local\` file exists and has correct values
- **Port issues**: Check \`sudo ss -tlnp | grep -E '3000|3030'\`
- **Permission issues**: Ensure the user running the service has read/write access to the project directory and db folder`;

  if (guide === 'windows') {
    return new NextResponse(windowsGuide, {
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    });
  }

  if (guide === 'linux') {
    return new NextResponse(linuxGuide, {
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    });
  }

  // Return both guides as JSON
  return NextResponse.json({
    windows: windowsGuide,
    linux: linuxGuide,
  });
}
