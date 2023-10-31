import { db } from "@/db";
import { where, binds } from "@/utils";

type Params = {
  serverId?: string | null;
  date?: string | null;
};

export const getStats = async (params: Params = {}) => {
  const { serverId } = params;
  const date = params.date ? new Date(params.date) : null;

  const data: any = db
    .query(
      `SELECT
        COUNT(requests.id) AS total_requests,
        SUM(requests.elapsed) AS running_time
      FROM servers
      LEFT JOIN requests ON requests.server_id = servers.server_id
      ${where(
        serverId ? "servers.server_id = $serverId" : null,
        date ? "requests.date = $date" : null
      )}`
    )
    .get(binds({ serverId, date: date?.toISOString().substring(0, 10) }));

  return Response.json(data);
};
