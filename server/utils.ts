/** Type-safe error extraction from catch blocks. */
export function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  return new Error(String(err));
}

/** Check if an error represents an aborted request. */
export function isAbortError(err: Error): boolean {
  return err.name === 'AbortError' || err.message === 'Aborted';
}
