const BASE_URL = 'http://localhost:8080/api';

const api = {
  /**
   * Función base para todas las peticiones a la API de Go
   */
  async request(endpoint, options = {}) {
    // 1. Este log es vital para ver si la función se despierta
    console.log("!!! EJECUTANDO REQUEST A:", endpoint);

    const token = localStorage.getItem('token');
    
    // 2. Usamos el token aquí para que ESLint no se queje de "unused variable"
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    // 3. Limpiamos el endpoint y lanzamos al puerto 8080
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const urlCompleta = `${BASE_URL}/${cleanEndpoint}`;
    
    console.log("!!! URL FINAL DISPARADA:", urlCompleta);

    const response = await fetch(urlCompleta, { ...options, headers });
    
    // ... resto de tu lógica de response.status y response.ok
    
    if (response.status === 402) {
      const errorData = await response.json();
      throw { status: 402, message: errorData.error, payment_url: errorData.payment_url };
    }

    if (!response.ok) {
      const errorText = await response.text(); 
      let errorMessage = 'Error en la petición';
      
      try {
        const errorData = JSON.parse(errorText); 
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage; 
      }
      throw new Error(errorMessage);
    }
    
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  },

  // --- AUTH ---
  login: (credentials) => api.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  verify: () => api.request('/auth/verify', {
    method: 'POST'
  }),

  // --- IDENTIDAD ---
  getOwnProfile: () => api.request('/me'),

  // --- VETERINARIOS / GESTIÓN ---
  getMyClients: () => api.request('/users/me/clients'),
  getMyAppointments: () => api.request('/users/me/appointments'),
  updateAppointmentStatus: (data) => api.request('/appointments/status', {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),

  // --- PERFILES PROFESIONALES ---
  updateProfessionalProfile: (formData) => api.request('/me/profile/professional', {
    method: 'PUT',
    body: JSON.stringify(formData)
  }),
  
  getProfileDetails: (id) => api.request(`/profiles/detail?id=${id}`),

  // --- MASCOTAS ---
  getMyPets: () => api.request('/users/me/pets'),
  getOwnerPets: (ownerId) => api.request(`/users/${ownerId}/pets`),
  getPetDetails: (petId) => api.request(`/pets/${petId}`),

  // --- HISTORIAL CLÍNICO ---
  getPetHistory: (petId) => api.request(`/medical-histories/pet/${petId}`),
  createMedicalHistory: (data) => api.request('/medical-histories', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // --- CITAS / RESERVAS ---
  createAppointment: (data) => api.request('/users/me/appointments', { // <-- Cambiado
    method: 'POST',
    body: JSON.stringify(data)
  }),
};

export default api;