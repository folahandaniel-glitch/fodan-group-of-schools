// In-process PostgreSQL (PGlite) on localhost:5433 for local development and tests.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const db = await PGlite.create();
const server = new PGLiteSocketServer({ db, port: 5433, host: "127.0.0.1", maxConnections: 5 });
await server.start();
console.log("PGlite listening on postgres://postgres@127.0.0.1:5433/postgres");
process.on("SIGINT", async () => { await server.stop(); await db.close(); process.exit(0); });
