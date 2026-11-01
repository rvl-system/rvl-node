#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';

import { startServer } from './server.ts';

const DEFAULT_PORT = 4980;

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: String(DEFAULT_PORT) },
    open: { type: 'boolean', default: true },
  },
  allowNegative: true,
});

const port = Number(values.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`--port must be a port number, got ${values.port}`);
  process.exit(1);
}

function getBrowserOpener(url: string): { command: string; args: string[] } {
  switch (process.platform) {
    case 'darwin':
      return { command: 'open', args: [url] };
    case 'win32':
      return { command: 'cmd', args: ['/c', 'start', '""', url] };
    default:
      return { command: 'xdg-open', args: [url] };
  }
}

function openBrowser(url: string): void {
  const { command, args } = getBrowserOpener(url);
  spawn(command, args, { detached: true, stdio: 'ignore' })
    .on('error', () => {
      console.warn(`Couldn't open a browser; open ${url} yourself`);
    })
    .unref();
}

try {
  await startServer(port);
} catch (error) {
  if (
    error instanceof Error &&
    'code' in error &&
    error.code === 'EADDRINUSE'
  ) {
    console.error(
      `Port ${port} is in use. Is another rvl-setup running? Pick another with --port`
    );
    process.exit(1);
  }
  throw error;
}

const url = `http://localhost:${port}`;
console.log(`rvl-setup is at ${url}`);
if (values.open) {
  openBrowser(url);
}
