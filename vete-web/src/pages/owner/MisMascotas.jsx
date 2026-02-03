import React, { useState, useEffect } from 'react';
import api from "../../services/api";
import { useNavigate, Link } from 'react-router-dom'; // Añadido Link
import { useAuth } from "../../context/useAuth"; // Añadido useAuth

const MisMascotas = () => {
  const { logout } = useAuth(); // Extraemos logout del contexto
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Función para calcular edad desde birth_date
  const calculateAge = (birthDate) => {
    if (!birthDate) return "?";
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age < 0 ? 0 : age;
  };

  // Mapa de emojis por especie
  const speciesEmoji = {
    Dog: '🐶',
    Cat: '🐱',
    Bird: '🦜',
    Horse: '🐴',
    Reptile: '🦎',
    Other: '🐾'
  };

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const response = await api.request('/users/me/pets'); 
        const data = response.data || response;
        setPets(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error al cargar mascotas:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPets();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error("Error al cerrar sesión", err);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-slate-500 font-medium">Cargando tus mascotas...</p>
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
            <span className="text-[10px] md:text-sm font-bold uppercase md:capitalize">Perfil</span>
          </Link>
        </nav>

        <button 
          onClick={handleLogout} 
          className="hidden md:flex items-center gap-3 p-3 text-red-400 hover:bg-red-900/20 rounded-xl transition font-bold mt-auto mb-6 mx-4"
        >
          <span>🚪</span> Cerrar Sesión
        </button>
      </aside>

      {/* Contenedor de Contenido Principal */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Mis Mascotas</h1>
          <button 
            onClick={() => navigate('/formulario-owner')} 
            className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            + Añadir Mascota
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map(pet => (
            <div key={pet.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
              <div className="text-4xl mb-4 bg-slate-50 w-16 h-16 flex items-center justify-center rounded-2xl">
                {speciesEmoji[pet.species] || '🐾'}
              </div>
              <h3 className="text-xl font-bold text-slate-800">{pet.name}</h3>
              <p className="text-slate-500 text-sm">
                {pet.breed} • {calculateAge(pet.birth_date)} años
              </p>
              
              <span className={`text-[10px] px-3 py-1 rounded-full font-black mt-3 inline-block uppercase tracking-wider ${
                pet.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {pet.gender === 'Female' ? 'Hembra' : 'Macho'}
              </span>

              <div className="mt-6 pt-4 border-t border-slate-50 flex gap-4">
                <button 
                  onClick={() => navigate(`/historial-clinico/${pet.id}`)}
                  className="text-sm font-bold text-blue-600 hover:text-blue-800 transition"
                >
                  Ver Historial
                </button>
              </div>
            </div>
          ))}
          
          {pets.length === 0 && (
            <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-medium">Aún no tienes mascotas registradas.</p>
              <button 
                onClick={() => navigate('/formulario-owner')}
                className="mt-4 text-blue-600 font-bold hover:underline"
              >
                Registrar mi primera mascota
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}; // ESTA LLAVE ES LA QUE FALTABA

export default MisMascotas;