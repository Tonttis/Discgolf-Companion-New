// Startup wrapper for the scraper service
// Workaround: bun index.ts crashes on large HTTP responses in Bun.serve
// Running via subprocess avoids this Bun runtime bug
import { subprocess } from 'bun';

const proc = Bun.spawn(['bun', 'run', 'scraper.ts'], {
  cwd: import.meta.dir,
  stdout: 'inherit',
  stderr: 'inherit',
});

// Forward signals
process.on('SIGINT', () => { proc.kill('SIGINT'); process.exit(0); });
process.on('SIGTERM', () => { proc.kill('SIGTERM'); process.exit(0); });

// Wait for the subprocess
await proc.exited;
