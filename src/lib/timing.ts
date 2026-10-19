import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

const timings = new AsyncLocalStorage<string[]>();

/** Request-scoped measurements only; never record SQL, credentials or user data. */
export async function measure<T>(
  name: string,
  operation: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    return await operation();
  } finally {
    timings
      .getStore()
      ?.push(`${name};dur=${(performance.now() - start).toFixed(1)}`);
  }
}

export function withServerTiming<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> =>
    timings.run([], async () => {
      const response = await measure("total", () => handler(...args));
      response.headers.set("Server-Timing", timings.getStore()!.join(", "));
      return response;
    });
}
