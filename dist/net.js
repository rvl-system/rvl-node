import { networkInterfaces } from 'node:os';
const VALID_INTERFACE_PREFIXES = ['en', 'eth', 'wlan', 'Wi-Fi', 'Ethernet'];
// A self-assigned 169.254 address means DHCP hasn't answered, so it counts as
// no address, the same as no link
export function isUsableAddress({ family, internal, address, }) {
    return family === 'IPv4' && !internal && !address.startsWith('169.254.');
}
export function getAvailableInterfaces() {
    const interfaces = networkInterfaces();
    const validInterfaces = [];
    for (const ifaceName in interfaces) {
        if (!(ifaceName in interfaces)) {
            continue;
        }
        let isEstimate = false;
        for (const estimate of VALID_INTERFACE_PREFIXES) {
            if (ifaceName.startsWith(estimate)) {
                isEstimate = true;
                break;
            }
        }
        const iface = interfaces[ifaceName];
        if (!iface) {
            throw new Error('Internal Error: iface is unexepctedly undefined. This is a bug');
        }
        if (!isEstimate) {
            continue;
        }
        if (iface.some(isUsableAddress)) {
            validInterfaces.push(ifaceName);
        }
    }
    return validInterfaces;
}
export function getDefaultInterface() {
    return getAvailableInterfaces()[0];
}
//# sourceMappingURL=net.js.map