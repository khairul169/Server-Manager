import { db } from "../db";

// Init database

db.query(
  `CREATE TABLE IF NOT EXISTS "servers" (
      "id" INTEGER NOT NULL UNIQUE,
      "server_id" VARCHAR(32) NOT NULL UNIQUE,
      "config" BLOB NOT NULL,
      "created_at" TEXT NOT NULL,
      "last_request_at" TEXT,
      PRIMARY KEY("id" AUTOINCREMENT)
  );`
).run();

db.query(
  `CREATE UNIQUE INDEX "servers_server_id_idx" ON servers (server_id)`
).run();

db.query(
  `CREATE TABLE IF NOT EXISTS "requests" (
      "id" INTEGER NOT NULL UNIQUE,
      "server_id" VARCHAR(32) NOT NULL,
      "method" VARCHAR(32) NOT NULL,
      "url"	TEXT NOT NULL,
      "request"	BLOB NOT NULL,
      "request_body" BLOB,
      "response" BLOB NOT NULL,
      "response_body" BLOB,
      "status" INTEGER NOT NULL,
      "elapsed" REAL NOT NULL,
      "date" TEXT NOT NULL,
      "created_at" TEXT NOT NULL,
      PRIMARY KEY("id" AUTOINCREMENT)
  );`
).run();

db.query(`CREATE INDEX "requests_server_id_idx" ON requests (server_id)`).run();
db.query(`CREATE INDEX "requests_method_idx" ON requests (method)`).run();
db.query(`CREATE INDEX "requests_status_idx" ON requests (status)`).run();
db.query(`CREATE INDEX "requests_date_idx" ON requests (date)`).run();

db.query(
  `CREATE TABLE IF NOT EXISTS "logs" (
    "id" INTEGER NOT NULL UNIQUE,
    "server_id" VARCHAR(32) NOT NULL,
    "data" TEXT NOT NULL,
    PRIMARY KEY("id" AUTOINCREMENT)
);`
).run();

db.query(`CREATE INDEX "logs_server_id_idx" ON logs (server_id)`).run();
