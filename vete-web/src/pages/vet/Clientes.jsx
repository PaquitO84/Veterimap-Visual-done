import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from "../../context/useAuth";
import api from "../../services/api";

const Clientes = () => {
  const { user, logout } = useAuth();
  console.log("Usuario actual en el contexto:", user);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [professionalId, setProfessionalId] = useState(null);
  const [appointments, setAppointments] = useState([]);
  

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [pets, setPets] = useState([]);
  const [currentPet, setCurrentPet] = useState(null);
  const [history, setHistory] = useState([]);

  // Memorizamos la función para evitar re-renders innecesarios
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.request('/users/me/clients');
      setClients(data?.data || data || []);
    } catch (error) {
      console.error("Error cargando clientes:", error);
      setErrorMsg("No se pudieron cargar los clientes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const openExpediente = async (owner) => {
  setSelectedOwner(owner);
  setCurrentPet(null);
  setHistory([]);
  setErrorMsg(null);
  setIsModalOpen(true);

  try {
    // Usamos la ruta completa que acabamos de registrar en main.go
    // El owner.id es el que confirmamos en tu "Vista previa de Red"
    const data = await api.request(`/users/me/pets/owner/${owner.id}`);
    setPets(Array.isArray(data) ? data : (data?.data || []));
  } catch (error) {
    console.error("Error cargando mascotas:", error);
    setErrorMsg("No se pudieron cargar las mascotas del cliente.");
  }
};

  
  const selectPet = async (pet) => {
    setCurrentPet(pet);
    setHistory([]);
    setErrorMsg(null);

    try {
      // Traemos el historial resumido para el modal
      const data = await api.request(`/medical-histories/pet/${pet.id}`);
      setHistory(data?.data || data || []);
    } catch (error) {
      console.error("Error cargando historial:", error);
      setErrorMsg("No se pudo cargar el historial clínico.");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedOwner(null);
    setCurrentPet(null);
    setHistory([]);
    setPets([]);
    setErrorMsg(null);
  };

 const filteredClients = clients.filter(c =>
  (c.name || c.owner_name)?.toLowerCase().includes(searchTerm.toLowerCase())
);

useEffect(() => {
  const loadInitialData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Hacemos todas las llamadas en una sola ráfaga
      const [userData, profData, appData] = await Promise.all([
        api.request('/me'),
        api.request('/users/me/professional-profile'),
        api.request('/users/me/appointments')
      ]);

      setProfile(userData?.data || userData);
      if (profData?.id || profData?.data?.id) {
        setProfessionalId(profData?.id || profData?.data?.id);
      }
      // Aquí se soluciona el error:
      setAppointments(appData?.data || (Array.isArray(appData) ? appData : []));
      
      await fetchClients();
    } catch (err) {
      console.error("Error en carga inicial:", err);
    } finally {
      setLoading(false);
    }
  };
  loadInitialData();
}, [user, fetchClients]);

  useEffect(() => {
  const loadDoctorData = async () => {
    try {
      // Llamamos al endpoint que devuelve el nombre real de la DB
      const data = await api.request('/me'); // Bien: genera /api/me 
      setProfile(data); 
    } catch (err) {
      console.error("Error cargando nombre del doctor:", err);
    }
  };
  loadDoctorData();
}, []);

  return (
    <div className="flex bg-gray-50 min-h-screen font-sans">
      {/* Sidebar Lateral - UNIFICADA */}
      <aside className="w-64 bg-slate-900 text-white h-screen sticky top-0 hidden md:block">
        <div className="p-6 text-2xl font-bold border-b border-slate-800">
          <i className="fas fa-user-md mr-2 text-blue-400"></i> Veterimap <span className="text-blue-400 text-xs uppercase tracking-widest">Pro</span>
        </div>
        
        <nav className="mt-6 px-4 space-y-2">
          <Link to="/backoffice-vet" className="flex items-center p-3 text-slate-400 hover:bg-slate-800 rounded-lg transition">
            <i className="fas fa-columns mr-3 w-5 text-center"></i> Dashboard
          </Link>

          <Link to="/agenda-vet" className="flex items-center p-3 text-slate-400 hover:bg-slate-800 rounded-lg transition">
            <i className="fas fa-calendar-check mr-3 w-5 text-center"></i> Agenda / Citas
          </Link>

          {/* ACTIVO */}
          <div className="flex items-center p-3 bg-brand rounded-xl font-bold shadow-lg shadow-blue-900/20">
            <i className="fas fa-users mr-3 w-5 text-center"></i> Clientes
          </div>

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

      {/* Contenido Principal */}
      <main className="flex-1 p-6 md:p-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Gestión de Clientes</h1>
            <p className="text-gray-500 font-medium italic">Historiales clínicos y expedientes</p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-gray-500 font-medium italic">
                {loading 
                  ? 'Sincronizando datos...' 
                  : `${profile?.name || user?.name || 'Veterinario'}`
                }
              </p>
              <span className="text-[10px] text-brand font-black uppercase tracking-tighter">
                Panel Veterimap Pro
              </span>
            </div>

            <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-black text-lg border-2 border-white shadow-sm overflow-hidden">
              {profile?.logo_url ? (
                <img src={profile.logo_url} className="w-full h-full object-cover" alt="Perfil" />
              ) : (
                (profile?.name || user?.name || 'V').charAt(0).toUpperCase()
              )}
            </div>
          </div>
        </header>

        {/* Buscador Modernizado */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex items-center gap-4">
          <div className="bg-slate-50 flex-1 flex items-center px-4 py-1 rounded-xl">
            <i className="fas fa-search text-slate-400 mr-3"></i>
            <input
              type="text"
              placeholder="Buscar por nombre del dueño o cliente..."
              className="bg-transparent border-none w-full p-2 outline-none text-slate-700 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase">Limpiar</button>
          )}
        </div>

        {/* Listado de Clientes */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 font-medium rounded-r-xl animate-pulse">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {errorMsg}
          </div>
        )}

        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Clientes vinculados</h3>
            <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter">
              {filteredClients.length} Registros
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-20 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-20 text-center text-slate-400 italic">
                {searchTerm ? "No se encontraron coincidencias" : "Todavía no tienes clientes registrados"}
              </div>
            ) : (
              // CORRECCIÓN AQUÍ: Se eliminaron las llaves { } que envolvían al map
              filteredClients.map((owner) => (
                <div key={owner.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-blue-50/20 transition group">
                  <div className="flex items-center space-x-5">
                    <div className="bg-slate-100 group-hover:bg-white w-12 h-12 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-brand transition shadow-sm">
                      <i className="fas fa-user-circle text-2xl"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg leading-tight">{owner.name}</h4>
                      <p className="text-xs font-bold text-blue-500 uppercase mt-1 tracking-tight">
                        <i className="fas fa-location-arrow mr-1"></i> {owner.city || 'Ciudad no especificada'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => openExpediente(owner)}
                    className="mt-4 sm:mt-0 bg-slate-800 text-white font-bold hover:bg-brand px-6 py-3 rounded-xl transition text-xs uppercase tracking-widest flex items-center gap-2"
                  >
                    <i className="fas fa-folder-open"></i> Abrir Expediente
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      

      {/* Modal de Expediente - Diseño Mejorado */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200">
            {/* Header Modal */}
            <div className="p-8 border-b flex justify-between items-center bg-white">
              <div className="flex items-center gap-4">
                  <div className="bg-brand text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                      <i className="fas fa-file-medical-alt text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800">
                      {currentPet ? `Ficha de ${currentPet.name}` : 'Expediente Clínico'}
                    </h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">
                      Cliente: {selectedOwner?.owner_name}
                    </p>
                  </div>
              </div>
              <button onClick={closeModal} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition">
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Columna Izquierda: Mascotas */}
              <div className="w-48 md:w-60 bg-slate-50/50 border-r p-6 overflow-y-auto">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-[0.2em]">PACIENTES</p>
                <div className="space-y-3">
                    {pets.map((pet) => (
                      <button
                        key={pet.id}
                        onClick={() => selectPet(pet)}
                        className={`w-full text-left p-4 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 ${
                          currentPet?.id === pet.id
                            ? 'bg-white text-brand shadow-md border-l-4 border-brand'
                            : 'text-slate-500 hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        <i className={`fas fa-paw ${currentPet?.id === pet.id ? 'text-brand' : 'text-slate-300'}`}></i> 
                        {pet.name}
                      </button>
                    ))}
                </div>
              </div>

              {/* Columna Derecha: Historial */}
              <div className="flex-1 p-8 overflow-y-auto bg-white">
                {currentPet ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-end mb-4 border-b pb-4 border-slate-50">
                        <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                          <i className="fas fa-history text-blue-500 text-sm"></i> Resumen de Visitas
                        </h4>
                        <button
                          onClick={() => navigate(`/historial-clinico/${currentPet.id}`)}
                          className="w-full mt-4 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-brand transition"
                        >
                          Ir a Gestión Médica Completa
                        </button>
                    </div>
                    <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
    <div>
        <p className="text-blue-800 font-black text-sm">Consulta en curso</p>
        <p className="text-brand text-[11px] font-bold tracking-tighter uppercase italic">Registra el diagnóstico y tratamiento actual</p>
    </div>
    <button
        onClick={() => navigate(`/historial-clinico/${currentPet.id}`)}
        className="bg-brand text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all transform active:scale-95 flex items-center gap-2"
    >
        <i className="fas fa-stethoscope"></i> Atender Paciente
    </button>
</div>
                    {history.length > 0 ? (
                      <div className="space-y-4">
                        {history.slice(0, 3).map((entry, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-[10px] font-black bg-brand text-white px-3 py-1 rounded-full uppercase tracking-tighter">
                                {new Date(entry.created_at).toLocaleDateString()}
                              </span>
                              <span className="text-[10px] font-bold text-slate-300 uppercase">Visita #{idx + 1}</span>
                            </div>
                            <p className="text-xs font-black text-slate-400 uppercase mb-1">Diagnóstico Principal</p>
                            <p className="text-sm text-slate-700 font-bold mb-4">{entry.diagnosis}</p>
                            
                            <div className="bg-white p-3 rounded-xl border border-slate-100 text-[11px] text-slate-600 italic">
                                <strong>Receta:</strong> {entry.treatment || 'Sin medicación prescrita'}
                            </div>
                          </div>
                        ))}
                        
                        <button
                          onClick={() => navigate(`/historial-clinico/${currentPet.id}`)}
                          className="w-full mt-4 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-brand transition"
                        >
                          Ir a Gestión Médica Completa
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-20 bg-slate-50 rounded-3xl">
                        <p className="text-slate-400 text-sm italic mb-6">No hay registros médicos para esta mascota.</p>
                      <button
                        onClick={() => {
                          if (currentPet?.id) {
                            // Navegamos a la ruta de gestión médica
                            navigate(`/historial-clinico/${currentPet.id}`); 
                          } else {
                            alert("Por favor, selecciona una mascota en la columna de la izquierda.");
                          }
                        }}
                        className="bg-brand text-white px-8 py-3 rounded-xl font-bold text-xs"
                      >
                        + INICIAR HISTORIAL
                      </button>
                                              </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300">
                    <i className="fas fa-dog text-6xl mb-4 opacity-20"></i>
                    <p className="font-bold">Selecciona un paciente para ver su ficha</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;












