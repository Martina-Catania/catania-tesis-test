import { parseDeliveryMessage } from './parse-delivery';

describe('parseDeliveryMessage', () => {

    // ─── Empty / whitespace ───────────────────────────────────────────────────

    describe('empty / whitespace input', () => {
        it('returns an empty array for an empty string', () => {
            expect(parseDeliveryMessage('')).toEqual([]);
        });

        it('returns an empty array for a whitespace-only string', () => {
            expect(parseDeliveryMessage('   \n\n  ')).toEqual([]);
        });
    });

    // ─── Client name detection ────────────────────────────────────────────────

    describe('client name lines', () => {
        it('creates a client entry for a known client name', () => {
            const result = parseDeliveryMessage('Paesi\n10x20x30');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Paesi');
        });

        it('trims whitespace from lines before processing', () => {
            const result = parseDeliveryMessage('  Paesi  \n  10x20x30  ');
            expect(result[0].name).toBe('Paesi');
        });

        it('creates separate client entries for each known name line', () => {
            const result = parseDeliveryMessage('Paesi\n10x20x30\nFeller\n5x5x5');
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Paesi');
            expect(result[1].name).toBe('Feller');
        });

        it('flags lines that are not known client names as errors', () => {
            const result = parseDeliveryMessage('Paesi\n10x20x30\nSomeRandomText\n5x5x5');
            // "SomeRandomText" is malformed — flagged as error on Paesi, packages still attach to Paesi
            expect(result).toHaveLength(1);
            expect(result[0].packages).toHaveLength(2);
            expect(result[0].errors).toHaveLength(1);
            expect(result[0].errors[0].raw).toBe('SomeRandomText');
            expect(result[0].errors[0].reason).toBe('Unrecognised line (not a valid client name or package measurement)');
        });

        it('skips day-of-week lines (Spanish) without creating a client', () => {
            const result = parseDeliveryMessage('Lunes\nPaesi\n10x20x30');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Paesi');
        });

        it('skips day-of-week lines case-insensitively', () => {
            const result = parseDeliveryMessage('VIERNES\nPaesi\n10x20x30');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Paesi');
        });

        it('skips all seven Spanish day names', () => {
            const days = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
            for (const day of days) {
                const result = parseDeliveryMessage(`${day}\nPaesi\n10x20x30`);
                expect(result).toHaveLength(1);
                expect(result[0].name).not.toBe(day);
            }
        });
    });

    // ─── Package format: WxHxD ───────────────────────────────────────────────

    describe('WxHxD format (amount defaults to 1)', () => {
        it('parses a basic WxHxD line with amount 1', () => {
            const result = parseDeliveryMessage('Paesi\n10x20x30');
            expect(result[0].packages).toEqual([
                { amount: 1, width: 10, height: 20, depth: 30, ok: true, raw: '10x20x30' },
            ]);
        });

        it('stores the original line as raw', () => {
            const result = parseDeliveryMessage('Paesi\n5x15x25');
            expect(result[0].packages[0].raw).toBe('5x15x25');
        });
    });

    // ─── Package format: amountxWxHxD ───────────────────────────────────────────

    describe('amountxWxHxD format (amount prefix)', () => {
        it('parses a 4-part line as amount prefix', () => {
            const result = parseDeliveryMessage('Paesi\n2x10x20x30');
            expect(result[0].packages).toEqual([
                { amount: 2, width: 10, height: 20, depth: 30, ok: true, raw: '2x10x20x30' },
            ]);
        });

        it('stores the original line as raw', () => {
            const result = parseDeliveryMessage('Paesi\n3x5x15x25');
            expect(result[0].packages[0].raw).toBe('3x5x15x25');
        });
    });

    // ─── Package format: WxHxD amount ───────────────────────────────────────────

    describe('WxHxD amount format (amount suffix, space-separated)', () => {
        it('parses a suffix-amount line correctly', () => {
            const result = parseDeliveryMessage('Paesi\n10x20x30 4');
            expect(result[0].packages).toEqual([
                { amount: 4, width: 10, height: 20, "ok": true, depth: 30, raw: '10x20x30 4' },
            ]);
        });

        it('stores the full original line (including space and amount) as raw', () => {
            const result = parseDeliveryMessage('Paesi\n10x20x30 4');
            expect(result[0].packages[0].raw).toBe('10x20x30 4');
        });
    });

    // ─── Multiple packages per client ────────────────────────────────────────

    describe('multiple packages under one client', () => {
        it('collects all package lines under the current client', () => {
            const result = parseDeliveryMessage('Paesi\n10x20x30\n5x5x5');
            expect(result[0].packages).toHaveLength(2);
        });

        it('assigns packages to the correct client when multiple clients appear', () => {
            const input = 'Paesi\n10x20x30\nFeller\n5x5x5\n1x1x1';
            const result = parseDeliveryMessage(input);
            expect(result[0].packages).toHaveLength(1);
            expect(result[1].packages).toHaveLength(2);
        });
    });

    // ─── Malformed lines ─────────────────────────────────────────────────────

    describe('malformed package lines', () => {
        it('flags a line with too many x-separated numbers as an error', () => {
            const result = parseDeliveryMessage('Paesi\n10x0x30x99x1');
            expect(result[0].errors).toHaveLength(1);
            expect(result[0].errors[0].raw).toBe('10x0x30x99x1');
            expect(result[0].errors[0].reason).toMatch(/too many/i);
        });

        it('flags a line with 5 or more x-separated numbers as an error', () => {
            const result = parseDeliveryMessage('Paesi\n1x2x3x4x5');
            expect(result[0].errors).toHaveLength(1);
            expect(result[0].errors[0].raw).toBe('1x2x3x4x5');
        });

        it('flags a suffix-amount line with an invalid amount as an error', () => {
            const result = parseDeliveryMessage('Paesi\n10x20x30 abc');
            expect(result[0].errors).toHaveLength(1);
            expect(result[0].errors[0].raw).toBe('10x20x30 abc');
        });

        it('flags a suffix-amount line with a non-3-dimension dims part as an error', () => {
            const result = parseDeliveryMessage('Paesi\n10x20 3');
            expect(result[0].errors).toHaveLength(1);
        });

        it('flags unrecognised non-package lines as errors on the current client', () => {
            const result = parseDeliveryMessage('Paesi\nbadline');
            expect(result).toHaveLength(1);
            expect(result[0].errors).toHaveLength(1);
            expect(result[0].errors[0].raw).toBe('badline');
            expect(result[0].errors[0].reason).toBe('Unrecognised line (not a valid client name or package measurement)');
        });

        it('flags unrecognised lines before any client under (unknown)', () => {
            const result = parseDeliveryMessage('badline');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('(unknown)');
            expect(result[0].errors).toHaveLength(1);
            expect(result[0].errors[0].raw).toBe('badline');
        });

        it('accumulates multiple errors on the same client', () => {
            const result = parseDeliveryMessage('Paesi\n1x2x3x4x5\n6x7x8x9x0');
            expect(result[0].errors).toHaveLength(2);
        });

        it('keeps valid packages alongside errors on the same client', () => {
            const result = parseDeliveryMessage('Paesi\n10x20x30\n1x2x3x4x5');
            expect(result[0].packages).toHaveLength(1);
            expect(result[0].errors).toHaveLength(1);
        });
    });

    // ─── Package lines before any client name ────────────────────────────────

    describe('package lines with no preceding client name', () => {
        it('creates an (unknown) client for orphaned package lines', () => {
            const result = parseDeliveryMessage('10x20x30');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('(unknown)');
            expect(result[0].packages).toHaveLength(1);
        });

        it('creates only one (unknown) client for multiple orphaned lines', () => {
            const result = parseDeliveryMessage('10x20x30\n5x5x5');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('(unknown)');
            expect(result[0].packages).toHaveLength(2);
        });
    });

    // ─── Real-world message shape ─────────────────────────────────────────────

    describe('real-world multi-client message', () => {
        const input = [
            'Viernes',
            'Fundacion universidad',
            '2x10x20x30',
            '5x15x25',
            'Paesi',
            '10x20x30 2',
        ].join('\n');

        it('ignores the day-of-week header', () => {
            const result = parseDeliveryMessage(input);
            expect(result.every(c => c.name !== 'Viernes')).toBe(true);
        });

        it('parses both clients', () => {
            const result = parseDeliveryMessage(input);
            expect(result).toHaveLength(2);
        });

        it('assigns two packages to Fundacion universidad', () => {
            const result = parseDeliveryMessage(input);
            expect(result[0].name).toBe('Fundacion universidad');
            expect(result[0].packages).toHaveLength(2);
        });

        it('parses the amount-prefix package for Fundacion universidad correctly', () => {
            const result = parseDeliveryMessage(input);
            expect(result[0].packages[0]).toMatchObject({ amount: 2, width: 10, height: 20, depth: 30 });
        });

        it('parses the bare WxHxD package for Fundacion universidad correctly', () => {
            const result = parseDeliveryMessage(input);
            expect(result[0].packages[1]).toMatchObject({ amount: 1, width: 5, height: 15, depth: 25 });
        });

        it('assigns one package to Paesi with suffix amount', () => {
            const result = parseDeliveryMessage(input);
            expect(result[1].name).toBe('Paesi');
            expect(result[1].packages).toHaveLength(1);
            expect(result[1].packages[0]).toMatchObject({ amount: 2, width: 10, height: 20, depth: 30 });
        });

        it('produces no errors for a well-formed message', () => {
            const result = parseDeliveryMessage(input);
            expect(result.every(c => c.errors.length === 0)).toBe(true);
        });
    });
});