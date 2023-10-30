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

export const writeToFile = async (name: string, data: string) => {
  const file = Bun.file(name);
  const isExist = await file.exists();
  let content = isExist ? await file.text() : "";
  content += "\n" + data;
  await Bun.write(file, content);
};

export const isFormData = (contentType?: string | null) => {
  return ["multipart/form-data", "application/x-www-form-urlencoded"].includes(
    contentType || ""
  );
};
