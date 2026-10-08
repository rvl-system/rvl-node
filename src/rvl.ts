import { handleObservation, handleReference } from './clock.ts';
import { getDefaultInterface } from './net.ts';
import { startAnimationProtocol } from './protocols/animation.ts';
import {
  getDeviceId,
  handleIdReply,
  startIdentityProtocol,
} from './protocols/identity.ts';
import { decodeInfrastructurePacket } from './protocols/infrastructure.ts';
import { bindTransport, isInitialized } from './transport.ts';
import { type RVLInitOptions } from './types.ts';

// Clock sync needs no device ID: the firmware gates it on one because it files
// its own observation under it, and this node keeps its own time in its own
// slot
function handleInfrastructurePacket(
  message: Buffer,
  arrivalTime: number
): void {
  const decoded = decodeInfrastructurePacket(message, getDeviceId());
  switch (decoded?.type) {
    case 'idReply':
      handleIdReply(decoded.deviceId);
      break;
    case 'reference':
      handleReference(decoded.id, decoded.startOfSet, arrivalTime);
      break;
    case 'observation':
      handleObservation(decoded.id, decoded.source, decoded.observedTime);
      break;
    case undefined:
      break;
  }
}

// The protocols start once the port is bound, so a failed bind starts nothing
// and a retry starts them once
function startProtocols(): void {
  startAnimationProtocol();
  startIdentityProtocol();
}

export function init({ networkInterface }: RVLInitOptions = {}): void {
  if (isInitialized()) {
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
  bindTransport(networkInterface, handleInfrastructurePacket, startProtocols);
}
