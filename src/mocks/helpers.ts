import type { Paginated } from "@/lib/types";

export interface ListParams {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string; // "field" | "-field"
}

export function parseListParams(url: URL): ListParams {
  const sp = url.searchParams;
  return {
    q: sp.get("q") ?? undefined,
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 10,
    sort: sp.get("sort") ?? undefined,
  };
}

/** Generic list pipeline: text search → filter → sort → paginate. */
export function listPipeline<T>(
  rows: T[],
  {
    q,
    searchFields = [],
    filters = {},
    sort,
    page = 1,
    pageSize = 10,
  }: {
    q?: string;
    searchFields?: (keyof T)[];
    filters?: Record<string, string | null | undefined>;
    sort?: string;
    page?: number;
    pageSize?: number;
  }
): Paginated<T> {
  let out = [...rows];
  const get = (r: T, f: string) => (r as Record<string, unknown>)[f];

  if (q && searchFields.length) {
    const needle = q.toLowerCase();
    out = out.filter((r) =>
      searchFields.some((f) =>
        String(get(r, f as string) ?? "").toLowerCase().includes(needle)
      )
    );
  }

  for (const [key, val] of Object.entries(filters)) {
    if (val != null && val !== "" && val !== "all") {
      out = out.filter((r) => String(get(r, key)) === String(val));
    }
  }

  if (sort) {
    const desc = sort.startsWith("-");
    const field = desc ? sort.slice(1) : sort;
    out.sort((a, b) => {
      const av = get(a, field);
      const bv = get(b, field);
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number")
        return desc ? bv - av : av - bv;
      return desc
        ? String(bv).localeCompare(String(av))
        : String(av).localeCompare(String(bv));
    });
  }

  const total = out.length;
  const start = (page - 1) * pageSize;
  const rowsPage = out.slice(start, start + pageSize);
  return { rows: rowsPage, total, page, pageSize };
}
