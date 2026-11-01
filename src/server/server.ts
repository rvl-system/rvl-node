import { existsSync } from 'node:fs';
import { join } from 'node:path';

import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';

const CLIENT_DIR = join(import.meta.dirname, '../client');

export async function startServer(port: number): Promise<void> {
  const server = Fastify({ logger: false });
  if (existsSync(CLIENT_DIR)) {
    await server.register(fastifyStatic, { root: CLIENT_DIR });
  } else {
    console.warn(
      `No built client at ${CLIENT_DIR}. Run npm run build, or npm run dev:client for the page`
    );
  }
  await server.listen({ port, host: '0.0.0.0' });
}
