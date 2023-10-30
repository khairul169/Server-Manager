import { db } from "@/db";
import { decodeBlob } from "@/utils";

export const getServers = async () => {
  const data: any[] = db
    .query(
      `SELECT servers.*, SUM(requests.elapsed) AS running_time
      FROM servers
      LEFT JOIN requests ON requests.server_id = servers.server_id
      ORDER BY last_request_at DESC
      LIMIT 100`
    )
    .all();

  const result = data.map((i) => ({
    ...i,
    config: decodeBlob(i.config),
  }));

  return Response.json(result);
};
