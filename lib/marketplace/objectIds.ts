import crypto from "crypto";
import { Types } from "mongoose";

export function objectIdFrom(
  input: string | Types.ObjectId | undefined | null,
): Types.ObjectId {
  if (!input) {
    return new Types.ObjectId();
  }

  if (input instanceof Types.ObjectId) {
    return input;
  }

  if (/^[a-fA-F0-9]{24}$/.test(input)) {
    return new Types.ObjectId(input);
  }

  const digest = crypto.createHash("sha1").update(input).digest("hex");
  return new Types.ObjectId(digest.slice(0, 24));
}
