/**
 * API paslaugų sluoksnis
 *
 * Tikros HTTP užklausos į backend'ą (Express + PostgreSQL).
 * Bazinis adresas imamas iš VITE_API_URL (.env).
 *
 * Token'as saugomas localStorage (raktas `rehabook_token`) ir automatiškai
 * pridedamas kaip `Authorization: Bearer <token>` antraštė per request().
 */

const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api';
const TOKEN_KEY = 'rehabook_token';
const USER_KEY = 'rehabook_user';

// ─── Token'o valdymas ───
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
};
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/** Pavėluotas ankstesnės paskyros atsakas negali perrašyti naujos paskyros vaizdo. */
export const withCurrentSession = (callback) => {
  const startedWith = getToken();
  return (...args) => {
    if (startedWith === getToken()) return callback(...args);
  };
};

// ─── Naudotojo (sesijos) valdymas ───
export const setUser = (user) => {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
};
export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
};
export const clearUser = () => localStorage.removeItem(USER_KEY);

/** Visiškai išvalo sesiją (token + naudotojas). */
export const clearSession = () => {
  clearToken();
  clearUser();
};

/** Grąžina išsaugotą sesiją po perkrovimo arba null. */
export const getStoredSession = () => {
  const token = getToken();
  const user = getUser();
  if (!token || !user) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp || payload.exp * 1000 <= Date.now()) {
      clearSession();
      return null;
    }
  } catch {
    clearSession();
    return null;
  }
  return { token, user };
};

/**
 * Bendra užklausos funkcija.
 * @param {string} path - kelias po /api, pvz. "/visits"
 * @param {Object} [options] - { method, body, auth }
 * @returns {Promise<any>}
 * @throws {Error} su serverio pranešimu, jei atsakas nesėkmingas
 */
async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = getToken();
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Nepavyko pasiekti serverio. Patikrinkite ryšį.');
  }

  // Bandome perskaityti JSON (gali būti tuščias atsakas)
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    // 401 autorizuotai užklausai = token nebegalioja -> išvalome sesiją
    if (res.status === 401 && auth && token && token === getToken()) {
      const role = getUser()?.role;
      clearSession();
      window.dispatchEvent(new CustomEvent('rehabook-session-ended', { detail: { role } }));
    }
    const message = (data && data.error) || `Klaida (${res.status}).`;
    const err = new Error(message);
    err.status = res.status;
    err.details = data && data.details;
    throw err;
  }

  return data;
}

/** Sukuria query string iš objekto (praleidžia tuščias reikšmes). */
function toQuery(params = {}) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

// ─── Autentifikacija ───
export const authService = {
  loginPatient: async (email, password) => {
    const data = await request('/auth/patient/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    setToken(data.token);
    setUser(data.user);
    return data; // { token, user }
  },

  registerPatient: async (payload) => {
    const data = await request('/auth/patient/register', {
      method: 'POST',
      body: payload,
      auth: false,
    });
    setToken(data.token);
    setUser(data.user);
    return data; // { token, user }
  },

  loginSpecialist: async (email, password, license) => {
    const data = await request('/auth/specialist/login', {
      method: 'POST',
      body: { email, password, license },
      auth: false,
    });
    setToken(data.token);
    setUser(data.user);
    return data; // { token, user }
  },

  loginAdmin: async (email, password) => {
    const data = await request('/auth/admin/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    setToken(data.token);
    setUser(data.user);
    return data; // { token, user }
  },

  requestPasswordReset: async (email, role = 'patient') => {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: { email, role },
      auth: false,
    });
  },

  resetPassword: async (payload) =>
    request('/auth/reset-password', { method: 'POST', body: payload, auth: false }),

  changeSpecialistPassword: async ({ license, currentPassword, newPassword }) => {
    const data = await request('/auth/specialist/change-password', {
      method: 'POST',
      body: { license, currentPassword, newPassword },
    });
    if (data.token) setToken(data.token);
    return data;
  },

  logout: () => clearSession(),
};

// ─── Paslaugos ───
export const serviceService = {
  // Viešas sąrašas — tik aktyvios paslaugos
  getAll: async () => request('/services', { auth: false }),
  // Admin sąrašas — visos paslaugos su vizitų skaičiumi (visitCount) ir aktyvumu
  getAdmin: async () => request('/services/admin'),

  create: async (data) => request('/services', { method: 'POST', body: data }),

  update: async (id, data) => request(`/services/${id}`, { method: 'PUT', body: data }),

  remove: async (id) => request(`/services/${id}`, { method: 'DELETE' }),

  toggle: async (id) => request(`/services/${id}/toggle`, { method: 'PATCH' }),
};

// ─── Vizitai ───
export const visitService = {
  // Admin sąrašas su puslapiavimu/filtrais; grąžina { data, page, limit, total, totalPages }
  getAll: async (params = {}) => request(`/visits${toQuery(params)}`),

  getByPatient: async (patientId) => request(`/visits/patient/${patientId}`),

  getBySpecialist: async (specialistId) => request(`/visits/specialist/${specialistId}`),

  // Dienos laikų lentelė (slots, taken, own, available). Maršrutas viešas, bet su
  // prisijungusio paciento token serveris papildomai pažymi jo paties vizitų laikus (own).
  getAvailability: async (specialistId, date, serviceId) =>
    request(`/visits/availability${toQuery({ specialistId, date, serviceId })}`),

  create: async (visitData) => request('/visits', { method: 'POST', body: visitData }),

  cancel: async (visitId, reason) =>
    request(`/visits/${visitId}/cancel`, { method: 'PATCH', body: { reason } }),

  update: async (id, data) => request(`/visits/${id}`, { method: 'PATCH', body: data }),
};

// ─── Specialistai ───
export const specialistService = {
  getAll: async () => request('/specialists', { auth: false }),
  getAdmin: async () => request('/specialists/admin'),

  create: async (data) => request('/specialists', { method: 'POST', body: data }),

  update: async (id, data) => request(`/specialists/${id}`, { method: 'PUT', body: data }),

  remove: async (id) => request(`/specialists/${id}`, { method: 'DELETE' }),

  toggle: async (id) => request(`/specialists/${id}/toggle`, { method: 'PATCH' }),
};

/** Administratoriaus lentelės gauna visus puslapius, todėl įrašai po pirmojo šimto nepradingsta. */
export async function getAllPages(fetchPage) {
  const result = [];
  let page = 1;
  let totalPages;
  do {
    const response = await fetchPage({ page, limit: 100 });
    result.push(...response.data);
    totalPages = response.totalPages;
    page += 1;
  } while (page <= totalPages);
  return result;
}

// ─── Admin analitika ───
export const statsService = {
  // Grąžina { revenueByMonth, visitsByStatus, specialistWorkload, topServices, totals }
  getAdmin: async () => request('/stats/admin'),
};

// ─── Pacientai ───
export const patientService = {
  // Admin sąrašas su puslapiavimu/paieška; grąžina { data, page, limit, total, totalPages }
  getAll: async (params = {}) => request(`/patients${toQuery(params)}`),

  create: async (data) => request('/patients', { method: 'POST', body: data }),

  update: async (id, data) => request(`/patients/${id}`, { method: 'PUT', body: data }),

  remove: async (id) => request(`/patients/${id}`, { method: 'DELETE' }),
};
