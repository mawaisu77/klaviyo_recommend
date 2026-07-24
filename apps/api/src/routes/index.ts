import { Router } from "express";
import { authController } from "../modules/auth/index.js";
import { dashboardController } from "../modules/dashboard/index.js";
import { healthController } from "../modules/health/index.js";
import { klaviyoController } from "../modules/klaviyo/index.js";
import { mappingsController } from "../modules/mappings/index.js";
import { returnsController } from "../modules/returns/index.js";
import { shopifyController } from "../modules/shopify/index.js";

/**
 * All JSON API routes. Webhook routes are mounted separately in app.ts because
 * they require a raw-body parser for HMAC verification.
 */
export const apiRouter = Router();

apiRouter.use("/health", healthController);
apiRouter.use("/auth", authController);
apiRouter.use("/integrations/shopify", shopifyController);
apiRouter.use("/integrations/klaviyo", klaviyoController);
apiRouter.use("/return-mappings", mappingsController);
apiRouter.use("/", returnsController);
apiRouter.use("/dashboard", dashboardController);
