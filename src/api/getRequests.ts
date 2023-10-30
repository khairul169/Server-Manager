import { db } from "@/db";
import { decodeBlob } from "@/utils";

export const getRequests = async (serverId?: string | null) => {
  const data: any[] = db
    .query(
      `SELECT * FROM requests ${
        serverId ? "WHERE server_id = $serverId" : ""
      } ORDER BY id DESC LIMIT 50`
    )
    .all({ $serverId: serverId || "" });

  const result = data.map((i) => ({
    ...i,
    request: decodeBlob(i.request),
    response: decodeBlob(i.response),
  }));
  return Response.json(result);
};
