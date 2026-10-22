export const calls = [];
export const errors = [];
export const handlers = new Map();

export function reset() {
  calls.length = 0;
  errors.length = 0;
  handlers.clear();
}

export default {
  async get(url, config) {
    calls.push({ url, config });
    try {
      const data = handlers.has(url)
        ? await handlers.get(url)(config)
        : url === '/reports/stock-balance' ? { items: [], totalPages: 1 } : [];
      return { data };
    } catch (error) {
      if (!config?.xatoniYashirish) errors.push(error.message);
      throw error;
    }
  },
  // POST javobi `handlers`da "POST /yo'l" kaliti bilan beriladi.
  async post(url, data, config) {
    calls.push({ method: 'post', url, data, config });
    const key = `POST ${url}`;
    return { data: handlers.has(key) ? await handlers.get(key)(data, config) : {} };
  },
  // PATCH javobi "PATCH /yo'l" kaliti bilan.
  async patch(url, data, config) {
    calls.push({ method: 'patch', url, data, config });
    const key = `PATCH ${url}`;
    return { data: handlers.has(key) ? await handlers.get(key)(data, config) : {} };
  },
};

export const modifikatsiyalarApi = {
  async qidiruv() { calls.push({ url: '/catalog/search' }); return []; },
};
export const mijozlarApi = {};
export const getApiErrorMessage = error => error.message;
export const sotuvQarzdorlikSummasi = () => 0;
export const ogohlantirishBilanBajarish = action => action();
