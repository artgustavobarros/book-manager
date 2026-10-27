import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "@/lib/sentry";

export function register() {
  Sentry.init(sentryOptions);
}

/** Erros de Server Components, Route Handlers, Server Actions e do proxy. */
export const onRequestError = Sentry.captureRequestError;
