import { isMeasurement, isClientName, containsWeekday } from './utils';
import { DeliveryClient, ParsedPackage } from './types';

/** Discriminated union returned by parsePackageLine */
type PackageLineOk = { ok: true } & Omit<ParsedPackage, 'raw'>;
type PackageLineErr = { ok: false; error: string };
type PackageLineResult = PackageLineOk | PackageLineErr;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSuffixQtyFormat(line: string): PackageLineResult {
    // Split the line into dimensions and amount (e.g. "27x8x8 3" → ["27x8x8", "3"])
    const [measurement, amount] = line.split(' ', 2).map(s => s.trim());
    if (!isMeasurement(measurement)) {
        return { ok: false, error: 'Invalid suffix-quantity format' };
    }
    // Validate the amount
    const amountNum = Number(amount);
    if (!/^\d+$/.test(amount) || isNaN(amountNum) || amountNum <= 0) {
        return { ok: false, error: 'Invalid suffix-quantity format' };
    }
    // Validate the dimensions
    const dims = measurement.split('x').map(Number);
    if (dims.length !== 3) {
        return { ok: false, error: `Invalid measurement format: ${measurement}` };
    }

    const [width, height, depth] = dims;
    return { ok: true, amount: amountNum, width, height, depth };
}

function parseCompactFormat(line: string): PackageLineResult {
    // Split the line by 'x' and convert to numbers
    const parts = line.split('x').map(Number);
    if (parts.some(isNaN)) {
        return { ok: false, error: 'Unrecognised line (not a valid client name or package measurement)' };
    }
    // If there are 3 parts, amount is implicitly 1.
    if (parts.length === 3) {
        const [width, height, depth] = parts;
        return { ok: true, amount: 1, width, height, depth };
    }

    if (parts.length === 4) {
        const [amount, width, height, depth] = parts;
        return { ok: true, amount, width, height, depth };
    }

    return { ok: false, error: `Too many numbers (${parts.length})` };
}

function parsePackageLine(line: string): PackageLineResult {
    return line.includes(' ')
        ? parseSuffixQtyFormat(line)
        : parseCompactFormat(line);
}

const ensureClient = (clientName: string | null, currentClient: DeliveryClient | null, clients: DeliveryClient[]): DeliveryClient => {
    if (clientName) {
        // Named client - always create new
        currentClient = { name: clientName, packages: [], errors: [] };
        clients.push(currentClient);
    } else if (!currentClient) {
        // Fallback if the first lines are packages without a client
        currentClient = { name: '(unknown)', packages: [], errors: [] };
        clients.push(currentClient);
    }
    return currentClient;
};

/**
 * Parses a delivery message into a structured list of clients and their packages.
 *
 * Package line formats:
 *   - "WxHxD"       → 1 package of those dimensions
 *   - "QTYxWxHxD"   → QTY packages of those dimensions (qty prefix)
 *   - "WxHxD QTY"   → QTY packages of those dimensions (qty suffix)
 *   - 5+ x-separated numbers → malformed, flagged on the current client
 *
 * Lines are classified as:
 *   - day     → skipped silently
 *   - client  → starts a new DeliveryClient (validated via isClientName)
 *   - package → parsed and attached to the current client
 *   - malformed → flagged as an error on the current client (or under "(unknown)" if none)
 *
 * Package lines with no preceding client are grouped under an "(unknown)" client.
 */
export function parseDeliveryMessage(text: string): DeliveryClient[] {
    // Split the text into lines and trim whitespace
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const clients: DeliveryClient[] = [];
    let currentClient: DeliveryClient | null = null;

    for (const line of lines) {
        // Skip lines that look like dates (Just in case)
        if (containsWeekday(line.toLowerCase())) continue;

        // Check if the line is a client name and update currentClient accordingly
        const isClient = isClientName(line);
        currentClient = ensureClient(isClient ? line : null, currentClient, clients);

        // Parse as package if not a client name
        if (!isClient) {
            const pkgResult = parsePackageLine(line);
            if (pkgResult.ok) {
                currentClient.packages.push({ ...pkgResult, raw: line });
            } else {
                currentClient.errors.push({ raw: line, reason: pkgResult.error });
            }
        }
    }

    return clients;
}