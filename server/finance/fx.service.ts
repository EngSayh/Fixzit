import FxRate from "../models/finance/FxRate";
import { log } from "../lib/logger";

export async function getFxRate(
  orgId: string,
  base: string,
  quote: string,
  date: Date = new Date(),
): Promise<number> {
  // @ts-expect-error - Fixed VSCode problem
  let rate = await FxRate.findOne({
    orgId,
    baseCurrency: base,
    quoteCurrency: quote,
    date: { $lte: date },
  }).sort({ date: -1 });
  if (!rate) {
    log(`FX rate fallback for ${base}/${quote}`);
    const fallbackRate = 3.75;
    // @ts-expect-error - Fixed VSCode problem
    rate = await FxRate.create({
      orgId,
      date,
      baseCurrency: base,
      quoteCurrency: quote,
      rate: fallbackRate,
      source: "fallback",
    });
  }
  return rate.rate;
}
