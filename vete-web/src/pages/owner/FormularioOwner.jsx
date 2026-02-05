import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../../context/useAuth";
import api from "../../services/api";

const FormularioOwner = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { user, checkProfileStatus } = useAuth();

  // Mantenemos TODOS tus campos originales
  const [ownerData, setOwnerData] = useState({
    name: user?.name || '',
    contact_email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    profile_picture: ''
  });

  const [petsList, setPetsList] = useState([]);

  useEffect(() => {
    const fetchExistingData = async () => {
      setLoading(true);
      try {
        const response = await api.request('/users/me/profile');
        const data = response.user || response;
        
        if (data && data.name) {
          setOwnerData({
            name: data.name || '',
            contact_email: data.contact_info?.email || user?.email || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            postal_code: data.postal_code || '',
            profile_picture: data.profile_picture || ''
          });
        }

        const petsRes = await api.request('/users/me/pets');
        const petsData = petsRes.data || petsRes;

        if (petsData && petsData.length > 0) {
          const mappedPets = petsData.map(p => ({
            id: p.id, // Mantenemos el ID real de la DB para el ON CONFLICT
            name: p.name,
            species: p.species,
            otherSpecies: '', 
            breed: p.breed,
            birth_date: p.birth_date ? p.birth_date.split('T')[0] : '',
            weight: (p.weight !== undefined && p.weight !== null && p.weight !== 0) ? String(p.weight) : '',
            gender: p.gender,
            isNew: false 
          }));
          setPetsList(mappedPets);
        } else {
          // Si no hay mascotas, inicializamos una vacía con id: null
          setPetsList([{ 
            id: null, 
            name: '', 
            species: 'Dog', 
            otherSpecies: '', 
            breed: '', 
            birth_date: '', 
            weight: '', 
            gender: 'Male', 
            isNew: true 
          }]);
        }
      } catch (err) {
        console.error("Error al cargar:", err);
        setPetsList([{ id: null, name: '', species: 'Dog', otherSpecies: '', breed: '', birth_date: '', weight: '', gender: '', isNew: true }]);
      } finally {
        setLoading(false);
      }
    };
    fetchExistingData();
  }, [user]);

  const addMascota = () => {
    setPetsList([...petsList, { 
      id: `new-${Date.now()}`, // ID temporal único para que React no se confunda
      dbId: null,
      name: '', 
      species: 'Dog', 
      otherSpecies: '', 
      breed: '', 
      birth_date: '', 
      weight: '', 
      gender: '', 
      isNew: true 
    }]);
  };

  const removeMascota = (id) => {
    if (petsList.length > 1) setPetsList(petsList.filter(p => p.id !== id));
  };

  const updatePetField = (id, field, value) => {
    setPetsList(petsList.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación de seguridad básica
    if (petsList.some(pet => !pet.name.trim())) {
      alert("Por favor, ponle nombre a todas tus mascotas.");
      return;
    }

    setLoading(true);
    try {
      // 1. Actualizar perfil del dueño (Ruta sincronizada con Go)
      // Enviamos el objeto plano que el repositorio de Go espera recibir
      await api.request('/users/me/profile', {
  method: 'POST',
  body: JSON.stringify({
      name: ownerData.name,
      phone: ownerData.phone,
      city: ownerData.city,
      address: ownerData.address,
      postal_code: ownerData.postal_code,
      contact_info: { 
          email: ownerData.contact_email || user?.email, // <--- ASEGÚRATE DE ESTO
          phone: ownerData.phone
            }
        })
      });

      // 2. Procesar mascotas (Iteramos sobre la lista)
      const promises = petsList.map(pet => {
        const finalSpecies = pet.species === 'Other' ? pet.otherSpecies : pet.species;
        
        const petPayload = {
          id: String(pet.id).startsWith('new-') ? null : pet.id, 
        
          name: pet.name.trim(),
          species: finalSpecies,
          breed: pet.breed.trim() || "Desconocida",
          birth_date: pet.birth_date ? `${pet.birth_date}T00:00:00Z` : null,
          
          // Forzamos el número decimal para Go
          weight: (pet.weight === '' || pet.weight === null) ? null : parseFloat(pet.weight),
          
          gender: pet.gender,
          health_metadata: {} 
      };

        return api.request('/users/me/pets', {
          method: 'POST', 
          body: JSON.stringify(petPayload)
        });
      });

      await Promise.all(promises);

      // 3. ¡CORRECCIÓN! Usamos la función del contexto para avisar a la App 
      // de que el perfil ya existe en la DB.
      if (checkProfileStatus) {
          await checkProfileStatus(); 
      }

      alert("¡Perfil y mascotas guardados con éxito!");
      
      // 4. Redirección
      navigate('/backoffice-owner');

    } catch (err) {
      console.error("Error al guardar:", err);
      alert("Hubo un error al guardar los datos. Por favor, revisa la conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">

      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden">

       

        <div className="flex border-b text-sm">

          <button onClick={() => setStep(1)} className={`flex-1 p-4 text-center font-bold transition ${step === 1 ? 'bg-brand text-white' : 'bg-slate-50 text-slate-400'}`}>1. Datos de Dueño</button>

          <button onClick={() => setStep(2)} className={`flex-1 p-4 text-center font-bold transition ${step === 2 ? 'bg-brand text-white' : 'bg-slate-50 text-slate-400'}`}>2. Tus Mascotas</button>

        </div>



        <form onSubmit={handleSubmit} className="p-8">

          {step === 1 && (

            <div className="space-y-4 animate-fadeIn">

              <h2 className="text-2xl font-bold text-slate-800">Tus Datos</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <input type="text" placeholder="Nombre" className="p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={ownerData.name} onChange={e => setOwnerData({...ownerData, name: e.target.value})} required />

                <input type="tel" placeholder="Teléfono" className="p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={ownerData.phone} onChange={e => setOwnerData({...ownerData, phone: e.target.value})} />

                <input type="text" placeholder="Dirección" className="p-3 border rounded-xl md:col-span-2 focus:ring-2 focus:ring-blue-500 outline-none" value={ownerData.address} onChange={e => setOwnerData({...ownerData, address: e.target.value})} />

                <input type="text" placeholder="Ciudad" className="p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={ownerData.city} onChange={e => setOwnerData({...ownerData, city: e.target.value})} />

                <input type="text" placeholder="Código Postal" className="p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={ownerData.postal_code} onChange={e => setOwnerData({...ownerData, postal_code: e.target.value})} />

              </div>

              <button type="button" onClick={() => setStep(2)} className="w-full bg-brand text-white py-4 rounded-2xl font-bold mt-6 shadow-lg hover:bg-blue-700 transition">Siguiente: Mascotas</button>

            </div>

          )}



          {step === 2 && (

            <div className="space-y-6 animate-fadeIn">

              <div className="flex justify-between items-center">

                <h2 className="text-2xl font-bold text-slate-800">Tus Mascotas</h2>

                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{petsList.length} registradas</span>

              </div>

             

              {petsList.map((pet, index) => (

                <div key={pet.id} className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 relative group">

                  {petsList.length > 1 && (

                    <button type="button" onClick={() => removeMascota(pet.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition">✕</button>

                  )}

                 

                  <div className="flex items-center gap-2 mb-4">

                    <p className="text-xs font-black text-brand uppercase tracking-wider">Mascota #{index + 1}</p>

                    {!pet.isNew && <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-md font-bold">GUARDADA</span>}

                  </div>

                 

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="space-y-1">

                        <label className="text-[10px] font-bold text-slate-400 ml-1">NOMBRE</label>

                        <input type="text" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-400 outline-none bg-white" value={pet.name} onChange={e => updatePetField(pet.id, 'name', e.target.value)} required />

                    </div>

                   

                   <div className="space-y-1">
  <label className="text-[10px] font-bold text-slate-400 ml-1">ESPECIE</label>
  <select 
    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-400 outline-none bg-white" 
    value={pet.species} 
    onChange={e => updatePetField(pet.id, 'species', e.target.value)}
  >
    <option value="Dog">Perro</option>
    <option value="Cat">Gato</option>
    <option value="Bird">Ave</option>
    <option value="Horse">Equino</option>
    <option value="Reptile">Reptil</option>
    <option value="Other">Otro...</option>
  </select>

  {/* Lógica para mostrar la caja de texto si selecciona "Other" */}
  {pet.species === 'Other' && (
    <div className="mt-2 animate-fadeIn">
      <label className="text-[9px] font-black text-brand uppercase ml-1">Especifique especie</label>
      <input
        type="text"
        placeholder="Ej: Hurón, Conejo, Tigre..."
        className="w-full p-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none bg-blue-50/30 transition-all"
        value={pet.otherSpecies || ''}
        onChange={e => updatePetField(pet.id, 'otherSpecies', e.target.value)}
        required
      />
    </div>
  )}
</div>


                    <div className="space-y-1">

                        <label className="text-[10px] font-bold text-slate-400 ml-1">FECHA DE NACIMIENTO</label>

                        <input type="date" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-400 outline-none bg-white" value={pet.birth_date} onChange={e => updatePetField(pet.id, 'birth_date', e.target.value)} />

                    </div>



                    <div className="space-y-1">

                        <label className="text-[10px] font-bold text-slate-400 ml-1">PESO (KG)</label>

                        <input type="number" step="0.1" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-400 outline-none bg-white" value={pet.weight} onChange={e => updatePetField(pet.id, 'weight', e.target.value)} />

                    </div>

                   

                    <div className="space-y-1">

                      <label className="text-[10px] font-bold text-slate-400 ml-1">GÉNERO</label>

                      <select className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-400 outline-none bg-white" value={pet.gender} onChange={e => updatePetField(pet.id, 'gender', e.target.value)}>

                        <option value="Male">Macho</option>

                        <option value="Female">Hembra</option>

                      </select>

                    </div>



                    <div className="space-y-1">

                        <label className="text-[10px] font-bold text-slate-400 ml-1">RAZA</label>

                        <input type="text" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-400 outline-none bg-white" value={pet.breed} onChange={e => updatePetField(pet.id, 'breed', e.target.value)} />

                    </div>

                  </div>

                </div>

              ))}



              <button type="button" onClick={addMascota} className="w-full py-4 border-2 border-dashed border-blue-200 text-brand rounded-2xl font-bold hover:bg-blue-50 transition-colors tracking-wide">+ AÑADIR OTRA MASCOTA</button>



              <div className="flex gap-4 pt-4">

                <button type="button" onClick={() => setStep(1)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition">Atrás</button>

                <button type="submit" disabled={loading} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-green-700 disabled:opacity-50 transition">

                  {loading ? 'Guardando...' : 'Finalizar y Guardar'}

                </button>

              </div>

            </div>

          )}

        </form>

      </div>

    </div>

  );

};



export default FormularioOwner;