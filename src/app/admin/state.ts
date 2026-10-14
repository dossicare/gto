/** What every admin server action returns, so forms can show errors without a page reload. */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export const done = <T = undefined>(data?: T): ActionResult<T> => ({ ok: true, data: data as T });
export const failed = (error: string): ActionResult<never> => ({ ok: false, error });

/**
 * Message safe to show: validation and conflict messages written by this app are passed through,
 * unexpected errors (network, library internals) become a generic sentence.
 */
export function messageOf(error: unknown): string {
  if (error instanceof Error && error.message && !/^(fetch failed|Cannot |Unexpected |Failed to |TypeError)/i.test(error.message)) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
