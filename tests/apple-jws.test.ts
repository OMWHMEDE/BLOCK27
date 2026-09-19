import { describe, it, expect, beforeAll, afterEach } from "vitest";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyAppleJws } from "@/lib/apple/jws";

// Exercises the REAL verifier against a locally generated EC P-256 certificate
// chain (root -> intermediate -> leaf) that stands in for Apple's. This proves
// the crypto mechanics — x5c chain linking, the pinned-root fingerprint check,
// and ES256 (ieee-p1363) signature verification — not Apple's specific payloads.

let leafDer = "";
let intDer = "";
let rootDer = "";
let rootPem = "";
let otherRootPem = "";
let leafKeyPem = "";

function der(dir: string, crt: string): string {
  return execFileSync("openssl", ["x509", "-in", join(dir, crt), "-outform", "DER"]).toString(
    "base64",
  );
}

function makeChain(dir: string) {
  const sh = (cmd: string) => execFileSync("bash", ["-c", cmd], { cwd: dir });
  sh("openssl ecparam -name prime256v1 -genkey -noout -out root.key");
  sh('openssl req -x509 -new -key root.key -sha256 -days 3650 -subj "/CN=Test Root" -out root.crt');
  sh("openssl ecparam -name prime256v1 -genkey -noout -out int.key");
  sh('openssl req -new -key int.key -subj "/CN=Test Intermediate" -out int.csr');
  sh(
    'openssl x509 -req -in int.csr -CA root.crt -CAkey root.key -CAcreateserial -days 1825 -sha256 -extfile <(printf "basicConstraints=CA:TRUE") -out int.crt',
  );
  sh("openssl ecparam -name prime256v1 -genkey -noout -out leaf.key");
  sh('openssl req -new -key leaf.key -subj "/CN=Test Leaf" -out leaf.csr');
  sh(
    "openssl x509 -req -in leaf.csr -CA int.crt -CAkey int.key -CAcreateserial -days 825 -sha256 -out leaf.crt",
  );
}

beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), "apple-jws-"));
  makeChain(dir);
  leafDer = der(dir, "leaf.crt");
  intDer = der(dir, "int.crt");
  rootDer = der(dir, "root.crt");
  rootPem = readFileSync(join(dir, "root.crt"), "utf8");
  leafKeyPem = readFileSync(join(dir, "leaf.key"), "utf8");

  // A second, unrelated root to stand in for "wrong pinned root".
  const other = mkdtempSync(join(tmpdir(), "apple-jws-other-"));
  execFileSync("bash", ["-c", "openssl ecparam -name prime256v1 -genkey -noout -out r.key"], {
    cwd: other,
  });
  execFileSync(
    "bash",
    ["-c", 'openssl req -x509 -new -key r.key -sha256 -days 3650 -subj "/CN=Other Root" -out r.crt'],
    { cwd: other },
  );
  otherRootPem = readFileSync(join(other, "r.crt"), "utf8");
  writeFileSync(join(dir, ".keep"), ""); // touch so lints don't flag unused dir
});

afterEach(() => {
  delete process.env.APPLE_ROOT_CA_G3;
});

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function makeJws(payload: unknown, x5c: string[]): string {
  const header = { alg: "ES256", x5c };
  const signingInput = `${b64url(Buffer.from(JSON.stringify(header)))}.${b64url(
    Buffer.from(JSON.stringify(payload)),
  )}`;
  const sig = crypto.sign("sha256", Buffer.from(signingInput), {
    key: leafKeyPem,
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${b64url(sig)}`;
}

describe("verifyAppleJws", () => {
  it("accepts a valid JWS whose chain pins to the configured root", () => {
    process.env.APPLE_ROOT_CA_G3 = rootPem;
    const jws = makeJws({ hello: "world", n: 42 }, [leafDer, intDer, rootDer]);
    const res = verifyAppleJws<{ hello: string; n: number }>(jws);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.payload.hello).toBe("world");
      expect(res.payload.n).toBe(42);
    }
  });

  it("fails closed when the root is not configured", () => {
    const jws = makeJws({ hello: "world" }, [leafDer, intDer, rootDer]);
    const res = verifyAppleJws(jws);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/not configured/);
  });

  it("rejects a tampered payload", () => {
    process.env.APPLE_ROOT_CA_G3 = rootPem;
    const jws = makeJws({ hello: "world" }, [leafDer, intDer, rootDer]);
    const [h, , s] = jws.split(".");
    const forged = `${h}.${b64url(Buffer.from(JSON.stringify({ hello: "evil" })))}.${s}`;
    const res = verifyAppleJws(forged);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/signature/);
  });

  it("rejects a chain that does not pin to the configured root", () => {
    process.env.APPLE_ROOT_CA_G3 = otherRootPem;
    const jws = makeJws({ hello: "world" }, [leafDer, intDer, rootDer]);
    const res = verifyAppleJws(jws);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/root|intermediate/);
  });

  it("rejects a non-ES256 alg", () => {
    process.env.APPLE_ROOT_CA_G3 = rootPem;
    const header = b64url(Buffer.from(JSON.stringify({ alg: "none", x5c: [leafDer, intDer, rootDer] })));
    const payload = b64url(Buffer.from(JSON.stringify({ hello: "world" })));
    const res = verifyAppleJws(`${header}.${payload}.`);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/alg/);
  });
});
