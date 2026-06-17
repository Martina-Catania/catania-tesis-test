import { isMeasurement, isClientName, containsWeekday } from './utils';
import { Cliente, BultoParseado } from './types';

/** Discriminated union returned by parsePackageLine */
type PackageLineOk = { ok: true } & Omit<BultoParseado, 'raw'>;
type PackageLineErr = { ok: false; error: string };
type PackageLineResult = PackageLineOk | PackageLineErr;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSuffixQtyFormat(line: string): PackageLineResult {
    // Split the line into dimensions and cant (e.g. "27x8x8 3" → ["27x8x8", "3"])
    const [measurement, cant] = line.split(/\s+/).map(s => s.trim());
    if (!isMeasurement(measurement)) {
        return { ok: false, error: 'Invalid suffix-quantity format' };
    }
    // Validate the cant
    const cantNum = Number(cant);
    if (!/^\d+$/.test(cant) || isNaN(cantNum) || cantNum <= 0) {
        return { ok: false, error: 'Invalid suffix-quantity format' };
    }
    // Validate the dimensions
    const dims = measurement.split('x').map(Number);
    if (dims.length !== 3) {
        return { ok: false, error: `Invalid measurement format: ${measurement}` };
    }

    const vol = dims[0] * dims[1] * dims[2];
    return { ok: true, cant: cantNum, vol };
}

function parseCompactFormat(line: string): PackageLineResult {
    // Split the line by 'x' and convert to numbers
    const parts = line.split('x').map(Number);
    if (parts.some(isNaN) || parts.some(n => n <= 0)) {
        return { ok: false, error: 'Error (No es un nombre o medida valido)' };
    }
    // If there are 3 parts, cant is implicitly 1.
    if (parts.length === 3) {
        const [width, height, depth] = parts;
        const vol = width * height * depth;
        return { ok: true, cant: 1, vol };
    }

    if (parts.length === 4) {
        const [cant, width, height, depth] = parts;
        const vol = width * height * depth;
        return { ok: true, cant, vol };
    }

    return { ok: false, error: `Error (Medidas invalidas) (${parts.length})` };
}

function parsePackageLine(line: string): PackageLineResult {
    return line.includes(' ')
        ? parseSuffixQtyFormat(line)
        : parseCompactFormat(line);
}

const getOrCreateClient = (clientName: string | null, currentClient: Cliente | null, clients: Cliente[]): Cliente => {
    if (clientName) {
        // Named client - always create new
        currentClient = { name: clientName, bultos: [], err: [] };
        clients.push(currentClient);
    } else if (!currentClient) {
        // Fallback
        currentClient = { name: '(unknown)', bultos: [], err: [] };
        clients.push(currentClient);
    }
    return currentClient;
};

/**
 * Parses a delivery message into a structured list of clients and their bultos.
 *
 * Package line formats:
 *   - "WxHxD"       → 1 package of those dimensions
 *   - "QTYxWxHxD"   → QTY bultos of those dimensions (qty prefix)
 *   - "WxHxD QTY"   → QTY bultos of those dimensions (qty suffix)
 *   - 5+ x-separated numbers → malformed, flagged on the current client
 *
 * Lines are classified as:
 *   - day     → skipped silently
 *   - client  → starts a new Cliente (validated via isClientName)
 *   - package → parsed and attached to the current client
 *   - malformed → flagged as an error on the current client (or under "(unknown)" if none)
 *
 * Package lines with no preceding client are grouped under an "(unknown)" client.
 */
export function parseDeliveryMessage(text: string): Cliente[] {
    // Split the text into lines and trim whitespace
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const clients: Cliente[] = [];
    let currentClient: Cliente | null = null;

    for (const line of lines) {
        // Skip lines that look like dates (Just in case)
        if (containsWeekday(line.toLowerCase())) continue;
        // Check if the line is a client name and update currentClient accordingly
        const isClient = isClientName(line);
        currentClient = getOrCreateClient(isClient ? line : null, currentClient, clients);
        // Parse as package if not a client name
        if (!isClient) {
            const pkgResult = parsePackageLine(line);
            if (pkgResult.ok) {
                const { ok, ...bulto } = pkgResult;
                currentClient.bultos.push({ ...bulto, raw: line });
            } else {
                currentClient.err.push({ raw: line, reason: pkgResult.error });
            }
        }
    }
    return clients;
}