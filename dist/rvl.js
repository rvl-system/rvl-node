import { getDefaultInterface } from "./net.js";
import { startAnimationProtocol } from "./protocols/animation.js";
import { handleIdReply, startIdentityProtocol } from "./protocols/identity.js";
import { decodeInfrastructurePacket } from "./protocols/infrastructure.js";
import { bindTransport } from "./transport.js";
import {} from "./types.js";
let initCalled = false;
function handleInfrastructurePacket(message) {
    const decoded = decodeInfrastructurePacket(message);
    if (decoded?.type === 'idReply') {
        handleIdReply(decoded.deviceId);
    }
}
export async function init({ networkInterface, } = {}) {
    if (initCalled) {
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
    initCalled = true;
    try {
        await bindTransport(networkInterface, handleInfrastructurePacket);
    }
    catch (err) {
        // Nothing was left running, so the caller may try again
        initCalled = false;
        throw err;
    }
    startAnimationProtocol();
    startIdentityProtocol();
}
//# sourceMappingURL=rvl.js.map