import { fileBackend } from "./contract/fileBackend";
import { mysqlBackend, mysqlConfigured } from "./contract/mysqlBackend";
import { storeContract } from "./contract/storeContract";

storeContract("file Store", fileBackend);

// Needs DB_HOST, DB_USER, DB_PASSWORD in the environment (or .env.local). Without them this half is skipped, loudly.
if (!mysqlConfigured) console.warn("MySQL Store contract tests SKIPPED: DB_HOST, DB_USER and DB_PASSWORD are not set.");
storeContract("MySQL Store", mysqlBackend, { skip: !mysqlConfigured });
