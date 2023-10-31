import { db } from "@/db";
import { binds, where } from "@/utils";

type Params = {
  serverId?: string | null;
  page?: number;
  perPage?: number;
  date?: Date;
};

export const getRequests = async (params: Params = {}) => {
  const { serverId } = params;
  const page = params.page || 1;
  const perPage = params.perPage || 20;
  const date = params.date ? new Date(params.date) : null;

  const data: any[] = db
    .query(
      `SELECT id, method, url, status, elapsed, date, created_at
      FROM requests
      ${where(
        params?.serverId ? "server_id = $serverId" : null,
        date ? "date = $date" : null
      )}
      ORDER BY id DESC
      LIMIT $offset, $limit`
    )
    .all(
      binds({
        serverId,
        offset: (page - 1) * perPage,
        limit: perPage,
        date: date?.toISOString().substring(0, 10),
      })
    );

  return Response.json(data);
};
