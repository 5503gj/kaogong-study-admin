// 使用浏览器原生 SubtleCrypto 做 SHA-256（仅用于本地登录校验，非高安全场景）
export async function sha256(message: string): Promise<string> {
  const data = new TextEncoder().encode(message)
  const buf = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
