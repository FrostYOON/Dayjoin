import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

// Capture status in memory: its other fields contain secrets and must not be printed.
const status = JSON.parse(execFileSync("pnpm", ["exec", "supabase", "status", "-o", "json"], {
  encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
}));
const url = status.API_URL;
const key = status.PUBLISHABLE_KEY;
if (url !== "http://127.0.0.1:55431" || !key?.startsWith("sb_publishable_")) {
  throw new Error("Expected the dedicated local Dayjoin Auth project and public key");
}
const files = [
  ["apps/web/.env.local", "VITE_"], ["apps/api/.env", ""],
].map(([path, prefix]) => {
  let contents = existsSync(path) ? readFileSync(path, "utf8") : (prefix ? "" : readFileSync("apps/api/.env.example", "utf8"));
  for (const [field, value] of Object.entries({ SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: key })) {
    const name = prefix + field;
    const existing = contents.split("\n").find((line) => line.startsWith(name + "="));
    if (existing && existing !== `${name}=${value}`) throw new Error(`${path}: ${name} already configured; not overwritten`);
    if (!existing) contents += `\n${name}=${value}\n`;
  }
  return [path, contents];
});
for (const [path, contents] of files) writeFileSync(path, contents, { mode: 0o600 });
console.log("Configured local Dayjoin Auth. Public URL: " + url + "; test mailbox: http://127.0.0.1:55434");
