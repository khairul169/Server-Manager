//
export type ServerConfig = {
  srvId: string;
  type: "process" | "docker";
  workingDir?: string;
  startCommand?: string;
  dockerId?: string;
  host?: string;
  listenPort: number;
  appPort: number;
  requestTimeout?: number;
  aliveTimeout: number;
  logger?: boolean | ((data: string) => void);
};

export type RequestLog = {
  request: {
    method: string;
    url: string;
    headers: { [key: string]: string };
    body: string | FormData;
  };
  response: {
    url: string;
    headers: { [key: string]: string };
    body: string | FormData;
    redirected?: boolean;
    status: number;
    statusText: string;
  };
  elapsed: number;
};
