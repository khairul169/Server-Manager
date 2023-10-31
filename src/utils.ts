/**
 * Handle process cleanup
 * @param callback
 */
export function handleCleanup(callback: () => void) {
  [
    `exit`,
    `SIGINT`,
    `SIGUSR1`,
    `SIGUSR2`,
    `uncaughtException`,
    `SIGTERM`,
  ].forEach((eventType) => {
    process.on(eventType, () => {
      callback();
      process.exit(0);
    });
  });
}

export const isFormData = (contentType?: string | null) => {
  return ["multipart/form-data", "application/x-www-form-urlencoded"].includes(
    contentType || ""
  );
};

export const isJson = (contentType?: string | null) => {
  return contentType === "application/json";
};

export const isPlainText = (contentType?: string | null) => {
  return /^application\/json|text\/[a-z]+$/i.test(contentType || "");
};

export const decodeBlob = (data: Uint8Array, parseJson = true) => {
  const res = data ? Buffer.from(data).toString("utf-8") : null;
  return res && parseJson ? JSON.parse(res) : res;
};

export const binds = (obj: object) => {
  const params: any = {};

  Object.keys(obj).forEach((key) => {
    const value = (obj as any)[key];
    if (value != null) {
      params["$" + key] = value;
    }
  });

  return params;
};

export const where = (...rules: (string | null | undefined)[]) => {
  if (!rules.length) {
    return "";
  }

  return "WHERE " + rules.filter((i) => i != null).join(" AND ");
};

export const or = (...rules: string[]) => {
  if (!rules.length) {
    return "";
  }

  return rules.filter((i) => i != null).join(" OR ");
};
