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
