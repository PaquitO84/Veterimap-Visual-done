import React, { useState, useEffect } from 'react';
import api from "../../services/api";
import { useNavigate } from 'react-router-dom';

const MisMascotas = () => {
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
        // CORRECCIÓN PUNTO 5: La ruta correcta en tu Go es /users/me/pets
        const response = await api.request('/users/me/pets'); 
        
        // Manejamos si la respuesta viene envuelta en .data o es directa
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

  if (loading) return (

    <div className="flex items-center justify-center min-h-screen">
      <p className="text-slate-500 font-medium">Cargando tus mascotas...</p>
    </div>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        
        {/* Breadcrumb / Botón Volver */}
        <button 
          onClick={() => navigate('/backoffice-owner')}
          className="flex items-center text-slate-500 hover:text-blue-600 transition mb-4 font-medium group"
        >
          <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> 
          Volver al Panel
        </button>

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
                {/* MisMascotas.jsx */}
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
      </div>
    </div>
  );
};

export default MisMascotas;