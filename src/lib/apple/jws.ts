import "server-only";
import crypto from "node:crypto";

// Verify an Apple JWS and return its decoded payload — used for both the App
// Store Server Notification V2 signedPayload and the inner signedTransactionInfo
// / StoreKit2 jwsRepresentation.
//
// Apple signs with ES256 and puts the signing certificate chain in the JWS header
// `x5c` (base64 DER: leaf, intermediate, Apple Root CA - G3). A payload is trusted
// only after ALL of the following pass:
//   1. header.alg is ES256 and x5c has the leaf + intermediate (+ root).
//   2. every certificate is inside its validity window.
//   3. the chain links: leaf signed by intermediate, intermediate signed by the
//      PINNED Apple root — never the attacker-suppliable root in x5c.
//   4. the root shipped in x5c is byte-for-byte our pinned Apple Root CA - G3.
//   5. the ES256 signature over `header.payload` verifies under the leaf's key.
//
// Like the Whop webhook, this hand-verifies with Node's built-in crypto rather
// than pull a library — X509Certificate + ieee-p1363 ECDSA cover it. The Apple
// root is supplied via env (APPLE_ROOT_CA_G3, PEM) from Apple's certificate
// authority page; it is never bundled or fabricated, and an unset root fails
// closed.

type JwsHeader = { alg?: string; x5c?: string[] };

export type JwsResult<T> =
  | { ok: true; payload: T }
  | { ok: false; reason: string };

function decodeJson<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;
}

// The pinned root, parsed once per call from env. Returns null when unset or
// unparseable so the caller fails closed.
function pinnedAppleRoot(): crypto.X509Certificate | null {
  const pem = process.env.APPLE_ROOT_CA_G3?.trim();
  if (!pem) return null;
  try {
    return new crypto.X509Certificate(pem);
  } catch {
    return null;
  }
}

export function verifyAppleJws<T>(jws: unknown): JwsResult<T> {
  if (typeof jws !== "string" || jws.length === 0) {
    return { ok: false, reason: "empty jws" };
  }
  const parts = jws.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed jws" };
  const [headerSeg, payloadSeg, signatureSeg] = parts;

  let header: JwsHeader;
  try {
    header = decodeJson<JwsHeader>(headerSeg);
  } catch {
    return { ok: false, reason: "bad header" };
  }
  if (header.alg !== "ES256") {
    return { ok: false, reason: `unexpected alg ${header.alg ?? "none"}` };
  }
  const x5c = header.x5c;
  if (!Array.isArray(x5c) || x5c.length < 2) {
    return { ok: false, reason: "missing x5c chain" };
  }

  const root = pinnedAppleRoot();
  if (!root) return { ok: false, reason: "APPLE_ROOT_CA_G3 not configured" };

  let certs: crypto.X509Certificate[];
  try {
    certs = x5c.map((c) => new crypto.X509Certificate(Buffer.from(c, "base64")));
  } catch {
    return { ok: false, reason: "bad x5c certificate" };
  }
  const leaf = certs[0];
  const intermediate = certs[1];

  // 2. Validity window on every cert in the chain.
  const now = Date.now();
  for (const cert of certs) {
    if (now < Date.parse(cert.validFrom) || now > Date.parse(cert.validTo)) {
      return { ok: false, reason: "certificate outside its validity window" };
    }
  }

  // 4. The root shipped in x5c must BE the pinned Apple root.
  if (certs.length >= 3 && certs[2].fingerprint256 !== root.fingerprint256) {
    return { ok: false, reason: "root is not the pinned Apple Root CA - G3" };
  }
  // 3. Chain links — always against the PINNED root, not the supplied one.
  if (!intermediate.verify(root.publicKey)) {
    return { ok: false, reason: "intermediate not signed by Apple root" };
  }
  if (!leaf.verify(intermediate.publicKey)) {
    return { ok: false, reason: "leaf not signed by intermediate" };
  }

  // 5. ES256 signature over `header.payload`, JOSE raw r||s (ieee-p1363) encoding.
  let signatureValid: boolean;
  try {
    signatureValid = crypto.verify(
      "sha256",
      Buffer.from(`${headerSeg}.${payloadSeg}`),
      { key: leaf.publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(signatureSeg, "base64url"),
    );
  } catch {
    return { ok: false, reason: "signature check threw" };
  }
  if (!signatureValid) return { ok: false, reason: "signature mismatch" };

  try {
    return { ok: true, payload: decodeJson<T>(payloadSeg) };
  } catch {
    return { ok: false, reason: "bad payload" };
  }
}
