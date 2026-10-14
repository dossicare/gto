/** Reads a response body but gives up beyond `maxBytes` (protects the server from huge pages). */
export async function readLimited(response: Response, maxBytes: number): Promise<Uint8Array> {
  if (!response.body) throw new Error("Empty response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("Response exceeds supported size");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
