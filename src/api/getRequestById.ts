import { db } from "@/db";
import { decodeBlob, isPlainText } from "@/utils";

export const getRequestById = async (id: number, body?: string | null) => {
  const data: any = db.query("SELECT * FROM requests WHERE id = ?").get(id);

  const result = {
    ...data,
    request: decodeBlob(data.request),
    request_body: decodeBlob(data.request_body, false),
    response: decodeBlob(data.response),
  };

  const { response, response_body } = result;
  const contentType = response.headers["content-type"];

  if (body === "response") {
    return new Response(response_body, {
      headers: { "content-type": contentType },
    });
  }

  if (isPlainText(contentType)) {
    result.response_body = decodeBlob(response_body, false);
  } else {
    const uri = `/_api/request?id=${id}&body=response`;
    result.response_body = { uri };
  }

  return Response.json(result);
};
