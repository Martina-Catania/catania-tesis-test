import { formatDeliveryReply } from './format-reply';
import { DeliveryClient } from './types';

const makeClient = (overrides: Partial<DeliveryClient> = {}): DeliveryClient => ({
    name: 'Acme',
    packages: [],
    errors: [],
    ...overrides,
});

const pkg = (width: number, height: number, depth: number, amount = 1) => ({
    width,
    height,
    depth,
    amount,
    raw: `${amount > 1 ? `${amount}x ` : ''}${width}x${height}x${depth}`,
});

describe('formatDeliveryReply', () => {
    describe('empty input', () => {
        it('returns the no-data fallback message when given an empty array', () => {
            expect(formatDeliveryReply([])).toBe('No delivery data found in message.');
        });
    });

    describe('single client — basic output structure', () => {
        it('wraps the client name in WhatsApp bold markers', () => {
            const result = formatDeliveryReply([makeClient({ name: 'Fundacion universidad' })]);
            expect(result).toMatch(/^\*Fundacion universidad\*/m);
        });

        it('wraps the per-client total in WhatsApp italic markers', () => {
            const result = formatDeliveryReply([
                makeClient({ packages: [pkg(10, 20, 30)] }),
            ]);
            expect(result).toMatch(/_Total packages: 1_/);
        });

        it('wraps the grand total in WhatsApp bold markers', () => {
            const result = formatDeliveryReply([
                makeClient({ packages: [pkg(10, 20, 30)] }),
            ]);
            expect(result).toMatch(/^\*Total across all clients: 1 packages\*$/m);
        });
    });

    describe('package line formatting', () => {
        it('omits the amount prefix when amount is 1', () => {
            const result = formatDeliveryReply([
                makeClient({ packages: [pkg(5, 15, 25, 1)] }),
            ]);
            expect(result).toMatch(/^\s+5x15x25$/m);
            expect(result).not.toMatch(/1x 5x15x25/);
        });

        it('includes the amount prefix when amount is greater than 1', () => {
            const result = formatDeliveryReply([
                makeClient({ packages: [pkg(10, 20, 30, 3)] }),
            ]);
            expect(result).toMatch(/^\s+3x 10x20x30$/m);
        });

        it('counts amount correctly in the per-client total', () => {
            const result = formatDeliveryReply([
                makeClient({ packages: [pkg(10, 20, 30, 4)] }),
            ]);
            expect(result).toMatch(/_Total packages: 4_/);
        });

        it('sums multiple packages with different quantities', () => {
            const result = formatDeliveryReply([
                makeClient({ packages: [pkg(10, 20, 30, 2), pkg(5, 5, 5, 3)] }),
            ]);
            expect(result).toMatch(/_Total packages: 5_/);
        });
    });

    describe('client with no packages and no errors', () => {
        it('shows a (no packages) placeholder line', () => {
            const result = formatDeliveryReply([makeClient()]);
            expect(result).toMatch(/^\s+\(no packages\)$/m);
        });

        it('still renders a Total packages line with 0', () => {
            const result = formatDeliveryReply([makeClient()]);
            expect(result).toMatch(/_Total packages: 0_/);
        });
    });

    describe('error lines', () => {
        const clientWithError = makeClient({
            packages: [pkg(10, 20, 30)],
            errors: [{ raw: 'badline', reason: 'unrecognised format' }],
        });

        it('shows the warning header with the error count', () => {
            const result = formatDeliveryReply([clientWithError]);
            expect(result).toMatch(/⚠️ 1 malformed line\(s\):/);
        });

        it('shows the raw value and reason for each error', () => {
            const result = formatDeliveryReply([clientWithError]);
            expect(result).toMatch(/"badline" — unrecognised format/);
        });

        it('does not show error block when there are no errors', () => {
            const result = formatDeliveryReply([
                makeClient({ packages: [pkg(10, 20, 30)] }),
            ]);
            expect(result).not.toMatch(/malformed/);
        });

        it('counts multiple errors correctly in the warning header', () => {
            const client = makeClient({
                errors: [
                    { raw: 'bad1', reason: 'reason a' },
                    { raw: 'bad2', reason: 'reason b' },
                ],
            });
            const result = formatDeliveryReply([client]);
            expect(result).toMatch(/⚠️ 2 malformed line\(s\):/);
        });
    });

    describe('multiple clients', () => {
        const clients: DeliveryClient[] = [
            makeClient({ name: 'Fundacion universidad', packages: [pkg(10, 20, 30, 2)] }),
            makeClient({ name: 'Paesi', packages: [pkg(5, 15, 25, 1)] }),
        ];

        it('renders all client names', () => {
            const result = formatDeliveryReply(clients);
            expect(result).toMatch(/\*Fundacion universidad\*/);
            expect(result).toMatch(/\*Paesi\*/);
        });

        it('renders a separate total line for each client', () => {
            const result = formatDeliveryReply(clients);
            const totalLines = [...result.matchAll(/_Total packages: \d+_/g)];
            expect(totalLines).toHaveLength(2);
        });

        it('accumulates the grand total across all clients and their quantities', () => {
            const result = formatDeliveryReply(clients);
            expect(result).toMatch(/\*Total across all clients: 3 packages\*/);
        });

        it('separates clients with a blank line', () => {
            const result = formatDeliveryReply(clients);
            expect(result).toMatch(/\n\n/);
        });
    });

    describe('grand total appears exactly once at the end', () => {
        it('has exactly one grand-total line', () => {
            const result = formatDeliveryReply([
                makeClient({ packages: [pkg(1, 2, 3)] }),
                makeClient({ packages: [pkg(4, 5, 6)] }),
            ]);
            const matches = [...result.matchAll(/\*Total across all clients:/g)];
            expect(matches).toHaveLength(1);
        });

        it('is the last line of the output', () => {
            const result = formatDeliveryReply([
                makeClient({ packages: [pkg(1, 2, 3)] }),
            ]);
            const lastLine = result.trimEnd().split('\n').at(-1);
            expect(lastLine).toMatch(/^\*Total across all clients: \d+ packages\*$/);
        });
    });
});