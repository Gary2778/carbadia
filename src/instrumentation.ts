export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.BOT_DISABLED === "1") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { startMarketBot } = await import("./lib/bot");
  startMarketBot();
}
