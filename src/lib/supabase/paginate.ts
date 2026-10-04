/** Supabase returns at most this many rows per request by default. */
const PAGE_SIZE = 1000;

/**
 * Reads every row of a query, a page at a time. `page(from, to)` must apply
 * `.range(from, to)` to a query with a stable order (e.g. start_at, then id).
 */
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  maxRows = 50_000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}
