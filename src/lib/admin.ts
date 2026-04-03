import { NextRequest } from 'next/server';

const ADMIN_IP = process.env.ADMIN_TAILSCALE_IP;

function normalizeIp(ip: string): string {
  const trimmed = ip.trim();
  // Strip IPv4-mapped IPv6 prefix (e.g. "::ffff:100.66.134.1" -> "100.66.134.1")
  if (trimmed.startsWith('::ffff:')) {
    return trimmed.slice(7);
  }
  return trimmed;
}

export function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return normalizeIp(forwarded.split(',')[0]);
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return normalizeIp(realIp);
  }
  return null;
}

export function isAdmin(request: NextRequest): boolean {
  if (!ADMIN_IP) return false;
  const clientIp = getClientIp(request);
  return clientIp === ADMIN_IP;
}
