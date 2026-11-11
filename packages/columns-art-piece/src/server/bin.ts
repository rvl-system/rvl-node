#!/usr/bin/env node
import { networkInterfaces } from 'node:os';
import { parseArgs } from 'node:util';

import { getAvailableInterfaces, getDefaultInterface } from 'rvl-node';

import { startServer } from './server.ts';

const DEFAULT_PORT = 4980;

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: String(DEFAULT_PORT) },
    interface: { type: 'string' },
    dev: { type: 'boolean', default: false },
  },
});

const port = Number(values.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`--port must be a port number, got ${values.port}`);
  process.exit(1);
}

const usableInterfaces = getAvailableInterfaces();
const networkInterface = values.interface ?? getDefaultInterface();
if (networkInterface === undefined) {
  console.error(
    'No usable network interface: none has an IPv4 address that is not self-assigned. Join the fleet WiFi first'
  );
  process.exit(1);
}
if (!usableInterfaces.includes(networkInterface)) {
  console.error(
    `${networkInterface} is not a usable network interface. Usable: ${usableInterfaces.join(', ')}`
  );
  process.exit(1);
}

function getInterfaceAddress(name: string): string | undefined {
  return networkInterfaces()[name]?.find(
    (entry) => entry.family === 'IPv4' && !entry.address.startsWith('169.254.')
  )?.address;
}

try {
  await startServer({
    port,
    networkInterface,
    dev: values.dev,
    onFleetError: (error) => {
      console.error(error.message);
      process.exit(1);
    },
  });
} catch (error) {
  if (!(error instanceof Error)) {
    throw error;
  }
  const portInUse = 'code' in error && error.code === 'EADDRINUSE';
  console.error(
    portInUse
      ? `Port ${port} is in use. Is rvl-setup or another columns-art-piece running? Pick another with --port`
      : error.message
  );
  process.exit(1);
}

console.log(`columns-art-piece is at http://localhost:${port}`);
const address = getInterfaceAddress(networkInterface);
if (address !== undefined) {
  console.log(
    `From another device on ${networkInterface}: http://${address}:${port}`
  );
}
