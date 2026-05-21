export type BatchPortal = "admin" | "senior-teacher";

export function batchPortalFromPath(pathname: string): BatchPortal {
  return pathname.startsWith("/admin/batches") ? "admin" : "senior-teacher";
}

export function batchRoutes(portal: BatchPortal) {
  if (portal === "admin") {
    const base = "/admin/batches";
    return {
      portal,
      list: base,
      create: `${base}/new`,
      new: `${base}/new`,
      detail: (id: string) => `${base}/${id}`,
      edit: (id: string) => `${base}/${id}/edit`,
    };
  }

  const base = "/senior-teacher/batches";
  return {
    portal,
    list: base,
    create: `${base}/create`,
    new: `${base}/create`,
    detail: (id: string) => `${base}/${id}`,
    edit: (id: string) => `${base}/edit/${id}`,
  };
}

/** Map senior-teacher batch URLs to admin batch URLs when admin session is active. */
export function adminBatchPathFromSeniorPath(pathname: string): string | null {
  if (!pathname.startsWith("/senior-teacher/batches")) return null;

  if (pathname === "/senior-teacher/batches/create" || pathname === "/senior-teacher/batches/new") {
    return "/admin/batches/new";
  }

  const editMatch = pathname.match(/^\/senior-teacher\/batches\/edit\/([^/]+)$/);
  if (editMatch) return `/admin/batches/${editMatch[1]}/edit`;

  const legacyEdit = pathname.match(/^\/senior-teacher\/batches\/([^/]+)\/edit$/);
  if (legacyEdit) return `/admin/batches/${legacyEdit[1]}/edit`;

  return pathname.replace("/senior-teacher/batches", "/admin/batches");
}
