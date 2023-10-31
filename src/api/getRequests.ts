import { db } from "@/db";

export const getRequests = async (serverId?: string | null) => {
  const data: any[] = db
    .query(
      `SELECT id, method, url, status, elapsed, date, created_at FROM requests ${
        serverId ? "WHERE server_id = $serverId" : ""
      } ORDER BY id DESC LIMIT 10`
    )
    .all({ $serverId: serverId || "" });

  return Response.json(data);
};
