import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from "../../services/api";
import { useAuth } from "../../context/useAuth";

// Configuración de iconos de Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const ProfileVet = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // --- 1. NAVEGACIÓN INTELIGENTE "VOLVER" ---
  const handleBackNavigation = () => {
    if (!user) {
      // Usuario no registrado: vuelve al mapa con los filtros previos intactos
      navigate(-1);
      return;
    }

    // Normalizamos el rol a mayúsculas para comparar con seguridad
    const userRole = (user.role)?.toUpperCase();

    if (userRole === 'PROFESSIONAL') {
      navigate('/mapa');
    } else if (userRole === 'PET_OWNER') {
      navigate('/mapa');
    } else {
      // Fallback por si el rol no coincide exactamente
      navigate(-1);
    }
  };

  // --- 2. GESTIÓN DE RESERVA DE CITAS ---
  const handleBookingClick = () => {
    if (!user) {
      navigate('/login', { state: { from: `/book-appointment/${id}` } });
    } else if (user.role?.toUpperCase() === 'PET_OWNER') {
      navigate(`/book-appointment/${id}`);
    } else {
      alert("Solo las cuentas de Propietarios pueden reservar citas.");
    }
  };

  // --- 3. CARGA DE DATOS ---
  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await api.getProfileDetails(id);
        const pd = data.profile_data;

        const processed = {
          ...data,
          description: pd?.bio || "Sin descripción disponible.",
          logo: pd?.logo_url || null,
          main_address: pd?.addresses?.find(a => a.is_main)?.full_address || pd?.addresses?.[0]?.full_address || "Consultar dirección",
          city: pd?.addresses?.[0]?.city || "Ciudad no especificada",
          lat: parseFloat(pd?.addresses?.[0]?.latitude) || 40.4167,
          lng: parseFloat(pd?.addresses?.[0]?.longitude) || -3.7037,
          services_list: pd?.specialties || [],
          rates_list: (pd?.pricing?.tarifas && pd.pricing.tarifas.length > 0)
            ? pd.pricing.tarifas
            : (pd?.specialization?.detailed_services || []),
          insurances: pd?.insurance_partners?.accepts 
            ? pd.insurance_partners.companies 
            : "No se han especificado seguros",
          license_number: pd?.license_number || "No disponible",
          phone: pd?.contact?.phone || "No disponible",
          email: pd?.contact?.email || data.email
        };

        setProfile(processed);
      } catch (err) {
        console.error("Error cargando perfil:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#1cabb0] border-solid"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center bg-gray-50">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-md">
          <i className="fas fa-exclamation-circle text-red-400 text-5xl mb-4"></i>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Perfil no encontrado</h2>
          <p className="text-slate-500 mb-6 italic">El ID solicitado no existe o no tiene una cuenta profesional activa.</p>
          <button onClick={handleBackNavigation} className="bg-[#1cabb0] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#168a8e] transition block w-full">
            {user ? 'Volver al Mapa' : 'Volver al Mapa'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f5f8f9] min-h-screen pb-20 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto p-5">
        
        {/* BOTÓN VOLVER DINÁMICO */}
        <button 
          onClick={() => navigate(-1)} 
          className="mb-8 flex items-center text-slate-500 hover:text-[#1cabb0] font-bold transition-all group"
        >
          <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 mr-3 group-hover:bg-[#e0f7f9] transition-colors">
            <i className="fas fa-arrow-left"></i>
          </div>
          {user ? 'VOLVER AL PANEL' : 'VOLVER AL MAPA'}
        </button>

        {/* Tarjeta Superior de Identidad */}
        <header className="bg-white rounded-[2rem] border border-gray-200 shadow-sm p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative">
              <img 
                src={profile.logo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}`} 
                className="w-32 h-32 rounded-[2rem] object-cover border-4 border-[#f0f9fa] shadow-lg"
                alt="Logo Profesional" 
              />
              {profile.is_verified && (
                <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center border-4 border-white">
                  <i className="fas fa-check text-xs"></i>
                </div>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-black text-slate-800 leading-tight mb-2">{profile.name}</h1>
              <div className="flex items-center justify-center md:justify-start gap-4 mb-6">
                <div className="bg-yellow-50 text-yellow-600 px-3 py-1 rounded-lg font-black text-sm flex items-center">
                  <i className="fas fa-star mr-1.5"></i> {(profile.rating || 0).toFixed(1)}
                </div>
                <span className="text-slate-400 font-bold text-sm underline decoration-slate-200 decoration-2">
                  {profile.review_count || 0} reseñas de clientes
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <a href={`tel:${profile.contact_info?.phone || profile.phone}`} className="bg-[#1cabb0] text-white py-3.5 rounded-2xl font-black text-center hover:shadow-lg hover:shadow-[#1cabb0]/20 transition active:scale-95">
                  <i className="fas fa-phone-alt mr-2"></i> Llamar
                </a>
                <a href={`mailto:${profile.contact_info?.contact_email || profile.contact_email}`} className="bg-white text-[#1cabb0] border-2 border-[#1cabb0] py-3.5 rounded-2xl font-black text-center hover:bg-[#f0fafa] transition active:scale-95">
                  <i className="fas fa-envelope mr-2"></i> Email
                </a>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Información Detallada */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center">
                <span className="w-2 h-8 bg-[#1cabb0] rounded-full mr-3"></span> Sobre el profesional
              </h3>
              <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-wrap">{profile.description}</p>
            </section>

            <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center">
                <span className="w-2 h-8 bg-[#1cabb0] rounded-full mr-3"></span> Especialidades
              </h3>
              <div className="flex flex-wrap gap-3">
                {profile.services_list?.length > 0 ? (
                  profile.services_list.map((s, i) => (
                    <span key={i} className="bg-[#f0f9fa] text-[#1cabb0] px-5 py-2.5 rounded-2xl text-sm font-black uppercase tracking-wide border border-[#e0f2f3]">
                      {s}
                    </span>
                  ))
                ) : (
                  <p className="text-slate-400 italic">No se han definido especialidades específicas.</p>
                )}
              </div>
            </section>

            <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center">
    <span className="w-2 h-8 bg-[#1cabb0] rounded-full mr-3"></span> Tarifas y Servicios
  </h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {profile.rates_list?.length > 0 ? (
      profile.rates_list.map((t, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-[#1cabb0] rounded-full mr-3"></div>
            <span className="text-slate-700 font-bold">{t.name}</span>
          </div>
          <span className="font-black text-[#1cabb0] ml-2">{t.price}€</span>
        </div>
      ))
    ) : (
      <p className="text-slate-400 italic col-span-2">Precios sujetos a consulta previa.</p>
    )}
  </div>
</section>
          </div>

          {/* Columna Derecha: Sidebar de Contacto y Mapa */}
          <div className="space-y-8">
            <section className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl">
              <h3 className="text-xl font-black mb-6 border-b border-slate-700 pb-4">Contacto</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="bg-slate-800 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                    <i className="fas fa-map-marker-alt text-[#1cabb0]"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Ubicación</p>
                    <p className="font-bold text-sm">{profile.main_address}, {profile.city}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-slate-800 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
      <i className="fas fa-id-badge text-[#1cabb0]"></i>
    </div>
    <div>
      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nº Colegiado</p>
      <p className="font-bold text-sm">{profile.license_number || "No disponible"}</p>
    </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-slate-800 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
      <i className="fas fa-shield-alt text-[#1cabb0]"></i>
    </div>
    <div>
      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Seguros</p>
      <p className="font-bold text-sm">{profile.insurances}</p>
    </div>
                </div>
              </div>
              
              <button 
                onClick={handleBookingClick}
                className="w-full mt-10 bg-[#1cabb0] text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-white hover:text-[#1cabb0] transition-all active:scale-95"
              >
                RESERVAR CITA
              </button>
            </section>

            {/* Componente de Mapa con Leaflet */}
            <section className="bg-white p-3 rounded-[2rem] border border-gray-200 shadow-sm h-72 overflow-hidden relative z-0">
              <MapContainer 
                center={[profile.lat, profile.lng]} 
                zoom={14} 
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%", borderRadius: '1.5rem' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[profile.lat, profile.lng]}>
                  <Popup>
                    <div className="font-bold">{profile.name}</div>
                    <div className="text-xs">{profile.city}</div>
                  </Popup>
                </Marker>
              </MapContainer>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileVet;