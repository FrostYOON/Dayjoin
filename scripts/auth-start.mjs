import { execFileSync, spawnSync } from "node:child_process";
import { accessSync, constants, copyFileSync, chmodSync, mkdtempSync, rmSync } from "node:fs";
import { delimiter, join } from "node:path";
import { tmpdir } from "node:os";

// Supabase CLI defaults to all host interfaces. Bind its dedicated Docker
// network to loopback, as recommended in the official local-development guide.
const network = "dayjoin-auth-local";
const inspected = spawnSync("docker", ["network", "inspect", network], { encoding: "utf8" });
if (inspected.status === 0) {
  const current = JSON.parse(inspected.stdout)[0];
  if (current.Options?.["com.docker.network.bridge.host_binding_ipv4"] !== "127.0.0.1") {
    throw new Error("Existing Dayjoin Auth network is not bound to loopback; no changes made");
  }
} else {
  execFileSync("docker", ["network", "create", "-o", "com.docker.network.bridge.host_binding_ipv4=127.0.0.1", network], { stdio: "ignore" });
}
const docker = process.env.PATH.split(delimiter).map((directory) => join(directory, "docker")).find((path) => {
  try { accessSync(path, constants.X_OK); return true; } catch { return false; }
});
if (!docker) throw new Error("Docker CLI not found");
const shim = mkdtempSync(join(tmpdir(), "dayjoin-auth-docker-"));
try {
  copyFileSync(new URL("./auth-docker.mjs", import.meta.url), join(shim, "docker"));
  chmodSync(join(shim, "docker"), 0o700);
  execFileSync("pnpm", ["exec", "supabase", "start", "--network-id", network, "--exclude",
    "realtime,storage-api,imgproxy,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor"],
    // Do not print the CLI success summary: it includes local signing secrets.
    { stdio: ["ignore", "ignore", "inherit"], env: { ...process.env,
      DAYJOIN_REAL_DOCKER: docker, PATH: shim + delimiter + process.env.PATH } });
} finally { rmSync(shim, { recursive: true, force: true }); }
const containers = JSON.parse(execFileSync(docker, ["inspect", "supabase_db_dayjoin-auth", "supabase_kong_dayjoin-auth", "supabase_inbucket_dayjoin-auth"], { encoding: "utf8" }));
const privateOnly = containers.every((container) => Object.values(container.NetworkSettings.Ports).every((bindings) =>
  !bindings || bindings.every((binding) => binding.HostIp === "127.0.0.1")));
if (!privateOnly) {
  execFileSync("pnpm", ["exec", "supabase", "stop"], { stdio: "ignore" });
  throw new Error("Local Auth stopped because published ports were not restricted to loopback; data volumes preserved");
}
console.log("Local Auth started on loopback only. Run pnpm auth:env to configure public project values.");
