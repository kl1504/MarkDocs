export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// The admin password (if the API requires one) lives only in sessionStorage,
// so it is cleared when the tab closes and is never sent to any origin but our own API.
export const getAdminToken = () => (typeof window === 'undefined' ? null : sessionStorage.getItem('folio_admin'));
export const setAdminToken = (t) => (t ? sessionStorage.setItem('folio_admin', t) : sessionStorage.removeItem('folio_admin'));

export async function api(path, { method = 'GET', body, raw = false } = {}) {
  const token = getAdminToken();
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  if (res.status === 401) {
    setAdminToken(null);
    throw new Error('Incorrect admin password.');
  }
  if (raw) {
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed');
    return res;
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function downloadExport(id, fmt, filename) {
  const res = await api(`/docs/${id}/export.${fmt}`, { raw: true });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${fmt}`;
  a.click();
  URL.revokeObjectURL(url);
}
