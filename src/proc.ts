import { Subprocess } from "bun";
import Dockerode, { Container } from "dockerode";
import { isFormData } from "./utils";
import { RequestLog, ServerConfig } from "./types";
import { db } from "./db";

export class ServerProcess {
  config!: ServerConfig;
  docker?: Dockerode | null = null;

  proc?: Subprocess<"ignore", "pipe", "pipe"> | null;
  container?: Container | null;
  procTimeout?: Timer | null;

  constructor(config: ServerConfig, docker?: Dockerode) {
    this.config = config;
    this.docker = docker;

    const { srvId } = config;
    const isExist = db
      .query("SELECT id FROM servers WHERE server_id = ?")
      .get(srvId);

    if (!isExist) {
      db.query(
        "INSERT INTO servers (server_id, config, created_at) VALUES ($srvId, $config, $createdAt)"
      ).run({
        $srvId: srvId,
        $config: Buffer.from(JSON.stringify(config)),
        $createdAt: new Date().toISOString(),
      });
    } else {
      db.query(
        "UPDATE servers SET config = $config WHERE server_id = $srvId"
      ).run({
        $srvId: srvId,
        $config: Buffer.from(JSON.stringify(config)),
      });
    }
  }

  async handle(req: Request) {
    const { type, aliveTimeout } = this.config;

    if (this.procTimeout) {
      clearTimeout(this.procTimeout);
    }

    if (type === "process" && !this.proc) {
      this.startProcess();
    }
    if (type === "docker" && !this.container) {
      this.startContainer();
    }

    const res = await this.fetchData(req);

    this.procTimeout = setTimeout(() => {
      this.kill();
      this.procTimeout = null;
    }, aliveTimeout);

    return res;
  }

  private async fetchData(req: Request) {
    const url = new URL(req.url);
    const origin = url.origin;
    const hostname = this.config.host || "localhost";
    const proxyUrl = `http://${hostname}:${this.config.appPort}`;

    const reqContentType = req.headers.get("content-type");
    let reqBody: any;

    if (isFormData(reqContentType)) {
      reqBody = await req.formData();
    } else {
      reqBody = await req.text();
    }

    let res: Response | null = null;
    const startTime = Date.now();
    const fetchTimeout = this.config.requestTimeout || 10000;

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
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      clearTimeout(reqTimeout);
    }

    if (!res) {
      res = new Response("Request Timeout!", { status: 400 });
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
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers),
        body: reqBody,
      },
      response: {
        url: res.url,
        headers: Object.fromEntries(res.headers),
        body: resBody,
        redirected: res.redirected,
        status: res.status,
        statusText: res.statusText,
      },
      elapsed: Date.now() - startTime,
    });

    if (res.headers.get("content-encoding") === "gzip") {
      // resBody = Bun.gzipSync(Buffer.from(resBody));
      res.headers.delete("content-encoding");
    }

    if (res.redirected) {
      const newUrl = new URL(res.url);
      const redirOrigin = newUrl.origin.includes(hostname)
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
      this.log("stopping container...");
      container.stop({}, (err) => {
        if (err) {
          this.log("error stopping container!");
          return;
        }
        this.container = null;
        this.log("container stopped");
      });
    }
  }

  private startProcess() {
    const { workingDir, startCommand, appPort } = this.config;

    const handler = Bun.spawn({
      cwd: workingDir,
      cmd: startCommand?.split(" ") || [],
      env: { ...process.env, PORT: String(appPort) },
      stderr: "pipe",
      stdout: "pipe",
      onExit: () => {
        this.log("process exit", new Date());
        this.proc = null;
      },
    });

    const loggerStream = (chunk: any) => {
      const data = new TextDecoder().decode(chunk);
      this.log(data);
    };

    handler.stdout.pipeTo(new WritableStream({ write: loggerStream }));
    handler.stderr.pipeTo(new WritableStream({ write: loggerStream }));

    this.proc = handler;
    this.log("Starting process...");
  }

  private async startContainer() {
    const { dockerId, logger } = this.config;

    if (!this.docker || !dockerId) {
      throw new Error("Docker not loaded!");
    }

    try {
      const container = this.docker.getContainer(dockerId);
      this.container = container;

      const info = await container.inspect();
      if (!info.State.Running) {
        this.log(`Starting container ${dockerId}...`);
        container.start();
      }

      if (logger) {
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
                this.log(data);
              });
            }
          }
        );
      }
    } catch (err) {}
  }

  private async log(...data: any[]) {
    const { logger } = this.config;
    if (!logger) {
      return;
    }

    const content = data.map((i) => i.toString()).join(" ");

    if (typeof logger === "function") {
      logger(content);
    } else {
      console.log(content);
    }

    const existing: any = db.query("SELECT * FROM logs LIMIT 1").get();
    if (existing) {
      db.query(`UPDATE logs SET data = $data`).run({
        $data: (existing.data + "\n" + content).substring(-10240),
      });
    } else {
      db.query(
        `INSERT INTO logs (server_id, data) VALUES ($serverId, $data)`
      ).run({
        $serverId: this.config.srvId,
        $data: content,
      });
    }
  }

  private async logRequest(data: RequestLog) {
    const query = db.query(
      `INSERT INTO requests
      (server_id, method, url, request, response, status, elapsed, date, created_at)
      VALUES ($serverId, $method, $url, $req, $res, $status, $elapsed, $date, $createdAt)`
    );

    console.log("TEST123", data.response.body);

    const date = new Date().toISOString();
    const params = {
      $serverId: this.config.srvId,
      $method: data.request.method,
      $url: data.request.url,
      $req: Buffer.from(JSON.stringify(data.request)),
      $res: Buffer.from(JSON.stringify(data.response)),
      $status: data.response.status,
      $elapsed: data.elapsed / 1000,
      $date: date.substring(0, 10),
      $createdAt: date,
    };
    query.run(params);

    db.query(
      "UPDATE servers SET last_request_at = $lastRequest WHERE server_id = $srvId"
    ).run({
      $lastRequest: new Date().toISOString(),
      $srvId: this.config.srvId,
    });
  }
}
