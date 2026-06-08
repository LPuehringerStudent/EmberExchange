/**
 * Lightweight ASN lookup with in-memory caching.
 *
 * Uses ipinfo.io (free tier, no token required for moderate volume).
 * Results are cached for 1 hour to avoid repeated lookups.
 *
 * Since the repo is private, the datacenter ASN list is not visible
 * to attackers — they cannot simply rent from an unlisted provider.
 */

interface CachedAsn {
    asn: number;
    org: string;
    cachedAt: number;
}

const cache = new Map<string, CachedAsn>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Known datacenter / cloud / VPS ASNs.
 *  This list is intentionally conservative — it blocks the cheap hosts
 *  that bot farms actually use, not every possible datacenter.
 *  Since the repo is private, attackers cannot read this list. */
export const DATACENTER_ASNS = new Set<number>([
    // AWS
    16509, 14618, 15169, 8987, 62785,
    // Google Cloud
    15169, 396982, 19527,
    // Microsoft Azure
    8075, 8068, 8069, 12076,
    // DigitalOcean
    14061, 62567, 200130,
    // Hetzner
    24940, 212895,
    // OVH
    16276,
    // Linode / Akamai
    63949, 32787,
    // Vultr / Choopa
    20473,
    // IBM Cloud / SoftLayer
    36351, 13884,
    // Oracle Cloud
    31898,
    // Alibaba Cloud
    45102, 45104,
    // Tencent Cloud
    45090,
    // Scaleway / Online.net
    12876,
    // Contabo
    51167,
    // LeaseWeb
    60781, 49182,
    // Hostinger
    47583, 206092, 207275,
    // Namecheap
    22612,
    // DreamHost
    26347,
    // Liquid Web
    32244,
    // Rackspace
    19994, 33070,
    // GoDaddy
    26496,
    // HostGator / Bluehost / Unified Layer
    46606, 200713, 19871,
    // SiteGround
    32475, 36351,
    // InMotion
    55293,
    // Psychz / Cloudzy / MaxKVM / VirMach
    40676,
    // BuyVM
    53667,
    // LiteServer
    60404,
    // Aruba Cloud
    31034,
    // Kamatera
    36007,
    // 1&1 / IONOS / Strato
    8560, 6724,
    // Netcup
    197540,
    // Hivelocity
    29802,
    // WebNX
    18450,
    // QuadraNet
    8100, 8100,
    // Wowrack
    23033,
    // Snel
    24785,
    // WorldStream
    49981,
    // Hostwinds
    54290,
    // Privex
    206092,
    // GalaxyGate
    40676,
    // Fastly (edge, sometimes used by bots)
    54113,
    // StackPath
    18779, 20446, 12989,
    // CDN77 / CDNetworks
    36408,
    // SharkTech
    46844,
    // ServerCentral
    23352,
    // Peer1
    13768,
    // Terremark
    23148,
    // Joyent
    16552,
    // RimuHosting
    23682,
    // GreenCloud
    40676,
]);

/** Parse ASN from ipinfo "org" string like "AS14061 DigitalOcean, LLC" */
function parseAsn(org: string): { asn: number; org: string } | null {
    const match = org.match(/^AS(\d+)\s+(.+)$/);
    if (!match) return null;
    const asn = parseInt(match[1], 10);
    if (isNaN(asn)) return null;
    return { asn, org: match[2] };
}

async function fetchAsn(ip: string): Promise<{ asn: number; org: string } | null> {
    try {
        // Skip private/reserved ranges
        if (
            ip.startsWith("10.") ||
            ip.startsWith("192.168.") ||
            ip.startsWith("127.") ||
            ip.startsWith("172.")
        ) {
            return null;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(`https://ipinfo.io/${ip}/json`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) return null;

        const data = await res.json() as { org?: string; bogon?: boolean };
        if (data.bogon || !data.org) return null;

        return parseAsn(data.org);
    } catch {
        return null;
    }
}

/**
 * Look up the ASN for an IP address.
 * Returns null for private IPs or lookup failures.
 */
export async function lookupAsn(ip: string): Promise<{ asn: number; org: string } | null> {
    const cached = cache.get(ip);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return { asn: cached.asn, org: cached.org };
    }

    const result = await fetchAsn(ip);
    if (result) {
        cache.set(ip, { ...result, cachedAt: Date.now() });
    }
    return result;
}

/**
 * Check if an IP belongs to a known datacenter ASN.
 * Returns true if datacenter, false if residential/unknown/lookup failed.
 */
export async function isDatacenterIp(ip: string): Promise<boolean> {
    const info = await lookupAsn(ip);
    if (!info) return false;
    return DATACENTER_ASNS.has(info.asn);
}
