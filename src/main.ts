import Dockerode from "dockerode";
import { handleCleanup } from "./utils";
import { ServerProcess } from "./proc";
import { servers } from "../config";
import { apiHandler } from "./api";
import serveStatic from "serve-static-bun";

const PORT = Number(process.env.PORT) || 3000;

const docker = new Dockerode({
  socketPath: "/var/run/docker.sock",
  host: "127.0.0.1",
  port: Number(process.env.DOCKER_PORT) || 4243,
});

// Serve remote api
Bun.serve({
  fetch: (req) => {
    const { pathname } = new URL(req.url);
    if (pathname.startsWith("/_api")) {
      return apiHandler(req);
    }

    return serveStatic("frontend/dist")(req);
  },
  port: PORT,
});

console.log(`Server manager served on http://localhost:${PORT}`);

const apps: ServerProcess[] = [];

// Initialize server apps
servers.forEach((config) => {
  const app = new ServerProcess(config, docker);
  apps.push(app);

  Bun.serve({
    fetch: (req) => app.handle(req),
    port: config.listenPort,
  });

  console.log(
    `${config.srvId} served on http://localhost:${config.listenPort}`
  );
});

handleCleanup(() => {
  apps.forEach((app) => app.kill());
});
