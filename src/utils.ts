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

export const decodeBlob = (data: ArrayBuffer, parseJson: boolean = true) => {
  const text = new TextDecoder("utf-8").decode(data);
  return parseJson ? JSON.parse(text) : text;
};
