import { Database } from "bun:sqlite";
import path from "node:path";

const dbPath = path.join(process.cwd(), "database.db");

export const db = new Database(dbPath);
