import { createHash } from "crypto";

function encode(value: string) {
  return encodeURIComponent(value.trim()).replace(/%20/g, "+").replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function payfastSignature(fields: Record<string, string>, passphrase?: string) {
  const pairs = Object.entries(fields).filter(([key, value]) => key !== "signature" && value !== "").map(([key, value]) => `${key}=${encode(value)}`);
  if (passphrase) pairs.push(`passphrase=${encode(passphrase)}`);
  return createHash("md5").update(pairs.join("&")).digest("hex");
}