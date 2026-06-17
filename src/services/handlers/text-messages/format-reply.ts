/**
 * Formats the parsed delivery data into a WhatsApp-friendly text reply.
 * Uses *bold* and _italic_ markdown supported by WhatsApp.
 */

import { DeliveryClient } from "./types";

/**
 * Formats the parsed delivery data into a WhatsApp-friendly text reply.
 * Uses *bold* and _italic_ markdown supported by WhatsApp.
 */

export function formatDeliveryReply(clients: DeliveryClient[]): string {
  if (clients.length === 0) {
    return "No delivery data found in message.";
  }

  const lines: string[] = [];

  for (const client of clients) {
    const totalPackages = client.packages.reduce((sum, p) => sum + p.amount, 0);

    lines.push(`*${client.name}*`);

    if (client.packages.length === 0 && client.errors.length === 0) {
      lines.push('  (no packages)');
    }

    for (const pkg of client.packages) {
      const qtyLabel = pkg.amount > 1 ? `${pkg.amount}x ` : '';
      lines.push(`  ${qtyLabel}${pkg.width}x${pkg.height}x${pkg.depth}`);
    }

    if (client.errors.length > 0) {
      lines.push(`  ⚠️ ${client.errors.length} malformed line(s):`);
      for (const err of client.errors) {
        lines.push(`    "${err.raw}" — ${err.reason}`);
      }
    }

    lines.push(`  _Total packages: ${totalPackages}_`);
    lines.push('');
  }

  const grandTotal = clients.reduce(
    (sum, c) => sum + c.packages.reduce((s, p) => s + p.amount, 0),
    0
  );
  lines.push(`*Total across all clients: ${grandTotal} packages*`);

  return lines.join('\n');
}
