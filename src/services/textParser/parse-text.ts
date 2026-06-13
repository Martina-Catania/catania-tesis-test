
import { DeliveryClient, ParsedPackage } from './types';

/** Discriminated union returned by parsePackageLine */
type PackageLineOk  = { ok: true }  & Omit<ParsedPackage, 'raw'>;
type PackageLineErr = { ok: false; error: string };
type PackageLineResult = PackageLineOk | PackageLineErr;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns true if a token is purely digits-and-x (e.g. "27x8x8") */
function isPackageToken(token: string): boolean {
  return /^[\dx]+$/i.test(token) && token.includes('x');
}

function parsePackageLine(line: string): PackageLineResult {
  // Format: "WxHxD QTY" — dimensions token, space, then a plain integer quantity
  if (line.includes(' ')) {
    const spaceIdx = line.indexOf(' ');
    const dimsPart = line.slice(0, spaceIdx).trim();
    const qtyPart  = line.slice(spaceIdx + 1).trim();

    const dimsValid = isPackageToken(dimsPart);
    const qty = Number(qtyPart);
    const qtyValid = /^\d+$/.test(qtyPart) && !isNaN(qty);

    if (!dimsValid || !qtyValid) {
      return { ok: false, error: 'Invalid suffix-quantity format' };
    }

    const dims = dimsPart.split('x').map(Number);
    if (dims.length !== 3) {
      return { ok: false, error: `Suffix-qty format requires 3 dimensions, got ${dims.length}` };
    }

    const [width, height, depth] = dims;
    return { ok: true, qty, width, height, depth };
  }

  // Format: "WxHxD" or "QTYxWxHxD" — no space
  const parts = line.split('x').map(Number);
  if (parts.some(n => isNaN(n))) {
    return { ok: false, error: 'Contains non-numeric segment' };
  }

  if (parts.length === 3) {
    const [width, height, depth] = parts;
    return { ok: true, qty: 1, width, height, depth };
  }

  if (parts.length === 4) {
    const [qty, width, height, depth] = parts;
    return { ok: true, qty, width, height, depth };
  }

  return { ok: false, error: `Too many numbers (${parts.length})` };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parses a delivery message into a structured list of clients and their packages.
 *
 * Package line formats:
 *   - "WxHxD"       → 1 package of those dimensions
 *   - "QTYxWxHxD"   → QTY packages of those dimensions (qty prefix)
 *   - "WxHxD QTY"   → QTY packages of those dimensions (qty suffix)
 *   - 5+ x-separated numbers, or mismatched tokens → malformed, flagged
 *
 * Any line whose first token is not purely digits-and-x is treated as a client name.
 */
export function parseDeliveryMessage(text: string): DeliveryClient[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const clients: DeliveryClient[] = [];
  let current: DeliveryClient | null = null;

  for (const line of lines) {
    const firstToken = line.split(' ')[0];
    const isPackageLine = isPackageToken(firstToken);

		// If the line doesn't start with a package token, treat it as a client name
    if (!isPackageLine) {
			// If the line contains a day of the week, skip it
			if (/\b(Lunes|Martes|Miercoles|Jueves|Viernes|Sabado|Domingo)\b/i.test(line)) {
				continue;
			}
      current = { name: line, packages: [], errors: [] };
      clients.push(current);
      continue;
    }

    if (!current) {
      current = { name: '(unknown)', packages: [], errors: [] };
      clients.push(current);
    }

    const result = parsePackageLine(line);

    if (!result.ok) {
      current.errors.push({ raw: line, reason: result.error });
    } else {
      const { ok: _, ...pkg } = result;
      current.packages.push({ ...pkg, raw: line });
    }
  }

  return clients;
}
