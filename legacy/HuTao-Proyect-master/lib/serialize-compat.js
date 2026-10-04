import axios from 'axios';

export async function getBuffer(url, options = {}) {
  const response = await axios({ method: 'get', url, responseType: 'arraybuffer', timeout: 30000, ...options });
  return response.data;
}
export function getCachedMeta() { return null; }
export function setCachedMeta() {}
