/** Safe JSON parse for API routes that may return HTML on server errors. */
export async function parseJsonResponse<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.status >= 500
        ? "Server error — check database connection and restart dev server"
        : "Invalid response from server",
    );
  }
}
