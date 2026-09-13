import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import net from "node:net";
import pg from "pg";

// Native PostgreSQL, bound only to loopback. Never reads .env or a remote connection string.
const family = process.platform === "win32" ? "windows" : process.platform;
const binaries = await import(`@embedded-postgres/${family}-${process.arch}`);
const directory = await mkdtemp(join(tmpdir(), "pulmocare-db-test-"));
const password = randomBytes(32).toString("hex");
const passwordFile = join(directory, "password");
await writeFile(passwordFile, password, { mode: 0o600 });
const data = join(directory, "data");
const listener = net.createServer();
listener.listen(0, "127.0.0.1");
await once(listener, "listening");
const port = listener.address().port;
await new Promise((done) => listener.close(done));

async function command(file, args) {
  const child = spawn(file, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  const [code] = await once(child, "exit");
  if (code !== 0) throw new Error(`PostgreSQL command failed (${code}): ${output}`);
}

const config = { host: "127.0.0.1", port, user: "postgres", password, database: "postgres" };
let running = false;
let client;
try {
  await command(binaries.initdb, [
    "-D",
    data,
    "-U",
    "postgres",
    "--pwfile",
    passwordFile,
    "--auth=scram-sha-256",
    "--encoding=UTF8",
    "--locale=C",
  ]);
  await command(binaries.pg_ctl, [
    "-D",
    data,
    "-l",
    join(directory, "postgres.log"),
    "-o",
    `-h 127.0.0.1 -p ${port}`,
    "-w",
    "start",
  ]);
  running = true;
  client = new pg.Client(config);
  await client.connect();
  console.log((await client.query("select version()")).rows[0].version);
  // Only platform contracts required by migrations. Full Auth/Storage tests need Supabase CLI.
  await client.query(await readFile("tests/database/platform.sql", "utf8"));
  const files = (await readdir("supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
  if (process.argv.includes("--bundle")) {
    const sql = await readFile("supabase/install/pulmocare-inicial.sql", "utf8");
    await client.query(sql);
    console.log("Applied complete SQL Editor bundle.");
    let refused = false;
    try {
      await client.query(sql);
    } catch (error) {
      await client.query("ROLLBACK");
      if (!error.message.includes("Existing application objects")) throw error;
      refused = true;
    }
    if (!refused) throw new Error("Bundle failed to protect an existing installation");
    console.log("Repeated initial installation safely refused.");
  } else
    for (const file of files) {
      try {
        await client.query("BEGIN");
        if (process.argv.includes("--account-update") && file.startsWith("20260911000026")) {
          // The SQL Editor updater owns its transaction. Apply it to the first 25 migrations.
          await client.query("COMMIT");
          const update = await readFile("supabase/install/04-actualizar-perfiles.sql", "utf8");
          await client.query(update);
          let refused = false;
          try {
            await client.query(update);
          } catch (error) {
            await client.query("ROLLBACK");
            if (!error.message.includes("Account update already installed")) throw error;
            refused = true;
          }
          if (!refused) throw new Error("Repeated account update was not refused");
          console.log("Account upgrade applied; repeat safely refused.");
          await client.query("BEGIN");
        } else await client.query(await readFile(join("supabase/migrations", file), "utf8"));
        await client.query("COMMIT");
        console.log(`Applied ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        console.error(`Migration failed: ${file}; position ${error.position ?? "n/a"}`);
        throw error;
      }
    }
  if (process.argv.includes("--generate-types")) {
    const { generateDatabaseTypes } = await import("./generate-database-types.mjs");
    await generateDatabaseTypes(client);
  }
  const seedPath = resolve("supabase/seed.sql");
  try {
    await client.query(await readFile(seedPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (process.argv.includes("--schema-only")) {
    console.log("Schema applied successfully.");
  } else {
    const { runChecks } = await import("../tests/database/checks.mjs");
    await runChecks(client, config);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client?.end();
  if (running) await command(binaries.pg_ctl, ["-D", data, "-m", "fast", "-w", "stop"]);
  // Keep the isolated test directory for failure diagnosis. It is outside the repository.
  console.log("Local test server stopped.");
}
