const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://nftstorage.link/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
] as const;

function safeIpfsPath(value: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value).trim();
  } catch {
    return null;
  }

  const [cid, ...segments] = decoded.split('/');
  const validCid = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z2-7]{20,})$/.test(cid ?? '');
  const validPath = segments.every((segment) => /^[a-zA-Z0-9._~-]+$/.test(segment));
  return validCid && validPath ? decoded : null;
}

export async function loadIpfsImage(path: string): Promise<Response | null> {
  const safePath = safeIpfsPath(path);
  if (!safePath) return null;

  for (const gateway of IPFS_GATEWAYS) {
    try {
      const upstream = await fetch(`${gateway}${safePath}`, {
        headers: { Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' },
        signal: AbortSignal.timeout(8_000),
      });
      const contentType = upstream.headers.get('content-type') || '';
      if (!upstream.ok || !contentType.startsWith('image/') || !upstream.body) continue;

      return new Response(upstream.body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch {
      // Try the next known IPFS gateway.
    }
  }

  return null;
}
