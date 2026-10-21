// src/utils/api.js
import axios from 'axios';

export function getApiBase() {
  try {
    const env = import.meta.env?.VITE_API_URL;
    let ls = localStorage.getItem('cf_api_url');
    if (ls) {
      ls = ls.replace(/^["']+|["']+$/g, '').trim();
    }
    const candidate = (env || ls || '').replace(/^["']+|["']+$/g, '').trim();
    if (
      !candidate ||
      !candidate.startsWith('http') ||
      candidate.includes(':5173')
    ) {
      return 'http://127.0.0.1:8000';
    }
    return candidate.replace(/\/$/, '');
  } catch {
    return 'http://127.0.0.1:8000';
  }
}

// ---------------- AUTH ----------------

export async function registerRequest(username, password) {
  const api = getApiBase();

  const form = new FormData();
  form.append('username', username);
  form.append('password', password);

  const res = await fetch(`${api}/auth/register`, {
    method: 'POST',
    body: form
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Register failed: ${res.status} ${t}`);
  }

  return res.json();
}

export async function loginRequest(username, password) {
  const api = getApiBase();

  const form = new FormData();
  form.append('username', username);
  form.append('password', password);

  const res = await fetch(`${api}/auth/login`, {
    method: 'POST',
    body: form
  });

  if (!res.ok) throw new Error(`Login failed ${res.status}`);

  return res.json();
}

export function setAuthToken(t) {
  if (t) localStorage.setItem('cf_token', t);
  else localStorage.removeItem('cf_token');
}

export function getAuthHeaders() {
  const t = localStorage.getItem('cf_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ---------------- PREDICT ----------------

export async function sendImage(
  file,
  { conf = 0.25, condition = 'B', simMode = 'borderline', onUploadProgress } = {}
) {
  const api = getApiBase();
  const url = `${api}/predict`;

  const form = new FormData();
  form.append('file', file);
  form.append('conf', String(conf));
  if (condition) form.append('condition', String(condition));
  if (simMode) form.append('sim_mode', String(simMode));

  const resp = await axios.post(url, form, {
    headers: { ...getAuthHeaders() },
    onUploadProgress: (ev) => {
      if (onUploadProgress) onUploadProgress(ev);
    }
  });

  return resp.data;
}

// ---------------- TELEMETRY & TRACE ----------------

export async function fetchTelemetryCurrent(condition) {
  const api = getApiBase();
  const qs = condition ? `?condition=${encodeURIComponent(condition)}` : '';
  const res = await fetch(`${api}/telemetry/current${qs}`);
  if (!res.ok) throw new Error(`Telemetry fetch failed: ${res.status}`);
  return res.json();
}

export async function updateTelemetryCondition(payload) {
  const api = getApiBase();
  const res = await fetch(`${api}/telemetry/condition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Telemetry update failed: ${res.status}`);
  return res.json();
}

export async function fetchTrace35d() {
  const api = getApiBase();
  const res = await fetch(`${api}/telemetry/trace35d`);
  if (!res.ok) throw new Error(`Trace35d fetch failed: ${res.status}`);
  return res.json();
}

// ---------------- METAHEURISTIC OPTIMIZER ----------------

export async function runOptimizerApi({
  algorithm = 'PSO',
  particles = 15,
  iterations = 20,
  mode = 'multimodal',
  condition = 'B',
  file = null
} = {}) {
  const api = getApiBase();
  const form = new FormData();
  form.append('algorithm', algorithm);
  form.append('particles', String(particles));
  form.append('iterations', String(iterations));
  form.append('mode', mode);
  form.append('condition', condition);
  if (file) form.append('file', file);

  const resp = await axios.post(`${api}/optimizer/run`, form, {
    headers: { ...getAuthHeaders() }
  });
  return resp.data;
}
