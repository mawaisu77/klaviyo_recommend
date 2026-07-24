import express, { type Request } from "express";

/**
 * JSON parser that also retains the exact raw body bytes on `req.rawBody`.
 * Used for Shopify webhook routes so HMAC can be computed over the raw payload.
 */
export const rawBodyJson = express.json({
  verify: (req: Request, _res, buf) => {
    req.rawBody = Buffer.from(buf);
  },
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}
