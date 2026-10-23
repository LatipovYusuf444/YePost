export const calls = [];
export const responses = [];

export default {
  async get(url, config) {
    calls.push({ url, config });
    return { data: responses.shift() ?? {}, headers: {} };
  },
};
