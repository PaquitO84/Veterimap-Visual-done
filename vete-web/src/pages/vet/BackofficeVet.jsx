import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // <-- Solo una vez cada identificador
import { useAuth } from "../../context/useAuth";
import api from "../../services/api";

const BackofficeVet = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [trialDays] = useState(52); 
  const [loading, setLoading] = useState(true);
  const [professionalId, setProfessionalId] = useState(null);

 useEffect(() => {
  const loadDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      const userDataResponse = await api.request('/me'); 
      // DESEMPAQUETADO: Extraemos el objeto real del usuario
      // Si el backend envía { data: { name: 'David' } } usamos .data
      const userData = userDataResponse?.data || userDataResponse;
      setProfile(userData);

      const profResp = await api.request('/users/me/professional-profile');
      const profData = profResp?.data || profResp;
      
      if (profData?.id) {
        setProfessionalId(profData.id);
      }

      const appResp = await api.getMyAppointments();
      setAppointments(appResp?.data || (Array.isArray(appResp) ? appResp : []));
      
    } catch (err) {
      console.error("Error cargando dashboard:", err);
    } finally {
      setLoading(false);
    }
  };
  loadDashboardData();
}, [user]);

  const getStatusStyle = (status) => {
  switch(status) {
    case 'PENDING': return 'bg-yellow-100 text-yellow-700';
    case 'RESCHEDULED': return 'bg-blue-100 text-blue-700';
    case 'CONFIRMED': return 'bg-green-100 text-green-700';
    case 'COMPLETED': return 'bg-purple-100 text-purple-700'; // Actualizado de 'REALIZADA'
    case 'CANCELLED': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

  return (
    <div className="bg-gray-50 flex min-h-screen font-sans">
      <aside className="w-64 bg-slate-900 text-white shadow-md sticky top-0 hidden md:block">
        <div className="p-6 text-2xl font-bold border-b border-slate-800">
          <i className="fas fa-user-md mr-2 text-blue-400"></i> Veterimap <span className="text-blue-400 text-xs">PRO</span>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          <Link to="/backoffice-vet" className="flex items-center p-3 bg-blue-600 rounded-lg font-bold">
            <i className="fas fa-columns mr-3 w-5"></i> Dashboard
          </Link>
          <Link to="/agenda-vet" className="flex items-center p-3 text-slate-400 hover:bg-slate-800 rounded-lg transition">
            <i className="fas fa-calendar-check mr-3 w-5"></i> Agenda / Citas
          </Link>
          <Link to="/clientes" className="flex items-center p-3 text-slate-400 hover:bg-slate-800 rounded-lg transition">
            <i className="fas fa-users mr-3 w-5"></i> Clientes
          </Link>
          <button 
  onClick={() => {
    if (professionalId) {
      navigate(`/profile-vet/${professionalId}`);
    } else {
      alert("Aún no has creado tu perfil profesional.");
    }
  }}
  className="flex items-center p-3 text-slate-400 hover:bg-slate-800 rounded-lg transition w-full"
>
  <i className="fas fa-external-link-alt mr-3 w-5"></i> Mi Perfil Público
</button>
          <Link to="/formulario-vet" className="flex items-center p-3 text-slate-400 hover:bg-slate-800 rounded-lg transition border-t border-slate-800 pt-5">
            <i className="fas fa-user-edit mr-3 w-5"></i> Editar Datos
          </Link>
          <button onClick={logout} className="w-full flex items-center p-3 text-red-400 hover:bg-slate-800 rounded-lg transition mt-10">
            <i className="fas fa-sign-out-alt mr-3 w-5"></i> Cerrar Sesión
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-10">
{/* Título y Bienvenida */}
  <div>
    <h1 className="text-3xl font-bold text-gray-800">Panel de Control</h1>
    <p className="text-gray-500 font-medium italic">
      {loading 
        ? 'Sincronizando datos...' 
        : `${profile?.name || user?.name || 'Veterinario'}`
      }
    </p>
  </div>

  {/* Información de Usuario y Suscripción */}
  <div className="flex items-center space-x-6">
    <div className="text-right">
      {/* Nombre real: Intentamos profile (API), luego user (Context), luego genérico */}
      <p className="font-bold text-gray-800 leading-none mb-2">
        {profile?.name || user?.name || 'Profesional'}
      </p>

      {/* Lógica de Suscripción / Trial */}
      {profile?.subscription_status === 'active' ? (
        <span className="text-[10px] bg-emerald-100 text-emerald-700 font-black px-2 py-1 rounded-md uppercase tracking-wider">
          <i className="fas fa-check-circle mr-1"></i> Suscripción Activa
        </span>
      ) : (
        <p className={`text-[10px] font-black uppercase tracking-wider ${trialDays <= 5 ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
          {trialDays <= 0 
            ? 'Periodo de prueba finalizado' 
            : trialDays <= 10 
              ? `Trial: Quedan ${trialDays} días (Renovar)` 
              : `Prueba: ${trialDays} días restantes`
          }
        </p>
      )}
    </div>

    {/* Avatar circular unificado (Logo o Inicial) */}
    <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-black text-lg border-2 border-white shadow-sm overflow-hidden">
      {profile?.logo_url ? (
        <img src={profile.logo_url} className="w-full h-full object-cover" alt="Perfil" />
      ) : (
        // Usamos la inicial del nombre detectado
        (profile?.name || user?.name || 'V').charAt(0).toUpperCase()
      )}
    </div>
  </div>
</header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase">Citas Hoy</p>
              <h3 className="text-3xl font-black">{appointments.length}</h3>
            </div>
            <div className="bg-blue-50 text-blue-600 p-3 rounded-lg"><i className="fas fa-calendar-day"></i></div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase">Días de Trial</p>
              <h3 className="text-3xl font-black">{trialDays}</h3>
            </div>
            <div className="bg-orange-50 text-orange-600 p-3 rounded-lg"><i className="fas fa-clock"></i></div>
          </div>
          <Link to="/clientes" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition">
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase">Mis Clientes</p>
              <h3 className="text-sm font-bold text-blue-600 mt-1">Ver listado <i className="fas fa-chevron-right ml-1"></i></h3>
            </div>
            <div className="bg-green-50 text-green-600 p-3 rounded-lg"><i className="fas fa-users"></i></div>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-lg text-gray-800">Próximas Citas (Resumen)</h3>
            <Link to="/agenda-vet" className="text-blue-600 font-bold text-sm hover:underline">
              Ver agenda completa <i className="fas fa-arrow-right ml-1"></i>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold border-b">
                <tr>
                  <th className="px-6 py-4">Hora</th>
                  <th className="px-6 py-4">Paciente</th>
                  <th className="px-6 py-4">Dueño</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400 italic">
                      {loading ? 'Cargando citas...' : 'No hay citas para hoy.'}
                    </td>
                  </tr>
                ) : (
                  appointments.slice(0, 5).map((app, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-bold text-blue-600">
                        {app.appointment_date ? new Date(app.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">{app.pet_name || 'Mascota'}</td>
                      <td className="px-6 py-4 text-gray-500">{app.owner_name || 'Cliente'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusStyle(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to="/agenda-vet" className="text-blue-500 hover:text-blue-700 font-bold text-sm">Gestionar</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BackofficeVet;