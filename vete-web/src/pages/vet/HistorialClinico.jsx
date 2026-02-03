import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const HistorialClinico = () => {
    const { petId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [pet, setPet] = useState(null);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const [newEntry, setNewEntry] = useState({
        diagnosis: '',
        treatment: '',
        internal_notes: '',
        appointment_id: null
    });

    const isProfessional = user?.role?.toUpperCase() === 'PROFESSIONAL';

    const calculateAge = (birthDate) => {
        if (!birthDate) return "N/A";
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age > 0 ? `${age} años` : "Cachorro";
    };

    const handleBack = () => {
        if (isProfessional) {
            navigate('/clientes');
        } else {
            navigate('/mis-mascotas');
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [petRes, historyRes] = await Promise.all([
                api.request(`/users/me/pets/${petId}`), 
                api.request(`/medical-histories/pet/${petId}`)
            ]);
            
            setPet(petRes);
            setEntries(historyRes || []);
        } catch (err) {
            console.error("Error cargando historial:", err);
        } finally {
            setLoading(false);
        }
    }, [petId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSubmit = async (e) => {
    e.preventDefault();
    
    // El ID que necesitamos es el de la "entidad profesional", 
    // que es el que la DB reconoce para el historial.
    const payload = {
        diagnosis: newEntry.diagnosis,
        treatment: newEntry.treatment,
        internal_notes: newEntry.internal_notes,
        pet_id: petId,
        // IMPORTANTE: Aquí usamos el ID de la entidad, no el user.id
        // Si tienes el perfil cargado en el estado 'pet', 
        // a veces el backend devuelve el professional_id ahí.
        // Si no, lo ideal es que el 'user' del contexto ya traiga su entity_id.
        professional_id: "4f1b0e77-4a4a-47d0-973e-cb5ca3710b45", 
        appointment_id: newEntry.appointment_id || null
    };

    try {
        await api.request('/medical-histories', 'POST', payload);
        
        setShowForm(false);
        setNewEntry({ 
            diagnosis: '', 
            treatment: '', 
            internal_notes: '', 
            appointment_id: null 
        });
        
        fetchData();
        alert("Historial actualizado correctamente ✅");
        
    } catch (err) {
        console.error("Error al guardar historial:", err);
        alert("Error al guardar: Revisa que todos los campos obligatorios estén llenos.");
    }
};
    // Renderizado de carga
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-slate-400">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="font-bold">Sincronizando historial médico...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Barra de navegación superior / Botón Volver Inteligente */}
            <div className="max-w-4xl mx-auto px-6 pt-6">
                <button 
                    onClick={handleBack}
                    className="flex items-center text-slate-500 hover:text-blue-600 transition mb-4 font-bold group text-sm uppercase tracking-widest"
                >
                    <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> 
                    {isProfessional ? 'Volver a Clientes' : 'Mis Mascotas'}
                </button>
            </div>

            {/* --- CABECERO / FICHA TÉCNICA DE LA MASCOTA --- */}
            <div className="bg-white border-b shadow-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <button onClick={handleBack} className="mt-1 text-slate-300 hover:text-blue-600 transition-colors">
                                <i className="fas fa-arrow-left text-xl"></i>
                            </button>
                            <div>
                                <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                                    {pet?.name}
                                    <span className={`text-xs px-2 py-1 rounded-lg ${pet?.gender === 'macho' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                                        {pet?.gender === 'macho' ? '♂' : '♀'}
                                    </span>
                                </h1>
                                <p className="text-blue-600 font-bold text-sm tracking-widest uppercase">
                                    {pet?.species} {pet?.breed ? `• ${pet.breed}` : ''}
                                </p>
                            </div>
                        </div>

                        {isProfessional && (
                            <button 
                                onClick={() => setShowForm(!showForm)}
                                className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                            >
                                {showForm ? <i className="fas fa-times"></i> : <i className="fas fa-plus"></i>}
                                {showForm ? 'CANCELAR' : 'REGISTRAR VISITA'}
                            </button>
                        )}
                    </div>

                    {/* Grid de Datos Rápidos */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 pt-6 border-t border-slate-50">
                        <div className="bg-slate-50 p-3 rounded-2xl text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Especie</p>
                            <p className="font-bold text-slate-700 capitalize">
                                {pet?.species === 'perro' ? '🐕 Perro' : pet?.species === 'gato' ? '🐈 Gato' : pet?.species || '--'}
                            </p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Raza</p>
                            <p className="font-bold text-slate-700 capitalize truncate px-1">
                                {pet?.breed || 'Mestizo'}
                            </p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Edad</p>
                            <p className="font-bold text-slate-700">{calculateAge(pet?.birth_date)}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Peso</p>
                            <p className="font-bold text-slate-700">{pet?.weight > 0 ? `${pet.weight} kg` : '--'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Salud</p>
                            <p className="font-bold text-emerald-600 flex items-center justify-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                Estable
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cuerpo del Historial */}
            <div className="max-w-4xl mx-auto p-6">
                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-white border-2 border-blue-500/20 p-6 rounded-[2rem] shadow-2xl mb-10 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg">
                                <i className="fas fa-pen-nib"></i>
                            </div>
                            <h3 className="font-black text-slate-800 text-xl tracking-tight">Nueva Anotación Clínica</h3>
                        </div>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-2 block">Diagnóstico del Paciente</label>
                                <textarea 
                                    required
                                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 ring-blue-500/10 border-none transition-all"
                                    rows="3"
                                    placeholder="Describe los síntomas y el diagnóstico..."
                                    value={newEntry.diagnosis}
                                    onChange={(e) => setNewEntry({...newEntry, diagnosis: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-2 block">Tratamiento y Medicación</label>
                                <textarea 
                                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 ring-emerald-500/10 border-none transition-all"
                                    rows="3"
                                    placeholder="Instrucciones para el dueño..."
                                    value={newEntry.treatment}
                                    onChange={(e) => setNewEntry({...newEntry, treatment: e.target.value})}
                                />
                            </div>
                            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                                <label className="text-xs font-black text-amber-600 uppercase mb-2 block flex items-center gap-2">
                                    <i className="fas fa-lock text-[10px]"></i> Notas Privadas (Solo para el equipo médico)
                                </label>
                                <textarea 
                                    className="w-full p-4 bg-white rounded-xl outline-none focus:ring-4 ring-amber-500/10 border-none transition-all text-amber-900"
                                    rows="2"
                                    placeholder="Anotaciones que el dueño no verá..."
                                    value={newEntry.internal_notes}
                                    onChange={(e) => setNewEntry({...newEntry, internal_notes: e.target.value})}
                                />
                            </div>
                            <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all">
                                PUBLICAR EN HISTORIAL
                            </button>
                        </div>
                    </form>
                )}

                <div className="space-y-8 mt-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Cronología Médica</h3>
                    
                    {entries.length === 0 ? (
                        <div className="bg-white rounded-[2.5rem] p-16 text-center border-2 border-dashed border-slate-200">
                            <p className="text-slate-500 font-bold">No hay registros médicos para esta mascota.</p>
                        </div>
                    ) : (
                        entries.map((entry) => (
                            <div key={entry.id} className="group relative pl-8 border-l-2 border-slate-200 ml-4 pb-8 last:pb-0">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-blue-600 shadow-sm transition-transform"></div>
                                <div className="bg-white border rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase">
                                            {new Date(entry.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2">Diagnóstico clínico</h4>
                                            <p className="text-slate-800 font-bold text-lg leading-tight">{entry.diagnosis}</p>
                                        </div>
                                        {entry.treatment && (
                                            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50">
                                                <h4 className="text-[9px] font-black text-emerald-600 uppercase mb-2 tracking-widest">Tratamiento</h4>
                                                <p className="text-sm text-slate-700 leading-relaxed font-medium">{entry.treatment}</p>
                                            </div>
                                        )}
                                        {isProfessional && entry.internal_notes && (
                                            <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100/50">
                                                <h4 className="text-[9px] font-black text-amber-600 uppercase mb-2 tracking-widest flex items-center gap-2">
                                                    <i className="fas fa-lock"></i> Notas Internas
                                                </h4>
                                                <p className="text-xs text-amber-900 italic font-medium leading-relaxed">{entry.internal_notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistorialClinico;