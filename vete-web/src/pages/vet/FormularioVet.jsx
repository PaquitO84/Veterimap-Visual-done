import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../../context/useAuth";
import api from "../../services/api";

const FormularioVet = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [formData, setFormData] = useState({
    logo_url: '',
    profile_type: 'INDIVIDUAL',
    name: '',
    license_number: '',
    description: '',
    experience: '',
    phone: '',
    contact_email: '',
    addresses: [
      {
        id: Date.now(),
        type: 'PHYSICAL',
        address: '',
        city: '',
        postal_code: '',
        latitude: '',
        longitude: '',
        radius_km: 0,
        is_main: true
      }
    ],
    specialties: [],
    services: [{ name: '', price: '' }],
    accepts_insurance: false,
    insurance_names: '',
    working_hours: {
      monday:    { active: false, start: '09:00', end: '18:00', sede_id: '' },
      tuesday:   { active: false, start: '09:00', end: '18:00', sede_id: '' },
      wednesday: { active: false, start: '09:00', end: '18:00', sede_id: '' },
      thursday:  { active: false, start: '09:00', end: '18:00', sede_id: '' },
      friday:    { active: false, start: '09:00', end: '18:00', sede_id: '' },
      saturday:  { active: false, start: '09:00', end: '18:00', sede_id: '' },
      sunday:    { active: false, start: '09:00', end: '18:00', sede_id: '' },
    },
  });

  // --- BLOQUE DE CARGA DE PERFIL EXISTENTE ---
 useEffect(() => {
    const loadExistingProfile = async () => {
      try {
        const userId = user?.user_id || user?.id;
        if (!userId) return;

        const response = await api.request('/users/me/professional-profile');
        const data = response?.data || response;

        if (data && data.profile_data) {
          const pd = data.profile_data;

          setFormData(prev => ({
            ...prev,
            name: data.name || '',
            logo_url: pd.logo_url || '',
            profile_type: data.entity_type || 'INDIVIDUAL',
            license_number: pd.license_number || '',
            
            // 1. CORRECCIÓN: Aseguramos que cargue la Bio (Sobre ti)
            description: pd.bio || '', 

            phone: pd.contact?.phone || '',
            contact_email: pd.contact?.email || '',

            addresses: pd.addresses ? pd.addresses.map(addr => ({
              id: addr.id_sede || Date.now() + Math.random(),
              type: addr.type || 'PHYSICAL',
              address: addr.full_address || '',
              city: addr.city || '',
              postal_code: addr.postal_code || '',
              latitude: addr.latitude || '',
              longitude: addr.longitude || '',
              radius_km: addr.radius_km || 0,
              is_main: addr.is_main || false
            })) : prev.addresses,

            specialties: pd.specialties || pd.specialization?.specialties || [],
            experience: pd.specialization?.experience || '',

            // 2. CORRECCIÓN: Prioridad a 'pricing.tarifas' para que no salga vacío
            services: (pd.pricing?.tarifas && pd.pricing.tarifas.length > 0) 
              ? pd.pricing.tarifas 
              : (pd.specialization?.detailed_services || [{ name: '', price: '' }]),

            // 3. CORRECCIÓN: Aseguramos la carga de Seguros
            accepts_insurance: pd.insurance_partners?.accepts || false,
            insurance_names: pd.insurance_partners?.companies || '',

            working_hours: {
              ...prev.working_hours,
              ...Object.keys(pd.working_hours || {}).reduce((acc, day) => {
                if (day !== 'opening_hours' && pd.working_hours[day]) {
                  acc[day] = {
                    active: pd.working_hours[day].active !== undefined ? pd.working_hours[day].active : true,
                    start: pd.working_hours[day].start || '09:00',
                    end: pd.working_hours[day].end || '18:00',
                    sede_id: pd.working_hours[day].sede_id || ''
                  };
                }
                return acc;
              }, {})
            }
          }));
        }
      } catch (err) {
        console.log("Perfil no encontrado o error en carga:", err);
      }
    };

    if (user) loadExistingProfile();
  }, [user]);

  // --- FUNCIONES DE GESTIÓN DE DIRECCIONES ---
  const addAddress = (type = 'PHYSICAL') => {
    setFormData(prev => ({
      ...prev,
      addresses: [...prev.addresses, {
        id: Date.now() + Math.random(),
        type: type,
        address: '',
        city: '',
        postal_code: '',
        latitude: '',
        longitude: '',
        radius_km: type === 'HOME_SERVICE' ? 20 : 0,
        is_main: prev.addresses.length === 0
      }]
    }));
  };

  const removeAddress = (id) => {
    if (formData.addresses.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.filter(addr => addr.id !== id)
    }));
  };

  const handleAddressChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.map(addr => addr.id === id ? { ...addr, [field]: value } : addr)
    }));
  };

  const fetchCoordinates = async (id) => {
  const addrObj = formData.addresses.find(a => a.id === id);

  if (addrObj && addrObj.address.length > 3 && addrObj.city) {
    setIsGeocoding(true);

    // Limpiamos la dirección: solo Calle y Número. Quitamos "2º 1ª", "Local", etc.
    const cleanStreet = addrObj.address
      .split(',')[0]
      .replace(/[\d]+[ºª°].*/g, '')
      .replace(/(piso|puerta|izq|der|local|esc).*/i, '')
      .trim();

    // Consultamos por campos separados (Mucho más preciso)
    const params = new URLSearchParams({
      format: 'json',
      street: cleanStreet,      
      city: addrObj.city,          
      postalcode: addrObj.postal_code,
      country: 'Spain',            
      limit: 1,
      addressdetails: 1
    });

    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
      const data = await resp.json();

      if (data && data.length > 0) {
        handleAddressChange(id, 'latitude', data[0].lat);
        handleAddressChange(id, 'longitude', data[0].lon);
        console.log("📍 Coordenadas OK:", data[0].lat, data[0].lon);
      } else {
        alert("No se encontró la ubicación exacta. Intenta poner solo 'Calle y Número'.");
      }
    } catch (err) {
      console.error("Error geocodificando:", err);
    } finally {
      setIsGeocoding(false);
    }
  }
};

  const handleWorkingHoursChange = (day, field, value) => {
    setFormData(prev => ({ 
      ...prev, 
      working_hours: { 
        ...prev.working_hours, 
        [day]: { ...prev.working_hours[day], [field]: value } 
      } 
    }));
  };

  // --- ENVÍO DE DATOS ---
  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  const payload = {
    entity_type: formData.profile_type,
    name: formData.name,
    status: 'VERIFIED',
    is_active: true,

    profile_data: {
      license_number: formData.license_number,
      bio: formData.description, // <--- SOBRE TI
      logo_url: formData.logo_url,
      
      contact: { 
        phone: formData.phone, 
        email: formData.contact_email 
      },

      addresses: formData.addresses.map(addr => ({
        id_sede: addr.id,
        type: addr.type,
        full_address: addr.address,
        city: addr.city,
        postal_code: addr.postal_code,
        latitude: parseFloat(addr.latitude) || 0,
        longitude: parseFloat(addr.longitude) || 0,
        radius_km: parseInt(addr.radius_km) || 0,
        is_main: addr.is_main
      })),

      specialties: formData.specialties,
      
      // NUEVO: SEGUROS (Para que DBeaver los reciba)
      insurance_partners: {
        accepts: formData.accepts_insurance,
        companies: formData.insurance_names
      },

      // NUEVO: TARIFAS (Para eliminar el null)
      pricing: {
        tarifas: formData.services
          .filter(s => s.name.trim() !== "")
          .map(s => ({
            name: s.name,
            price: s.price.toString()
          }))
      },

      specialization: {
        specialties: formData.specialties,
        experience: formData.experience,
        detailed_services: formData.services.filter(s => s.name !== "")
      },

      working_hours: Object.keys(formData.working_hours).reduce((acc, day) => {
        const d = formData.working_hours[day];
        if (d.active) {
          acc[day] = { active: true, start: d.start, end: d.end };
        }
        return acc;
      }, {})
    }
  };

  try {
    await api.request('/users/me/professional-profile', { 
      method: 'POST', 
      body: JSON.stringify(payload) 
    });
    setSuccess(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => navigate('/backoffice-vet'), 2000);
  } catch (err) {
    alert("Error al guardar: " + err.message);
  } finally {
    setLoading(false);
  }
};

  return (

    <div className="min-h-screen bg-gray-50 flex flex-col items-center pb-20 font-sans">

      {/* 1. NAVBAR SUPERIOR */}

      <div className="w-full max-w-5xl flex justify-between items-center p-4 bg-[#e0f7f9] border-b border-[#cceeee] font-semibold text-slate-700">

        <span>Panel Profesional Veterimap</span>

        <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition">

          Cerrar sesión

        </button>

      </div>



      <div className="w-full max-w-4xl mt-8 px-4">

        {/* 2. BOTÓN VOLVER */}

        <button

          onClick={() => navigate(-1)}

          className="mb-6 flex items-center text-slate-500 hover:text-brand font-bold transition-colors group"

        >

          <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 mr-3 group-hover:bg-blue-50">

            <i className="fas fa-arrow-left"></i>

          </div>

          VOLVER AL PANEL

        </button>



        {/* 3. CABECERA */}

        <header className="mb-8">

          <h1 className="text-3xl font-black text-slate-800">Editar Perfil Profesional</h1>

          <p className="text-slate-500 italic">Actualiza tu información pública, sedes y servicios</p>

        </header>



        {/* 4. CONTENEDOR DEL FORMULARIO */}

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">

          {success && (

            <div className="bg-green-100 text-green-700 p-4 rounded-xl text-center mb-6 font-bold text-sm">

              ¡Perfil actualizado correctamente! ✅ Redirigiendo...

            </div>

          )}



          <form onSubmit={handleSubmit} className="space-y-10">

           

            {/* SECCIÓN 1: INFORMACIÓN GENERAL */}

            <section className="space-y-4">

              <h3 className="text-xl font-bold text-slate-800 border-b-2 border-[#e0f7f9] pb-2">Información Profesional</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="md:col-span-2">

                  <label className="block text-sm font-bold text-slate-700 mb-1">Logo URL</label>

                  <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#1cabb0] outline-none" value={formData.logo_url} onChange={e => setFormData({...formData, logo_url: e.target.value})} />

                </div>

                <div>

                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre / Clínica</label>

                  <input type="text" required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#1cabb0] outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />

                </div>

                <div>

                  <label className="block text-sm font-bold text-slate-700 mb-1">Nº Colegiado</label>

                  <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#1cabb0] outline-none" value={formData.license_number} onChange={e => setFormData({...formData, license_number: e.target.value})} />

                </div>

                <div>

                  <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono Público</label>

                  <input type="tel" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#1cabb0] outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />

                </div>

                <div>

                  <label className="block text-sm font-bold text-slate-700 mb-1">Email de Contacto</label>

                  <input type="email" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#1cabb0] outline-none" value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} />

                </div>

              </div>

            </section>



            {/* SECCIÓN 2: MIS SEDES Y UBICACIONES */}

            <section className="space-y-6">

              <div className="flex justify-between items-center border-b-2 border-[#e0f7f9] pb-2">

                <h3 className="text-xl font-bold text-slate-800">Mis Sedes y Ubicaciones</h3>

                <div className="flex gap-2">

                  <button type="button" onClick={() => addAddress('PHYSICAL')} className="text-xs bg-[#1cabb0] text-white px-3 py-1 rounded-lg hover:bg-[#168a8e] transition">+ Clínica</button>

                  <button type="button" onClick={() => addAddress('HOME_SERVICE')} className="text-xs bg-slate-700 text-white px-3 py-1 rounded-lg hover:bg-slate-800 transition">+ Domicilio</button>

                </div>

              </div>

              <div className="space-y-4">

                {formData.addresses.map((addr) => (

                  <div key={addr.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">

                    <div className="flex justify-between items-center mb-4">

                      <span className="text-xs font-bold uppercase text-[#1cabb0]">{addr.type === 'PHYSICAL' ? '📍 Clínica Física' : '🏠 Servicio a Domicilio'}</span>

                      <button type="button" onClick={() => removeAddress(addr.id)} className="text-red-500 text-xs hover:underline font-bold">Eliminar Sede</button>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                      <input type="text" placeholder="Dirección" className="md:col-span-2 p-2 border rounded focus:ring-1 focus:ring-[#1cabb0] outline-none" value={addr.address} onChange={e => handleAddressChange(addr.id, 'address', e.target.value)} onBlur={() => addr.type === 'PHYSICAL' && fetchCoordinates(addr.id)} />

                      <input type="text" placeholder="Ciudad" className="p-2 border rounded focus:ring-1 focus:ring-[#1cabb0] outline-none" value={addr.city} onChange={e => handleAddressChange(addr.id, 'city', e.target.value)} />

                      {addr.type === 'PHYSICAL' ? (

                        <input type="text" placeholder="Código Postal" className="p-2 border rounded focus:ring-1 focus:ring-[#1cabb0] outline-none" value={addr.postal_code} onChange={e => handleAddressChange(addr.id, 'postal_code', e.target.value)} />

                      ) : (

                        <div className="col-span-1">

                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Radio atención (KM)</label>

                          <input type="number" className="w-full p-2 border rounded focus:ring-1 focus:ring-[#1cabb0] outline-none" value={addr.radius_km} onChange={e => handleAddressChange(addr.id, 'radius_km', e.target.value)} />

                        </div>

                      )}

                    </div>

                  </div>

                ))}

              </div>

            </section>



            {/* SECCIÓN 3: HORARIOS Y SEDE DIARIA */}

            <section className="space-y-4">

              <h3 className="text-xl font-bold text-slate-800 border-b-2 border-[#e0f7f9] pb-2">Horarios y Ubicación Diaria</h3>

              <div className="overflow-x-auto border rounded-xl shadow-sm">

                <table className="w-full text-sm text-left">

                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold">

                    <tr>

                      <th className="p-3">Día</th>

                      <th className="p-3">Horario</th>

                      <th className="p-3">Sede Asignada</th>

                    </tr>

                  </thead>

                  <tbody className="divide-y">

                    {Object.keys(formData.working_hours).map((day) => (

                      <tr key={day} className={formData.working_hours[day].active ? "bg-white" : "bg-gray-50 opacity-50"}>

                        <td className="p-3 flex items-center gap-2 capitalize font-medium text-slate-700">

                          <input type="checkbox" className="w-4 h-4 accent-[#1cabb0]" checked={formData.working_hours[day].active} onChange={e => handleWorkingHoursChange(day, 'active', e.target.checked)} />

                          {day.replace('monday','Lunes').replace('tuesday','Martes').replace('wednesday','Miércoles').replace('thursday','Jueves').replace('friday','Viernes').replace('saturday','Sábado').replace('sunday','Domingo')}

                        </td>

                        <td className="p-3">

                          <div className="flex gap-1">

                            <input type="time" className="border p-1 rounded text-xs" value={formData.working_hours[day].start} onChange={e => handleWorkingHoursChange(day, 'start', e.target.value)} disabled={!formData.working_hours[day].active} />

                            <input type="time" className="border p-1 rounded text-xs" value={formData.working_hours[day].end} onChange={e => handleWorkingHoursChange(day, 'end', e.target.value)} disabled={!formData.working_hours[day].active} />

                          </div>

                        </td>

                        <td className="p-3">

                          <select className="w-full border p-1 rounded bg-white text-xs outline-[#1cabb0]" value={formData.working_hours[day].sede_id} onChange={e => handleWorkingHoursChange(day, 'sede_id', e.target.value)} disabled={!formData.working_hours[day].active}>

                            <option value="">-- Seleccionar Sede --</option>

                            {formData.addresses.map(a => (

                              <option key={a.id} value={a.id}>{a.type === 'PHYSICAL' ? '📍' : '🏠(Domicilio)'} {a.address || 'Sede sin nombre'}</option>

                            ))}

                          </select>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </section>



            {/* SECCIÓN 4: ESPECIALIDADES */}

            <section className="space-y-4">

              <h3 className="text-xl font-bold text-slate-800 border-b-2 border-[#e0f7f9] pb-2">Especialidades Médicas</h3>

              <div className="flex flex-wrap gap-2">

                {['Cirugía', 'Dermatología', 'Exóticos', 'Cardiología', 'Oncología', 'Oftalmología', 'Neurología', 'Fisioterapia',

                'Adiestrador / Educación canina', 'Ortopedia y Traumatología',' Nutrición','Felina', 'Equina', 'Aves', 'Animales Silvestres / Zoo'].map(spec => (

                  <button

                    key={spec}

                    type="button"

                    onClick={() => {

                      const exists = formData.specialties?.includes(spec);

                      setFormData({

                        ...formData,

                        specialties: exists

                          ? formData.specialties.filter(s => s !== spec)

                          : [...(formData.specialties || []), spec]

                      });

                    }}

                    className={`px-4 py-2 rounded-full border text-sm transition font-medium ${

                      formData.specialties?.includes(spec)

                        ? 'bg-[#1cabb0] text-white border-[#1cabb0] shadow-md'

                        : 'bg-white text-slate-500 border-slate-200 hover:border-[#1cabb0]'

                    }`}

                  >

                    {spec}

                  </button>

                ))}

              </div>

            </section>



            {/* SECCIÓN 5: SERVICIOS Y TARIFAS (CORREGIDO: 2 CAJAS) */}
            <section className="space-y-4">
              <h3 className="text-xl font-bold text-slate-800 border-b-2 border-[#e0f7f9] pb-2">Catálogo de Servicios y Tarifas</h3>
              <div className="space-y-3">
                {formData.services.map((service, index) => (
                  <div key={index} className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                    {/* Caja 1: Concepto */}
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Concepto del servicio</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Consulta General" 
                        className="w-full p-2 border rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-[#1cabb0]" 
                        value={service.name} 
                        onChange={(e) => {
                          const newServices = [...formData.services];
                          newServices[index].name = e.target.value;
                          setFormData({ ...formData, services: newServices });
                        }} 
                      />
                    </div>
                    {/* Caja 2: Precio */}
                    <div className="w-32">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Precio Total</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          placeholder="0.00"
                          className="w-full p-2 border rounded-lg text-sm pr-6 text-right bg-white outline-none focus:ring-1 focus:ring-[#1cabb0]" 
                          value={service.price} 
                          onChange={(e) => {
                            const newServices = [...formData.services];
                            newServices[index].price = e.target.value;
                            setFormData({ ...formData, services: newServices });
                          }} 
                        />
                        <span className="absolute right-2 top-2 text-slate-400 text-sm">€</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => setFormData({ ...formData, services: formData.services.filter((_, i) => i !== index) })} className="mt-4 text-red-400 hover:text-red-600 transition">✕</button>
                  </div>
                ))}
                <button type="button" onClick={() => setFormData({ ...formData, services: [...formData.services, { name: '', price: '' }] })} className="text-sm font-bold text-[#1cabb0]">+ Añadir nuevo servicio</button>
              </div>
            </section>



            {/* SECCIÓN 6: SEGUROS (RESTAURADA) */}

            <section className="space-y-4">

              <h3 className="text-xl font-bold text-slate-800 border-b-2 border-[#e0f7f9] pb-2">Seguros Veterinarios</h3>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">

                <label className="flex items-center gap-3 cursor-pointer mb-4">

                  <input type="checkbox" className="w-5 h-5 accent-[#1cabb0]" checked={formData.accepts_insurance} onChange={(e) => setFormData({...formData, accepts_insurance: e.target.checked})} />

                  <span className="text-slate-700 font-bold">¿Trabajas con aseguradoras médicas?</span>

                </label>

                {formData.accepts_insurance && (

                  <input type="text" placeholder="Ej: Sanitas, Mapfre, Adeslas..." className="w-full p-3 border rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-[#1cabb0]" value={formData.insurance_names} onChange={(e) => setFormData({...formData, insurance_names: e.target.value})} />

                )}

              </div>

            </section>



            {/* SECCIÓN 7: BIO / DESCRIPCIÓN (RESTAURADA) */}

            <section className="space-y-4">

              <h3 className="text-xl font-bold text-slate-800 border-b-2 border-[#e0f7f9] pb-2">Sobre ti / Tu Clínica</h3>

              <textarea rows="4" className="w-full p-4 border rounded-2xl bg-slate-50 focus:bg-white transition outline-[#1cabb0] text-sm" placeholder="Cuéntale a tus clientes tu experiencia, instalaciones o filosofía de trabajo..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />

            </section>



            {/* BOTÓN SUBMIT */}

            <button

              type="submit"

              disabled={loading || isGeocoding}

              className="w-full bg-[#1cabb0] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#168a8e] shadow-lg transition active:scale-[0.98] disabled:opacity-50"

            >

              {isGeocoding ? 'Localizando sedes...' : (loading ? 'Guardando cambios...' : 'Guardar Perfil Profesional')}

            </button>

          </form>

        </div>

      </div>

    </div>

  );

};



export default FormularioVet;