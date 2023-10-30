import Dockerode from "dockerode";
import { handleCleanup } from "./utils";
import { ServerProcess } from "./proc";
import { config } from "../config";

const PORT = Number(process.env.PORT) || 3000;

const docker = new Dockerode({
  socketPath: "/var/run/docker.sock",
  host: "127.0.0.1",
  port: Number(process.env.DOCKER_PORT) || 4243,
});

const app = new ServerProcess(config, docker);

Bun.serve({
  fetch: (req) => app.handle(req),
  port: PORT,
});

console.log(`Server manager served on http://localhost:${PORT}`);

handleCleanup(() => {
  app.kill();
});
