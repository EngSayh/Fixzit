export type ConsoleRecord = {
  level: "error" | "warn" | "info";
  args: any[];
  time: number;
};
export function hijackConsole(onRecord: (rec: ConsoleRecord) => void) {
  const orig = { error: console.error, warn: console.warn, info: console.info };
  const wrap =
    (level: "error" | "warn" | "info") =>
    (...args: any[]) => {
      try {
        onRecord({ level, args, time: Date.now() });
      } catch {}
      orig[level](...args);
    };
  console.error = wrap("error");
  console.warn = wrap("warn");
  console.info = wrap("info");
  return () => {
    console.error = orig.error;
    console.warn = orig.warn;
    console.info = orig.info;
  };
}
