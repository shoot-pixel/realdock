export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("sf_token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}
