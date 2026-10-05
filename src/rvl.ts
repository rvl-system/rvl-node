import { getDefaultInterface } from './net.ts';
import { startAnimationProtocol } from './protocols/animation.ts';
import { handleIdReply, startIdentityProtocol } from './protocols/identity.ts';
import { decodeInfrastructurePacket } from './protocols/infrastructure.ts';
import { bindTransport } from './transport.ts';
import { type RVLInitOptions } from './types.ts';

let initCalled = false;

function handleInfrastructurePacket(message: Buffer): void {
  const decoded = decodeInfrastructurePacket(message);
  if (decoded?.type === 'idReply') {
    handleIdReply(decoded.deviceId);
  }
}

export async function init({
  networkInterface,
}: RVLInitOptions = {}): Promise<void> {
  if (initCalled) {
    throw new Error(
      'init() has already been called. Running more than one rvl-node ' +
        'instance per host is unsupported, and one instance sends on every ' +
        'channel.'
    );
  }
  if (!networkInterface) {
    networkInterface = getDefaultInterface();
  }
  if (!networkInterface) {
    throw new Error('Could not determine a usable default network interface');
  }
  initCalled = true;
  try {
    await bindTransport(networkInterface, handleInfrastructurePacket);
  } catch (err) {
    // Nothing was left running, so the caller may try again
    initCalled = false;
    throw err;
  }
  startAnimationProtocol();
  startIdentityProtocol();
}
