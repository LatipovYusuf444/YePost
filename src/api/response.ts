export type ApiEnvelope<T> = {
  success?: boolean;
  statusCode?: number;
  data?: T;
};

export function apiData<T>(response: T | ApiEnvelope<T>) {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    (response as ApiEnvelope<T>).data !== undefined
  ) {
    return (response as ApiEnvelope<T>).data as T;
  }

  return response as T;
}

export type ApiListEnvelope<T> = ApiEnvelope<T[]> & {
  items?: T[];
  results?: T[];
  value?: T[];
};

export function apiList<T>(response: T[] | ApiListEnvelope<T>) {
  if (Array.isArray(response)) return response;

  if (response && typeof response === "object") {
    return response.data ?? response.items ?? response.results ?? response.value ?? [];
  }

  return [];
}
