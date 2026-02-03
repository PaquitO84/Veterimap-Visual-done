import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from "../../context/useAuth";
import api from "../../services/api";

const CitasOwner = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // NUEVOS ESTADOS PARA EL MODAL DE NOTAS
  const [selectedApp, setSelectedApp] = useState(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.request('/users/me/appointments');
      const data = response?.data || (Array.isArray(response) ? response : []);
      
      const sorted = data.sort((a, b) => {
        if (a.status === 'RESCHEDULED') return -1;
        if (b.status === 'RESCHEDULED') return 1;
        return new Date(a.appointment_date) - new Date(b.appointment_date);
      });

      setAppointments(sorted);
    } catch (err) {
      console.error("Error al cargar citas:", err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleDecision = async (appointmentId, status) => {
    const action = status === 'CONFIRMED' ? 'aceptar la nueva fecha' : 'cancelar la cita';
    if (!window.confirm(`¿Estás seguro de que quieres ${action}?`)) return;

    try {
      await api.request('/users/me/appointments/status', {
        method: 'PATCH',
        body: JSON.stringify({ 
          appointment_id: appointmentId, 
          status: status 
        })
      });
      
      alert(status === 'CONFIRMED' ? '✅ Nueva fecha confirmada' : '❌ Cita cancelada');
      
      // MEJORA 2: LIMPIEZA DE ESTADOS Y REFRESCO
      setIsNoteModalOpen(false); // Cerramos el modal
      setSelectedApp(null);      // Limpiamos la cita seleccionada
      await fetchAppointments(); // Forzamos recarga de la lista
      
    } catch (err) {
      console.error("Error en handleDecision:", err);
      alert('Error al procesar la decisión.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderStatusBadge = (status) => {
    const configs = {
      'CONFIRMED':   { color: 'bg-green-100 text-green-700', text: 'Confirmada' },
      'PENDING':     { color: 'bg-orange-100 text-orange-700', text: 'Esperando Vet' },
      'RESCHEDULED': { color: 'bg-blue-600 text-white animate-pulse', text: 'Acción Requerida' },
      'COMPLETED':   { color: 'bg-purple-100 text-purple-700', text: 'Finalizada' },
      'CANCELLED':   { color: 'bg-red-100 text-red-700', text: 'Cancelada' },
      'NOSHOW':      { color: 'bg-slate-200 text-slate-600', text: 'No asististe' }
    };
    const config = configs[status] || { color: 'bg-gray-100 text-gray-700', text: status };
    
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans">
         
         {/* Sidebar Responsiva */}
         <aside className="fixed bottom-0 left-0 w-full bg-slate-900 text-white md:relative md:w-64 md:h-screen flex md:flex-col z-50 border-t border-slate-800 md:border-t-0 shadow-2xl">
           <div className="hidden md:block p-6 text-xl font-black tracking-tight text-blue-400">
             VETERIMAP
           </div>
           
           <nav className="flex flex-row md:flex-col w-full justify-around md:justify-start md:mt-4 px-2 md:px-4 py-2 md:py-0 md:space-y-1">
             <Link to="/landingpage" className="flex flex-col md:flex-row items-center p-2 md:p-3 hover:bg-slate-800 rounded-xl transition group">
               <span className="text-xl md:mr-3">🏠</span>
               <span className="text-[10px] md:text-sm font-bold uppercase md:capitalize">Inicio</span>
             </Link>
             <Link to="/mis-citas" className="flex flex-col md:flex-row items-center p-2 md:p-3 hover:bg-slate-800 rounded-xl transition group">
               <span className="text-xl md:mr-3">📅</span>
               <span className="text-[10px] md:text-sm font-bold uppercase md:capitalize">Citas</span>
             </Link>
             <Link to="/mis-mascotas" className="flex flex-col md:flex-row items-center p-2 md:p-3 hover:bg-slate-800 rounded-xl transition group">
               <span className="text-xl md:mr-3">🐕</span>
               <span className="text-[10px] md:text-sm font-bold uppercase md:capitalize">Mascotas</span>
             </Link>
             <Link to="/mapa" className="flex flex-col md:flex-row items-center p-2 md:p-3 hover:bg-slate-800 rounded-xl transition group">
               <span className="text-xl md:mr-3">🔍</span>
               <span className="text-[10px] md:text-sm font-bold uppercase md:capitalize">Buscar</span>
             </Link>
             <Link to="/formulario-owner" className="flex flex-col md:flex-row items-center p-2 md:p-3 hover:bg-slate-800 rounded-xl transition group">
               <span className="text-xl md:mr-3">⚙️</span>
               <span className="text-[10px] md:text-sm font-bold uppercase md:capitalize">Editar Perfil</span>
             </Link>
           </nav>
   
           <button 
             onClick={handleLogout} 
             className="hidden md:flex items-center gap-3 p-3 text-red-400 hover:bg-red-900/20 rounded-xl transition font-bold mt-auto mb-6 mx-4"
           >
             <span>🚪</span> Cerrar Sesión
           </button>
         </aside>

      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Mis Citas</h1>
          <p className="text-slate-500 text-sm md:text-base">Gestiona tus reservas y visitas pendientes</p>
        </header>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px] border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-5 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Mascota</th>
                  <th className="px-6 py-5 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Profesional / Clínica</th>
                  <th className="px-6 py-5 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Fecha y Hora</th>
                  <th className="px-6 py-5 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Estado</th>
                  <th className="px-6 py-5 font-bold text-[10px] text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.length > 0 ? (
                  appointments.map((app) => (
                    <tr key={app.id} className={`transition-colors group ${app.status === 'RESCHEDULED' ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-slate-50/80'}`}>
                      <td className="px-6 py-5">
                        <div className="flex items-center">
                           <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 text-sm">🐾</div>
                           <span className="font-bold text-slate-700">{app.pet_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-slate-800">{app.professional_name}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className={`text-sm font-medium ${app.status === 'RESCHEDULED' ? 'text-blue-700 font-black' : 'text-slate-700'}`}>
                          {new Date(app.appointment_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(app.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        {renderStatusBadge(app.status)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end items-center gap-3">
                          
                          {/* BOTÓN VER NOTAS: Ahora funcional */}
                          <button 
                            onClick={() => { 
                              setSelectedApp(app);      // Pasamos el objeto 'app' completo
                              setIsNoteModalOpen(true); // Abrimos el modal
                            }} 
                            className="p-2 hover:bg-blue-50 rounded-full text-blue-400 hover:text-blue-600 transition-colors"
                            title="Ver detalles y notas"
                          >
                            <span className="text-lg">📝</span>
                          </button>

                          {app.status === 'RESCHEDULED' ? (
                            <div className="flex gap-2 animate-in fade-in zoom-in duration-300">
                              <button 
                                onClick={() => handleDecision(app.id, 'CONFIRMED')}
                                className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black rounded-lg hover:bg-emerald-700 transition shadow-sm uppercase"
                              >
                                Aceptar
                              </button>
                              <button 
                                onClick={() => handleDecision(app.id, 'CANCELLED')}
                                className="px-3 py-1.5 bg-white text-red-600 border border-red-200 text-[10px] font-black rounded-lg hover:bg-red-50 transition uppercase"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              {app.status === 'PENDING' && (
                                <button 
                                  onClick={() => handleDecision(app.id, 'CANCELLED')}
                                  className="p-2 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-500 transition-colors" 
                                  title="Cancelar Cita"
                                >
                                   <span className="text-lg">🗑️</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" className="px-6 py-20 text-center text-slate-400 italic">No tienes citas registradas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL DE NOTAS Y DETALLES */}
        {isNoteModalOpen && selectedApp && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Detalles de la Cita</h2>
                    <p className="text-slate-500">Información proporcionada por la clínica</p>
                  </div>
                  <button onClick={() => setIsNoteModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Nota del Profesional:</p>
                    <p className="text-slate-700 italic">
                      {selectedApp.notes || "El profesional no ha adjuntado notas adicionales."}
                    </p>
                  </div>
                  
                  {selectedApp.status === 'RESCHEDULED' && (
                <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 animate-pulse">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-1 tracking-tighter">Nueva Fecha Propuesta por el Veterinario:</p>
                  <p className="text-lg font-bold text-blue-700">
                    {new Date(selectedApp.appointment_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-blue-600 font-medium">A las {new Date(selectedApp.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} horas</p>
                </div>
              )}
                </div>

                <div className="flex gap-3">
                  {selectedApp.status === 'RESCHEDULED' ? (
                    <>
                      <button onClick={() => handleDecision(selectedApp.id, 'CONFIRMED')} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition">Aceptar Cambio</button>
                      <button onClick={() => handleDecision(selectedApp.id, 'CANCELLED')} className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition">Rechazar</button>
                    </>
                  ) : (
                    <button onClick={() => setIsNoteModalOpen(false)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition">Cerrar</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CitasOwner;