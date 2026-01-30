import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from "../../context/useAuth";
import api from "../../services/api";

const BackofficeOwner = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [nextAppointments, setNextAppointments] = useState([]);
  const [myPets, setMyPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  

 useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        // 1. Cargamos el perfil. 
        // Usamos api.request que ya maneja el BASE_URL y el Token.
        const profileRes = await api.request('/users/me/profile');
        
        // Normalización de la respuesta: extraemos el objeto de usuario
        const profile = profileRes?.user || profileRes;

        // FLUJO INTELIGENTE: Si el perfil no tiene datos esenciales, redirigimos.
        // Usamos el encadenamiento opcional (?.) para evitar errores de lectura.
        if (!profile || !profile.name || !profile.city) {
          console.warn("Perfil incompleto detectado, redirigiendo al formulario...");
          navigate('/formulario-owner');
          return; 
        }

        // Si llegamos aquí, el perfil es válido.
        setUserData(profile);

        // 2. Cargamos el resto de datos en paralelo para mayor velocidad
        const [appRes, petsRes] = await Promise.all([
          api.request('/users/me/appointments'), 
          api.request('/users/me/pets')          
        ]);
        
        // Validación de Array: Si el backend devuelve error o nulo, inicializamos como []
        const appointments = Array.isArray(appRes) ? appRes : (appRes?.data || []);
        const pets = Array.isArray(petsRes) ? petsRes : (petsRes?.data || []);

        setNextAppointments(appointments);
        setMyPets(pets);

      } catch (err) {
        console.error("Error crítico cargando dashboard:", err);
        // Si el error es de autenticación (401), el interceptor de api.js debería manejarlo,
        // pero si es un 404 (no existe perfil), mandamos al formulario.
        navigate('/formulario-owner');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await logout(); // Limpia estado y localStorage
      navigate('/login');
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      navigate('/login'); // Forzamos salida incluso con error
    }
  };

  // PROTECCIÓN DE RENDERIZADO: 
  // Mostramos el loader mientras 'loading' es true O 'userData' es null.
  if (loading || !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4 text-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-500 font-medium">Sincronizando tus mascotas...</p>
        </div>
      </div>
    );
  }

  // A partir de aquí, el código de abajo puede usar userData.name, etc., con total seguridad.
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

      {/* Contenido Principal */}
      <main className="flex-1 p-4 md:p-10 pb-28 md:pb-10 overflow-y-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
  ¡Hola, {user?.name ? user.name.split('@')[0] : 'Usuario'}! 👋
</h1>
            <p className="text-slate-500 font-medium">Gestiona la salud de tus mascotas.</p>
          </div>
          <Link to="/mapa" className="w-full sm:w-auto text-center bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 transition shadow-lg shadow-blue-200 uppercase text-xs tracking-widest">
            Reservar Cita
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Card: Próximas Citas */}
          <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">Próximas Citas</h3>
               <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full">SINCRONIZADO</span>
            </div>
            
            {nextAppointments.length > 0 ? (
              <div className="space-y-4">
                {nextAppointments.map(app => (
                  <div key={app.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-3 rounded-xl shadow-sm text-center min-w-[60px]">
                        <p className="text-[10px] font-black text-blue-600 uppercase">{new Date(app.appointment_date).toLocaleString('es-ES', {month: 'short'})}</p>
                        <p className="text-xl font-black text-slate-800">{new Date(app.appointment_date).getDate()}</p>
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-lg leading-tight">{app.pet_name || "Mascota"}</p>
                        <p className="text-sm text-slate-500 font-medium">Clínica: {app.professional_name || "Veterinaria"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="text-slate-700 font-black bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-sm">
                        {new Date(app.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No hay citas en el horizonte</p>
                <Link to="/mapa" className="text-blue-600 text-xs font-black mt-2 inline-block underline">BUSCAR VETERINARIO</Link>
              </div>
            )}
          </div>

          {/* Card: Mis Mascotas */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">Mascotas</h3>
              <Link to="/mis-mascotas" className="text-blue-600 text-[10px] font-black uppercase tracking-widest hover:underline">Ver Todo</Link>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {myPets.map(pet => (
                <div key={pet.id} className="flex flex-col items-center group cursor-pointer">
                  <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-3xl shadow-sm transition-all group-hover:bg-blue-600 group-hover:text-white group-hover:-translate-y-1">
                    {pet.species?.toLowerCase() === 'perro' || pet.species?.toLowerCase() === 'dog' ? '🐶' : 
                     pet.species?.toLowerCase() === 'gato' || pet.species?.toLowerCase() === 'cat' ? '🐱' : '🐾'}
                  </div>
                  <p className="text-[10px] font-black text-slate-600 mt-2 uppercase truncate w-full text-center">{pet.name}</p>
                </div>
              ))}
              <Link to="/add-pet" className="w-16 h-16 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-400 hover:bg-blue-50 transition-all font-black text-2xl">
                +
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BackofficeOwner;