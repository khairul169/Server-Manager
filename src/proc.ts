import { Subprocess } from "bun";
import Dockerode, { Container } from "dockerode";
import { isFormData, writeToFile } from "./utils";

export type ServerConfig = {
  type: "process" | "docker";
  workingDir?: string;
  startCommand?: string;
  dockerId?: string;
  port: number;
  aliveTimeout: number;
  logging?: boolean;
};

export class ServerProcess {
  config!: ServerConfig;
  docker?: Dockerode | null = null;

  proc?: Subprocess<"ignore", "pipe", "pipe"> | null;
  container?: Container | null;
  procTimeout?: Timer | null;

  constructor(config: ServerConfig, docker?: Dockerode) {
    this.config = config;
    this.docker = docker;
  }

  async handle(req: Request) {
    const { type, aliveTimeout, port } = this.config;

    if (this.procTimeout) {
      clearTimeout(this.procTimeout);
    }

    if (type === "process" && !this.proc) {
      this.startProcess();
    }
    if (type === "docker" && !this.container) {
      this.startContainer();
    }

    const url = new URL(req.url);
    const origin = url.origin;
    const proxyUrl = `http://127.0.0.1:${port}`;

    const reqContentType = req.headers.get("content-type");
    let reqBody: any;

    if (isFormData(reqContentType)) {
      reqBody = await req.formData();
    } else {
      reqBody = await req.text();
    }

    let res: Response | null = null;
    const startTime = Date.now();
    const fetchTimeout = 10000;

    const reqUrl = proxyUrl + url.pathname + url.search;
    const request = new Request(reqUrl, {
      method: req.method,
      body: reqBody,
      headers: req.headers,
    });

    while (Date.now() - startTime < fetchTimeout && !res) {
      const controller = new AbortController();
      const reqTimeout = setTimeout(() => controller.abort(), fetchTimeout);

      try {
        const response = await fetch(request, { signal: controller.signal });
        res = response;
      } catch (err) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      clearTimeout(reqTimeout);
    }

    this.procTimeout = setTimeout(() => {
      this.kill();
      this.procTimeout = null;
    }, aliveTimeout);

    if (!res) {
      res = new Response("Timeout!", { status: 400 });
    }

    const resContentType = res.headers.get("content-type");
    let resBody: any;

    if (isFormData(resContentType)) {
      resBody = await res.formData();
    } else {
      resBody = await res.text();
    }

    this.logRequest({
      request: {
        url: req.url,
        headers: req.headers,
        body: reqBody,
      },
      response: {
        url: res.url,
        headers: res.headers,
        body: resBody,
      },
      elapsed: Date.now() - startTime,
    });

    if (res.redirected) {
      const newUrl = new URL(res.url);
      const redirOrigin = newUrl.origin.includes("127.0.0.1")
        ? origin
        : newUrl.origin;
      return Response.redirect(
        redirOrigin + newUrl.pathname + newUrl.search,
        302
      );
    }

    return new Response(resBody, res);
  }

  async kill() {
    const { proc, container } = this;

    if (proc) {
      proc.kill();
    }

    if (container) {
      this.logOutput("stopping container...");
      container.stop({}, (err) => {
        if (err) {
          this.logOutput("error stopping container!");
          return;
        }
        this.container = null;
        this.logOutput("container stopped");
      });
    }
  }

  private startProcess() {
    const { workingDir, startCommand, port } = this.config;

    const handler = Bun.spawn({
      cwd: workingDir,
      cmd: startCommand?.split(" ") || [],
      env: { ...process.env, PORT: String(port) },
      stderr: "pipe",
      stdout: "pipe",
      onExit: () => {
        this.logOutput("process exit", new Date());
        this.proc = null;
      },
    });

    const loggerStream = (chunk: any) => {
      const data = new TextDecoder().decode(chunk);
      this.logOutput(data);
    };

    handler.stdout.pipeTo(new WritableStream({ write: loggerStream }));
    handler.stderr.pipeTo(new WritableStream({ write: loggerStream }));

    this.proc = handler;
    this.logOutput("Starting process...");
  }

  private async startContainer() {
    const { dockerId } = this.config;

    if (!this.docker || !dockerId) {
      throw new Error("Docker not loaded!");
    }

    try {
      const container = this.docker.getContainer(dockerId);
      this.container = container;

      const info = await container.inspect();
      if (!info.State.Running) {
        this.logOutput(`Starting container ${dockerId}...`);
        container.start();
      }

      container.logs(
        {
          stdout: true,
          stderr: true,
          follow: true,
          since: Math.floor(Date.now() / 1000),
          tail: 500,
        },
        (_err, result) => {
          if (result) {
            result.on("data", (rawData) => {
              const data = new TextDecoder().decode(rawData);
              this.logOutput(data);
            });
          }
        }
      );
    } catch (err) {}
  }

  private async logRequest(...data: any[]) {
    if (this.config.logging) {
      writeToFile("req.txt", JSON.stringify(data, null, 2));
    }
  }

  private async logOutput(...data: any[]) {
    if (this.config.logging) {
      writeToFile("log.txt", data.join(" "));
    }
  }
}
