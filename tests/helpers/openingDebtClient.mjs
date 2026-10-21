export const calls = [];
export const responses = [];

export default {
  async get(url, config) {
    calls.push({ method: 'get', url, config });
    return { data: responses.shift() ?? {} };
  },
  async post(url, data, config) {
    calls.push({ method: 'post', url, data, config });
    return { data: responses.shift() ?? {} };
  },
};
