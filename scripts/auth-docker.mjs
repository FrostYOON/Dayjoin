#!/usr/bin/env node
import { spawnSync } from "node:child_process";

// Scoped to Supabase CLI 2.118's docker-create calls for this project only.
// Docker Desktop 29 did not honor the bridge host_binding_ipv4 option.
const args = process.argv.slice(2);
const name = args[args.indexOf("--name") + 1];
const containers = new Set(["supabase_db_dayjoin-auth", "supabase_kong_dayjoin-auth", "supabase_inbucket_dayjoin-auth"]);
if (args[0] === "create" && containers.has(name)) {
  for (let i = 0; i < args.length - 1; i++) {
    if (args[i] === "-p" && /^(55431|55432|55434):[0-9]+(?:\/tcp)?$/.test(args[i + 1])) {
      args[i + 1] = "127.0.0.1:" + args[i + 1];
    }
  }
}
const result = spawnSync(process.env.DAYJOIN_REAL_DOCKER, args, { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
