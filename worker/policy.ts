export const allowedKinds = ["complete", "refund"] as const;
export function validRunId(id: unknown): id is string {
  return (
    typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  );
}
export function allowedOrigin(origin: string | null, url: string) {
  if (!origin) return false;
  return (
    origin === new URL(url).origin ||
    origin === "https://wonderful-meadow-00299ce00.4.azurestaticapps.net"
  );
}
export function validStart(
  body: unknown,
): body is { id: string; kind: "complete" | "refund" } {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    Object.keys(b).every((k) => k === "id" || k === "kind") &&
    validRunId(b.id) &&
    allowedKinds.includes(b.kind as "complete" | "refund")
  );
}
export async function limitedBody(request: Request, maxBytes = 1024) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.length;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Request too large");
    }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}
export function publicRun<T extends Record<string, unknown>>(row: T) {
  const { client_hash, lease_until, pending_raw, ...publicFields } = row;
  return publicFields;
}
