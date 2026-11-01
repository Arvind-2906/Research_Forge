/**
 * ResearchForge - Pagination & Query Helpers
 */

export function getPaginationParams(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder?.toLowerCase() === "asc" ? "asc" : "desc";

  return { page, limit, skip, sortBy, sortOrder };
}

export function formatPaginatedResponse(items, total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

