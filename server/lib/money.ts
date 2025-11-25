import { Types } from "mongoose";

export type MoneyMinor = { minor: bigint; currency: string };

export function minorToDecimal128(minor: bigint): Types.Decimal128 {
  return Types.Decimal128.fromString(minor.toString());
}

export function decimal128ToMinor(dec: Types.Decimal128): bigint {
  return BigInt(dec.toString());
}

export function applyFxMinor(minor: bigint, rate: number): bigint {
  return BigInt(Math.round(Number(minor) * rate));
}

export function minorToMajor(minor: bigint): string {
  const asStr = minor.toString();
  if (asStr.length <= 2) return `0.${asStr.padStart(2, "0")}`;
  return asStr.slice(0, -2) + "." + asStr.slice(-2);
}
