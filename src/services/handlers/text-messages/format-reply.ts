import { Cliente } from "./types";

/**
 * Formats the parsed delivery data into a WhatsApp-friendly text reply.
 * Uses *bold* and _italic_ markdown supported by WhatsApp.
 */

export function formatDeliveryReply(clientes: Cliente[]): string {
  if (clientes.length === 0) {
    return "No se encontraron datos de entrega en el mensaje.";
  }

  const lines: string[] = [];

  for (const client of clientes) {
    const bultosTotal = client.bultos.reduce((sum, p) => sum + p.cant, 0);
    lines.push(`*${client.name}*`);
    if (client.bultos.length === 0 && client.err.length === 0) {
      lines.push('(no hay bultos)');
    }
    for (const bulto of client.bultos) {
      lines.push(`  ${bulto.cant}x ${bulto.vol}`);
    }
    if (client.err.length > 0) {
      lines.push(`  ⚠️ ${client.err.length} línea(s) mal formada(s):`);
      for (const err of client.err) {
        lines.push(`    "${err.raw}" — ${err.reason}`);
      }
    }
    lines.push(`  _Total: ${bultosTotal}_`);
    lines.push('');
  }

  const total = clientes.reduce(
    (sum, c) => sum + c.bultos.reduce((s, p) => s + p.cant, 0),
    0
  );
  lines.push(`*Total: ${total} bultos*`);
  return lines.join('\n');
}
