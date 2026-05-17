const API_BASE_URL = 'http://localhost:5000/api';

export async function fetchStats(range = 'day', userId = 'default_user') {
  const params = new URLSearchParams({ range, user_id: userId });
  const response = await fetch(`${API_BASE_URL}/stats?${params}`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  return json.data;
}

export async function postActivityLog(log) {
  const response = await fetch(`${API_BASE_URL}/activity-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(log),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
