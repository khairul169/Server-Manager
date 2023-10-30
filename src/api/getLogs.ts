import { db } from "@/db";

export const getLogs = async (serverId?: string | null) => {
  if (!serverId) {
    return Response.json(
      { message: "Please specify serverId param!" },
      { status: 400 }
    );
  }

  const data = db
    .query("SELECT * FROM logs WHERE server_id = ? LIMIT 1")
    .get(serverId);

  return Response.json(data);
};
