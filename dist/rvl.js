import { handleObservation, handleReference } from "./clock.js";
import { getDefaultInterface } from "./net.js";
import { startAnimationProtocol } from "./protocols/animation.js";
import { getDeviceId, handleIdReply, startIdentityProtocol, } from "./protocols/identity.js";
import { decodeInfrastructurePacket } from "./protocols/infrastructure.js";
import { bindTransport, isInitialized } from "./transport.js";
import {} from "./types.js";
// Clock sync needs no device ID: the firmware gates it on one because it files
// its own observation under it, and this node keeps its own time in its own
// slot
function handleInfrastructurePacket(message, arrivalTime) {
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
function startProtocols() {
    startAnimationProtocol();
    startIdentityProtocol();
}
export function init({ networkInterface } = {}) {
    if (isInitialized()) {
        throw new Error('init() has already been called. Running more than one rvl-node ' +
            'instance per host is unsupported, and one instance sends on every ' +
            'channel.');
    }
    if (!networkInterface) {
        networkInterface = getDefaultInterface();
    }
    if (!networkInterface) {
        throw new Error('Could not determine a usable default network interface');
    }
    bindTransport(networkInterface, handleInfrastructurePacket, startProtocols);
}
//# sourceMappingURL=rvl.js.map