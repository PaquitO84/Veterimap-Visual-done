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
  
  // Estados de Filtro
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Estados de Modal y Reagendación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  // 1. CARGA DE CITAS
  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.request('/users/me/appointments');
      const data = response?.data || response || [];

      // Prioridad: PENDING primero, luego el resto por fecha
      const statusPriority = {
        'PENDING': 1,
        'CONFIRMED': 2,
        'COMPLETED': 3,
        'CANCELLED': 4,
        'NOSHOW': 5
      };

      const sorted = data.sort((a, b) => {
        if (statusPriority[a.status] !== statusPriority[b.status]) {
          return statusPriority[a.status] - statusPriority[b.status];
        }
        return new Date(a.appointment_date) - new Date(b.appointment_date);
      });

      setAppointments(sorted);
    } catch (err) {
      console.error("Error al cargar citas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. EFECTO INICIAL
  useEffect(() => {
    const fetchHeaderData = async () => {
      try {
        const data = await api.request(`/me`); 
        setProfile(data?.data || data);
      } catch (err) {
        console.error("Error al cargar perfil:", err);
      }
    };

    if (user) {
      fetchHeaderData();
      loadAppointments();
    }
  }, [user, loadAppointments]);

  // 3. ACCIONES (CONFIRMAR / REAGENDAR)
  const updateStatus = async (id, status) => {
    const msg = status === 'CONFIRMED' ? 'confirmar' : 'actualizar';
    if (!window.confirm(`¿Está seguro de que desea ${msg} esta cita?`)) return;
    try {
      await api.request('/users/me/appointments/status', { 
        method: 'PATCH',
        body: JSON.stringify({ appointment_id: id, status: status })
      });
      alert('Estado actualizado correctamente ✅');
      loadAppointments(); 
    } catch {
      alert('Error al actualizar la cita');
    }
  };

  const handleReschedule = async () => {
    try {
      const combinedDateTime = `${newDate}T${newTime}:00Z`;
      await api.request('/users/me/appointments/reschedule', {
        method: 'PATCH',
        body: JSON.stringify({ appointment_id: selectedAppId, new_date: combinedDateTime })
      });
      alert('Propuesta de cambio enviada correctamente');
      setIsModalOpen(false);
      loadAppointments();
    } catch {
      alert('Error al reagendar la cita');
    }
  };

  // Helper para colores de etiquetas
  const getStatusClass = (status) => {
    const classes = {
      'PENDING': 'bg-yellow-100 text-yellow-700',
      'CONFIRMED': 'bg-green-100 text-green-700',
      'CANCELLED': 'bg-red-100 text-red-700',
      'COMPLETED': 'bg-purple-100 text-purple-700',
      'NOSHOW': 'bg-slate-200 text-slate-600',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  };

  // --- LÓGICA DE FILTRADO PARA LA LISTA ---
  const filteredAppointments = appointments.filter(app => {
    // Si filtramos por un estado que NO es 'ALL', ignoramos la fecha para ver histórico
    if (filterStatus !== 'ALL') {
      return app.status === filterStatus;
    }
    
    // Si el filtro es 'ALL', filtramos por la fecha seleccionada en el calendario
    // Pero excluimos las PENDING (porque esas van en la sección superior fija)
    const appDate = new Date(app.appointment_date).toISOString().split('T')[0];
    return appDate === selectedDate && app.status !== 'PENDING';
  });

  // Sección superior fija de Pendientes (siempre visibles)
  const pendingApps = appointments.filter(a => a.status === 'PENDING');

  // Componente de Barra de Filtros
  const FilterBar = () => {
    const statuses = [
      { id: 'ALL', label: 'TODO', icon: 'fa-list' },
      { id: 'PENDING', label: 'PENDIENTES', icon: 'fa-clock' },
      { id: 'CONFIRMED', label: 'CONFIRMADAS', icon: 'fa-check-circle' },
      { id: 'COMPLETED', label: 'FINALIZADAS', icon: 'fa-flag-checkered' },
      { id: 'CANCELLED', label: 'ANULADAS', icon: 'fa-times-circle' },
      { id: 'NOSHOW', label: 'AUSENTES', icon: 'fa-user-slash' }
    ];

    return (
      <div className="flex flex-wrap gap-2 mb-8">
        {statuses.map((s) => (
          <button
            key={s.id}
            onClick={() => setFilterStatus(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all duration-200 ${
              filterStatus === s.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105' 
                : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
            }`}
          >
            <i className={`fas ${s.icon}`}></i>
            {s.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 flex min-h-screen font-sans">
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
          <button onClick={() => navigate(`/profile-vet/${user?.user_id || user?.id}`)} className="flex items-center p-3 text-slate-400 hover:bg-slate-800 rounded-lg transition w-full text-left">
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
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Agenda y Citas</h1>
            <p className="text-gray-500 font-medium italic">Gestiona tus próximas consultas</p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="font-bold text-gray-800 leading-none">
                {profile?.name ? `Dr. ${profile.name}` : 'Cargando...'}
              </p>
              <span className="text-[10px] text-blue-600 font-black uppercase tracking-tighter">Sesión Pro</span>
            </div>
            <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-black text-lg border-2 border-white shadow-sm overflow-hidden">
              {profile?.logo_url ? <img src={profile.logo_url} className="w-full h-full object-cover" alt="Perfil" /> : profile?.name?.charAt(0) || 'V'}
            </div>
          </div>
        </header>

        {/* SECCIÓN 1: SOLICITUDES PENDIENTES */}
        {pendingApps.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </span>
              <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest">Solicitudes Pendientes</h2>
            </div>
            <div className="grid gap-4">
              {pendingApps.map(app => (
                <AppointmentCard key={app.id} app={app} getStatusClass={getStatusClass} updateStatus={updateStatus} setSelectedAppId={setSelectedAppId} setIsModalOpen={setIsModalOpen} showActions={true} />
              ))}
            </div>
          </section>
        )}

        {/* SECCIÓN 2: FILTROS GLOBALES */}
        <div className="mb-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Vista rápida por estado</p>
          <FilterBar />
        </div>

        {/* SECCIÓN 3: AGENDA Y CALENDARIO */}
        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center justify-between gap-4 transition-opacity ${filterStatus !== 'ALL' ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100'}`}>
            <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg"><i className="fas fa-calendar-day"></i></div>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border-none bg-gray-50 p-2 rounded-lg focus:ring-2 ring-blue-500 outline-none font-bold text-gray-700" />
            </div>
            <button onClick={loadAppointments} className="bg-slate-800 text-white px-6 py-2 rounded-xl hover:bg-slate-700 transition font-bold text-sm uppercase tracking-tighter">Sincronizar</button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">
              {filterStatus === 'ALL' ? (
                <>Agenda del día: <span className="text-blue-600 ml-1">{new Date(selectedDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</span></>
              ) : (
                <>Historial: <span className="text-blue-600 ml-1 uppercase">{filterStatus}</span></>
              )}
            </h3>
            <span className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold text-slate-500">{filteredAppointments.length} Resultados</span>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-20 text-center">
                 <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                 <p className="mt-4 text-slate-400 font-medium">Buscando citas...</p>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="p-20 text-center text-gray-400">
                  <i className="fas fa-calendar-times text-4xl mb-4 opacity-20"></i>
                  <p>No se encontraron registros en esta categoría.</p>
              </div>
            ) : (
              filteredAppointments.map((app) => (
                <AppointmentCard key={app.id} app={app} getStatusClass={getStatusClass} updateStatus={updateStatus} setSelectedAppId={setSelectedAppId} setIsModalOpen={setIsModalOpen} showActions={false} />
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
            <p className="text-sm text-gray-500 mb-6">Se enviará una notificación al cliente.</p>
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
                <button onClick={handleReschedule} className="flex-[2] px-4 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition">Enviar Propuesta</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AppointmentCard = ({ app, getStatusClass, updateStatus, setSelectedAppId, setIsModalOpen, showActions }) => (
  <div className="p-6 bg-white flex flex-col md:flex-row items-center justify-between hover:bg-blue-50/30 transition group border-b border-gray-50">
    <div className="flex items-center gap-6 w-full md:w-auto">
      <div className="text-center min-w-[85px]">
        <h4 className="font-black text-xl text-slate-800 leading-none mb-1">
          {new Date(app.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </h4>
        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
          {new Date(app.appointment_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
        </span>
      </div>
      <div className="border-l pl-6 border-gray-200">
        <p className="font-bold text-gray-800 text-lg">Paciente: {app.pet_name || 'Sin nombre'}</p>
        <p className="text-sm text-gray-500 flex items-center gap-2 font-medium">
          <i className="fas fa-user text-[10px] text-slate-300"></i> {app.owner_name || 'N/A'}
        </p>
        <p className="text-[11px] mt-2 bg-slate-50 inline-block px-2 py-1 rounded border border-slate-100 text-slate-500 font-medium italic">
          "{app.notes || 'Consulta General'}"
        </p>
      </div>
    </div>
    
    <div className="flex items-center gap-3 mt-4 md:mt-0">
      {app.status === 'PENDING' && showActions ? (
    <div className="flex gap-2">
      <button onClick={() => updateStatus(app.id, 'CONFIRMED')} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-600 transition shadow-sm uppercase">Confirmar</button>
      <button onClick={() => { setSelectedAppId(app.id); setIsModalOpen(true); }} className="bg-blue-500 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-600 transition shadow-sm uppercase">Reagendar</button>
      <button onClick={() => updateStatus(app.id, 'CANCELLED')} className="bg-white text-red-500 border border-red-100 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-red-50 transition uppercase">Rechazar</button>
    </div>
  ) : (
    <div className="flex items-center gap-4">
       <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${getStatusClass(app.status)}`}>
          {app.status === 'NOSHOW' ? 'Ausente' : app.status}
       </span>
       {/* Acciones adicionales para citas confirmadas */}
       {app.status === 'CONFIRMED' && (
          <div className="flex gap-2">
            <button onClick={() => updateStatus(app.id, 'COMPLETED')} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[9px] font-black hover:bg-blue-600 transition uppercase">Finalizar</button>
            <button onClick={() => updateStatus(app.id, 'NOSHOW')} className="border border-slate-200 text-slate-400 px-3 py-1.5 rounded-lg text-[9px] font-black hover:bg-red-50 hover:text-red-500 transition uppercase">Ausente</button>
          </div>
           )}
        </div>
      )}
    </div>
  </div>
);
export default AgendaVet;