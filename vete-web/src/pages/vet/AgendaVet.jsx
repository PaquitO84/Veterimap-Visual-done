import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from "../../context/useAuth";
import { Link, useNavigate } from 'react-router-dom'; 
import api from "../../services/api";

const AgendaVet = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Estado para el Modal de Reagendar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  // 1. Cargar citas centralizado con useCallback para evitar bucles en useEffect
  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      // Endpoint corregido según tu main.go
      const data = await api.request(`/users/me/appointments?date=${selectedDate}`);
      // Ajuste de respuesta: manejamos si viene en .data o directo
      setAppointments(data?.data || data || []);
    } catch (err) {
      console.error("Error al cargar citas:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // 2. Cargar datos de perfil y disparar carga de citas
  useEffect(() => {
    const fetchHeaderData = async () => {
      try {
        // Asegúrate de que api.request o api.getProfileDetails usen el mismo patrón
        const data = await api.request(`/me`); // O tu endpoint de perfil profesional
        setProfile(data?.data || data);
      } catch (err) {
        console.error("Error al cargar perfil:", err);
      }
    };

    if (user) {
      fetchHeaderData();
      loadAppointments();
    }
  }, [user, loadAppointments]); // Dependencias limpias

  // 3. Actualizar estado (Confirmar/Rechazar)
  const updateStatus = async (id, status) => {
    const msg = status === 'CONFIRMED' ? 'confirmar' : 'rechazar';
    if (!window.confirm(`¿Está seguro de que desea ${msg} esta cita?`)) return;

    try {
      await api.request(`/appointments/status`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          appointment_id: id, 
          status: status 
        })
      });
      
      alert('Estado actualizado correctamente ✅');
      loadAppointments(); 
    } catch (err) {
      alert('Error al actualizar: ' + (err.message || 'Error del servidor'));
    }
  };

  // 4. Reagendar cita
  const handleReschedule = async () => {
    if (!newDate || !newTime) {
      alert("Por favor, selecciona fecha y hora");
      return;
    }

    try {
      // Formato ISO para Go time.Time
      const combinedDateTime = `${newDate}T${newTime}:00Z`;

      await api.request(`/appointments/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          appointment_id: selectedAppId, 
          new_date: combinedDateTime 
        })
      });

      alert('Propuesta de cambio enviada correctamente');
      setIsModalOpen(false);
      setNewDate('');
      setNewTime('');
      loadAppointments();
    } catch (err) {
      alert('Error al reagendar: ' + err.message);
    }
  };

  const getStatusClass = (status) => {
    const classes = {
      'PENDING': 'bg-yellow-100 text-yellow-700',
      'CONFIRMED': 'bg-green-100 text-green-700',
      'CANCELLED': 'bg-red-100 text-red-700',
      'COMPLETED': 'bg-purple-100 text-purple-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-gray-50 flex min-h-screen font-sans">
      {/* Sidebar - Se mantiene igual */}
      <aside className="w-64 bg-slate-900 text-white shadow-md sticky top-0 hidden md:block h-screen">
        <div className="p-6 text-2xl font-bold border-b border-slate-800">
          <i className="fas fa-user-md mr-2 text-blue-400"></i> Veterimap <span className="text-blue-400 text-xs">PRO</span>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          <Link to="/backoffice-vet" className="flex items-center p-3 text-slate-400 hover:bg-slate-800 rounded-lg transition">
            <i className="fas fa-columns mr-3 w-5"></i> Dashboard
          </Link>
          <Link to="/agenda-vet" className="flex items-center p-3 bg-blue-600 rounded-lg font-bold">
            <i className="fas fa-calendar-check mr-3 w-5"></i> Agenda / Citas
          </Link>
          <Link to="/clientes" className="flex items-center p-3 text-slate-400 hover:bg-slate-800 rounded-lg transition">
            <i className="fas fa-users mr-3 w-5"></i> Clientes
          </Link>
          <button 
            onClick={() => navigate(`/profile-vet/${user?.user_id || user?.id}`)}
            className="flex items-center p-3 text-slate-400 hover:bg-slate-800 rounded-lg transition w-full text-left"
          >
            <i className="fas fa-external-link-alt mr-3 w-5"></i> Mi Perfil Público
          </button>
          <div className="border-t border-slate-800 my-4 pt-4">
             <Link to="/formulario-vet" className="flex items-center p-3 text-slate-400 hover:bg-slate-800 rounded-lg transition">
                <i className="fas fa-user-edit mr-3 w-5"></i> Editar Datos
             </Link>
          </div>
          <button onClick={logout} className="w-full flex items-center p-3 text-red-400 hover:bg-slate-800 rounded-lg transition mt-10">
            <i className="fas fa-sign-out-alt mr-3 w-5"></i> Cerrar Sesión
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-8">
       <header className="flex justify-between items-center mb-10">
  {/* Título y Subtítulo */}
  <div>
    <h1 className="text-3xl font-bold text-gray-800">Agenda y Citas</h1>
    <p className="text-gray-500 font-medium italic">Gestiona tus próximas consultas</p>
  </div>

  {/* Lado Derecho: Información del Usuario */}
  <div className="flex items-center space-x-4">
    <div className="text-right hidden sm:block">
      {/* Nombre real extraído de profile.name (Tabla users) */}
      <p className="font-bold text-gray-800 leading-none">
        {profile?.name ? `Dr. ${profile.name}` : 'Cargando...'}
      </p>
      <span className="text-[10px] text-blue-600 font-black uppercase tracking-tighter">
        Sesión Pro
      </span>
    </div>

    {/* Avatar circular: Logo o Inicial */}
    <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-black text-lg border-2 border-white shadow-sm overflow-hidden">
      {profile?.logo_url ? (
        <img 
          src={profile.logo_url} 
          className="w-full h-full object-cover" 
          alt="Perfil" 
        />
      ) : (
        /* Si no hay logo, mostramos la inicial del nombre real */
        profile?.name?.charAt(0) || 'V'
      )}
    </div>
  </div>
</header>

        {/* Filtro de fecha */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                    <i className="fas fa-calendar-day"></i>
                </div>
                <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border-none bg-gray-50 p-2 rounded-lg focus:ring-2 ring-blue-500 outline-none font-bold text-gray-700"
                />
            </div>
            <button onClick={loadAppointments} className="bg-slate-800 text-white px-6 py-2 rounded-xl hover:bg-slate-700 transition font-bold text-sm">
              ACTUALIZAR
            </button>
        </div>

        {/* Lista de Citas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b bg-gray-50/50">
            <h3 className="font-bold text-gray-800">
              Citas del día: <span className="text-blue-600 ml-1">{new Date(selectedDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-20 text-center">
                 <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                 <p className="mt-4 text-slate-400 font-medium">Buscando citas...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="p-20 text-center text-gray-400">
                  <i className="fas fa-calendar-times text-4xl mb-4 opacity-20"></i>
                  <p>No tienes citas programadas para esta fecha.</p>
              </div>
            ) : (
              appointments.map((app) => (
                <div key={app.id} className="p-6 flex flex-col md:flex-row items-center justify-between hover:bg-blue-50/30 transition group">
                  <div className="flex items-center gap-6 w-full md:w-auto">
                    <div className="text-center min-w-[80px]">
                        <h4 className="font-black text-xl text-slate-800">
                            {new Date(app.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </h4>
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Hora local</span>
                    </div>
                    <div className="border-l pl-6 border-gray-200">
                        <p className="font-bold text-gray-800 text-lg">Paciente: {app.pet_name || 'Sin nombre'}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            <i className="fas fa-user text-[10px]"></i> Dueño: {app.owner_name || 'N/A'}
                        </p>
                        <p className="text-xs mt-2 bg-white inline-block px-2 py-1 rounded border text-gray-600 font-medium">
                            <i className="fas fa-info-circle mr-1 text-blue-400"></i> {app.notes || 'Consulta General'}
                        </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-4 md:mt-0">
                    {app.status === 'PENDING' ? (
                      <div className="flex gap-2">
                        <button onClick={() => updateStatus(app.id, 'CONFIRMED')} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition">Confirmar</button>
                        <button onClick={() => { setSelectedAppId(app.id); setIsModalOpen(true); }} className="bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 shadow-lg shadow-blue-200 transition">Reagendar</button>
                        <button onClick={() => updateStatus(app.id, 'CANCELLED')} className="bg-white text-red-500 border border-red-100 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-50 transition">Rechazar</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                         <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${getStatusClass(app.status)}`}>
                            {app.status}
                         </span>
                         {/* Botón para ver ficha clínica si la cita está confirmada */}
                         {app.status === 'CONFIRMED' && (
                             <button className="text-slate-400 hover:text-blue-600 transition">
                                 <i className="fas fa-file-medical text-lg"></i>
                             </button>
                         )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Modal Reagendar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in duration-200">
            <h3 className="text-2xl font-bold mb-2 text-slate-800">Reagendar Cita</h3>
            <p className="text-sm text-gray-500 mb-6">Se enviará una notificación al cliente con la propuesta.</p>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-1 ml-1">Nueva Fecha</label>
                <input type="date" className="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none focus:ring-2 ring-blue-500 font-bold" value={newDate} onChange={(e)=>setNewDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-1 ml-1">Nueva Hora</label>
                <input type="time" className="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none focus:ring-2 ring-blue-500 font-bold" value={newTime} onChange={(e)=>setNewTime(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition">Cancelar</button>
                <button onClick={handleReschedule} className="flex-[2] px-4 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition">Enviar Propuesta</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaVet;