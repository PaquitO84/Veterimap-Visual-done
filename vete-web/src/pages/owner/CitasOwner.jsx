import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from "../../context/useAuth";
import api from "../../services/api";

const CitasOwner = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const response = await api.getMyAppointments();
        // Desempaquetado robusto: revisa si viene en .data o es el array directo
        const data = response?.data || (Array.isArray(response) ? response : []);
        setAppointments(data);
      } catch (err) {
        console.error("Error al cargar citas:", err);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments(); // !!! IMPORTANTE: Llamar a la función
  }, []); // [] asegura que solo se ejecute al montar el componente

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderStatusBadge = (status) => {
    const configs = {
      'CONFIRMED': { color: 'bg-green-100 text-green-700', text: 'Confirmada' },
      'PENDING': { color: 'bg-orange-100 text-orange-700', text: 'Pendiente' },
      'COMPLETED': { color: 'bg-blue-100 text-blue-700', text: 'Completada' },
      'CANCELLED': { color: 'bg-red-100 text-red-700', text: 'Cancelada' }
    };
    const config = configs[status] || configs['PENDING'];
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
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      
      {/* SIDEBAR RESPONSIVA */}
      <aside className="fixed bottom-0 left-0 w-full bg-blue-900 text-white md:relative md:w-64 md:h-screen flex md:flex-col z-50 shadow-2xl md:shadow-none">
        <div className="hidden md:block p-6 text-xl font-bold border-b border-blue-800 text-center tracking-tight">🐾 Veterimap</div>
        <nav className="flex flex-row md:flex-col justify-around md:justify-start p-2 md:p-4 md:space-y-2 w-full">
          <Link to="/backoffice-owner" className="flex flex-col md:flex-row items-center p-2 md:p-3 hover:bg-blue-800 rounded-xl transition-all">
            <span className="text-xl md:mr-3">🏠</span>
            <span className="text-[10px] md:text-sm font-bold">Inicio</span>
          </Link>
          <Link to="/mis-mascotas" className="flex flex-col md:flex-row items-center p-2 md:p-3 hover:bg-blue-800 rounded-xl transition-all">
            <span className="text-xl md:mr-3">🐕</span>
            <span className="text-[10px] md:text-sm font-bold">Mascotas</span>
          </Link>
          <Link to="/mis-citas" className="flex flex-col md:flex-row items-center p-2 md:p-3 bg-blue-800 shadow-inner rounded-xl transition-all">
            <span className="text-xl md:mr-3">📅</span>
            <span className="text-[10px] md:text-sm font-bold">Citas</span>
          </Link>
          <Link to="/mapa" className="flex flex-col md:flex-row items-center p-2 md:p-3 hover:bg-blue-800 rounded-xl transition-all">
            <span className="text-xl md:mr-3">📍</span>
            <span className="text-[10px] md:text-sm font-bold">Mapa</span>
          </Link>
          <button onClick={handleLogout} className="hidden md:flex items-center p-3 text-red-300 hover:bg-red-900/20 rounded-lg mt-auto mb-4 transition-colors">
             <span className="mr-3">🚪</span> Salir
          </button>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
        <header className="mb-8">
          <button 
            onClick={() => navigate('/backoffice-owner')}
            className="flex items-center text-slate-500 hover:text-blue-600 transition mb-4 font-medium group text-sm"
          >
            <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> 
            Volver al Panel
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Mis Citas</h1>
          <p className="text-slate-500 text-sm md:text-base">Gestiona tus reservas y visitas pendientes</p>
        </header>

        {/* TABLA RESPONSIVA */}
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
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center">
                           <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 text-sm">🐾</div>
                           <span className="font-bold text-slate-700">{app.pet_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-slate-800">{app.professional_name}</p>
                        <p className="text-[11px] text-blue-500 font-medium">Ficha Profesional</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm text-slate-700 font-medium">
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
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-600 transition-colors" title="Ver Notas">
                             <span className="text-lg">📝</span>
                          </button>
                          <button className="p-2 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-500 transition-colors" title="Cancelar">
                             <span className="text-lg">🗑️</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-4xl mb-3 opacity-20">📅</span>
                        <p className="text-slate-400 text-sm italic">No tienes citas registradas actualmente.</p>
                        <Link to="/mapa" className="mt-4 text-blue-600 font-bold text-xs uppercase tracking-tighter hover:underline">Buscar veterinario ahora</Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CitasOwner;