/**
 * Puslapiavimo / rikiavimo pagalbinės funkcijos sąrašų endpoint'ams
 *: page (numatyta 1), limit (numatyta 20, maks. 100),
 * sort formatu "laukas:asc|desc".
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Iš query parametrų grąžina { page, limit, skip }. */
export function parsePagination(query) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Iš "laukas:desc" eilutės grąžina Prisma orderBy objektą.
 * Leidžiami tik baltame sąraše nurodyti laukai (apsauga nuo netinkamų stulpelių).
 */
export function parseSort(sortParam, allowedFields, fallback) {
  if (typeof sortParam === 'string' && sortParam.includes(':')) {
    const [field, dir] = sortParam.split(':');
    if (allowedFields.includes(field)) {
      return { [field]: dir === 'asc' ? 'asc' : 'desc' };
    }
  }
  return fallback;
}

/** Suformuoja standartinį sąrašo atsaką su meta informacija. */
export function paginated(data, total, page, limit) {
  return {
    data,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
