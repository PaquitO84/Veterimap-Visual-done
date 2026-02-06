import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/useAuth';

// --- IMPORTACIÓN DE PÁGINAS ---
import Login from './pages/userflow-comun/Login';
import Registro from './pages/userflow-comun/registro';
import Suscripciones from './pages/userflow-comun/Suscripciones';

import Verify from './pages/userflow-comun/verify';
import LandingPage from './pages/userflow-comun/LandingPage';
import Mapa from './pages/userflow-comun/Mapa';

import BackofficeVet from './pages/vet/BackofficeVet';
import Clientes from './pages/vet/Clientes';
import AgendaVet from './pages/vet/AgendaVet';
import FormularioVet from './pages/vet/FormularioVet';
import ProfileVet from './pages/vet/ProfileVet';
import BookingPage from './pages/vet/BookingPage';
import HistorialClinico from './pages/vet/HistorialClinico';

import BackofficeOwner from './pages/owner/BackofficeOwner';
import FormularioOwner from './pages/owner/FormularioOwner';
import MisMascotas from './pages/owner/MisMascotas';
import CitasOwner from './pages/owner/CitasOwner';

const ProtectedRoute = ({ children, allowedRole, minLevel = 0 }) => {
  const { user, loadingProfile } = useAuth();

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mb-4"></div>
        <p className="text-slate-500 font-medium">Cargando sesión...</p>
      </div>
    );
  }

  // 1. Si no hay usuario, al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Verificar Rol
  const hasRolePermission = Array.isArray(allowedRole) 
    ? allowedRole.includes(user.role) 
    : user.role === allowedRole;

  if (allowedRole && !hasRolePermission) {
    return <Navigate to="/" replace />;
  }

  // 3. Verificar Nivel de Acceso (NUEVO)
  // Si la ruta pide un nivel mínimo (ej: 2) y el usuario tiene menos (ej: 1)
  // Lo enviamos al backoffice para que vea el aviso de suscripción
  const currentAccessLevel = user.access_level || 0;
  if (minLevel > 0 && currentAccessLevel < minLevel) {
    console.warn(`Acceso denegado: Se requiere nivel ${minLevel}, el usuario tiene ${currentAccessLevel}`);
    return <Navigate to="/backoffice-vet" replace />;
  }

  return children;
};

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Routes>
        {/* RUTAS PÚBLICAS */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/planes" element={<Suscripciones />} /> 
        <Route path="/verify" element={<Verify />} />
        <Route path="/mapa" element={<Mapa />} />
        <Route path="/profile-vet/:id" element={<ProfileVet />} />

        {/* RUTAS VETERINARIO */}
        <Route path="/backoffice-vet" element={<ProtectedRoute allowedRole="PROFESSIONAL"><BackofficeVet /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute allowedRole="PROFESSIONAL"><Clientes /></ProtectedRoute>} />
        {/* CAMBIO AQUÍ: Añadimos minLevel={2} */}
        <Route path="/agenda-vet"  element={ <ProtectedRoute allowedRole="PROFESSIONAL" minLevel={2}><AgendaVet /></ProtectedRoute>} />
        <Route path="/agenda-vet" element={<ProtectedRoute allowedRole="PROFESSIONAL"><AgendaVet /></ProtectedRoute>} />
        <Route path="/formulario-vet" element={<ProtectedRoute allowedRole="PROFESSIONAL"><FormularioVet /></ProtectedRoute>} />
        
        
        {/* RUTA COMPARTIDA (CORREGIDA) */}
        <Route path="/historial-clinico/:petId" element={<ProtectedRoute allowedRole={["PROFESSIONAL", "PET_OWNER"]}><HistorialClinico /></ProtectedRoute>} />

        {/* RUTAS DUEÑO */}
        <Route path="/backoffice-owner" element={<ProtectedRoute allowedRole="PET_OWNER"><BackofficeOwner /></ProtectedRoute>} />
        <Route path="/formulario-owner" element={<ProtectedRoute allowedRole="PET_OWNER"><FormularioOwner /></ProtectedRoute>} />
        <Route path="/mis-mascotas" element={<ProtectedRoute allowedRole="PET_OWNER"><MisMascotas /></ProtectedRoute>} />
        <Route path="/mis-citas" element={<ProtectedRoute allowedRole="PET_OWNER"><CitasOwner /></ProtectedRoute>} />
        <Route path="/book-appointment/:id" element={<ProtectedRoute allowedRole="PET_OWNER"><BookingPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;