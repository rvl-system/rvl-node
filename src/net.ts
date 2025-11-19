import { networkInterfaces } from 'node:os';

const VALID_INTERFACE_PREFIXES = ['en', 'eth', 'wlan', 'Wi-Fi', 'Ethernet'];

export function getAvailableInterfaces(): string[] {
  const interfaces = networkInterfaces();
  const validInterfaces: string[] = [];
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
      throw new Error(
        'Internal Error: iface is unexepctedly undefined. This is a bug'
      );
    }
    if (!isEstimate) {
      continue;
    }
    const ips = iface.filter((e) => !e.internal && e.family === 'IPv4');
    if (ips.length) {
      validInterfaces.push(ifaceName);
    }
  }
  return validInterfaces;
}

export function getDefaultInterface(): string | undefined {
  return getAvailableInterfaces()[0];
}
