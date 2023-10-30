import { getLogs } from "./api/getLogs";
import { getRequests } from "./api/getRequests";
import { getServers } from "./api/getServers";

const CORS_HEADERS: any = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const apiHandler = async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    const res = new Response("Departed", { headers: CORS_HEADERS });
    return res;
  }

  let res: Response | null = null;
  const url = new URL(req.url);
  const pathname = url.pathname.replace("/_api", "");
  const params = url.searchParams;

  const serverId = params.get("server_id");

  switch (pathname) {
    case "/logs":
      res = await getLogs(serverId);
      break;
    case "/requests":
      res = await getRequests(serverId);
      break;
    case "/servers":
      res = await getServers();
      break;
  }

  if (!res) {
    return Response.json(
      { code: "NOT_FOUND", message: "Not Found!" },
      { status: 404 }
    );
  }

  Object.keys(CORS_HEADERS).forEach((key) => {
    const value = CORS_HEADERS[key];
    res!.headers.set(key, value);
  });

  return res;
};
