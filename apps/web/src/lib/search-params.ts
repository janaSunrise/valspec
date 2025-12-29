import { parseAsString, parseAsInteger, createSearchParamsCache } from "nuqs/server";

export const searchParams = {
  env: parseAsString,
  action: parseAsString,
  cursor: parseAsString,
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};

export const searchParamsCache = createSearchParamsCache(searchParams);
