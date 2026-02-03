const BASE_URL = 'http://localhost:8080/api';

const api = {
  async request(endpoint, methodOrOptions = 'GET', body = null) {
    let options = {};
    if (typeof methodOrOptions === 'object') {
      options = methodOrOptions;
    } else {
      options = {
        method: methodOrOptions,
        ...(body && { body: JSON.stringify(body) })
      };
    }

    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const urlCompleta = `${BASE_URL}/${cleanEndpoint}`;

    try {
      const response = await fetch(urlCompleta, { ...options, headers });

      if (response.status === 402) {
        const errorData = await response.json();
        throw { status: 402, message: errorData.error, payment_url: errorData.payment_url };
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Error en la petición';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } catch (error) {
      console.error("!!! ERROR EN API.JS:", error.message);
      throw error;
    }
  },

  // --- AUTH ---
  login: (credentials) => api.request('/auth/login', 'POST', credentials),
  verify: () => api.request('/auth/verify', 'POST'),

  // --- PERFILES (Doble vía: Vet y Público) ---
  getProfileDetails: (id) => {
    if (id) return api.request(`/profiles/detail?id=${id}`);
    return api.request('/users/me/professional-profile');
  },
  saveProfessionalProfile: (data) => api.request('/users/me/professional-profile', 'POST', data),
  getOwnProfile: () => api.request('/me'),

  // --- VETERINARIOS / GESTIÓN ---
  getMyClients: () => api.request('/users/me/clients'),
  getMyAppointments: () => api.request('/users/me/appointments'),
  updateAppointmentStatus: (data) => api.request('/appointments/status', 'PATCH', data),

  // --- MASCOTAS (Recuperadas rutas para BookingPage y Propietario) ---
  getMyPets: () => api.request('/users/me/pets'), // Dueño logueado viendo sus mascotas
  getOwnerPets: (ownerId) => api.request(`/users/me/pets/owner/${ownerId}`), // Vet viendo mascotas de un cliente
  getPetDetails: (petId) => api.request(`/users/me/pets/${petId}`), // Detalle de mascota

  // --- HISTORIAL CLÍNICO (Mantenemos mejora para el Vet) ---
  getMedicalHistory: (petId) => api.request(`/medical-histories/pet/${petId}`),
  createMedicalHistory: (data) => api.request('/medical-histories', 'POST', data),

  // --- CITAS / RESERVAS ---
  createAppointment: (data) => api.request('/users/me/appointments', 'POST', data),
};

export default api;