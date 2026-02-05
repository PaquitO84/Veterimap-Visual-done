import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from "../../context/useAuth";
import api from "../../services/api";

const BookingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [vetProfile, setVetProfile] = useState(null);
  const [myPets, setMyPets] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedPet, setSelectedPet] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Slots de tiempo para la reserva
  const availableSlots = ["09:00", "10:00", "11:00", "16:00", "17:00", "18:00"];

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const vetData = await api.getProfileDetails(id);
        setVetProfile(vetData.data || vetData);

        const petsData = await api.getMyPets();
        setMyPets(petsData.data || petsData || []);
      } catch (err) {
        console.error("Error al cargar datos de reserva:", err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [id]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !selectedPet) {
      alert("Por favor rellena todos los campos");
      return;
    }

    try {
      const appointmentData = {
        professional_id: id,
        pet_id: selectedPet,
        appointment_date: `${selectedDate}T${selectedTime}:00Z`,
        notes: notes,
        status: 'PENDING'
      };

      await api.createAppointment(appointmentData);
      setIsSubmitted(true);
    } catch (err) {
      alert("Error al crear la cita: " + err.message);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white font-black italic">
      Cargando agenda...
    </div>
  );

  // --- VISTA DE ÉXITO (Tras Confirmar) ---
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-[2.5rem] p-10 text-center shadow-2xl">
          <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-check text-4xl"></i>
          </div>
          <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter italic">¡Solicitada!</h2>
          <p className="text-slate-400 mb-8">
            Tu cita con el <span className="text-white font-bold">Dr. {vetProfile?.name}</span> para <span className="text-white font-bold">{myPets.find(p => p.id === selectedPet)?.name}</span> ha sido enviada.
          </p>
          <button 
            onClick={() => navigate('/backoffice-owner')}
            className="w-full bg-brand hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all"
          >
            VOLVER A MIS CITAS
          </button>
        </div>
      </div>
    );
  }

  // --- VISTA DEL FORMULARIO ---
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-white mb-4 flex items-center gap-2 font-bold text-xs tracking-widest">
            <i className="fas fa-arrow-left"></i> VOLVER
          </button>
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Reservar Cita</h1>
          <p className="text-slate-400 mt-2">
            Hola <span className="text-blue-400 font-bold">{user?.name}</span>, solicita tu cita con el profesional: 
            <span className="text-white font-bold"> {vetProfile?.name}</span>
          </p>
        </header>

        <form onSubmit={handleBooking} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-800 p-8 rounded-[2rem] border border-slate-700 space-y-6">
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-3 tracking-widest">1. Selecciona el día</label>
              <input 
                type="date" 
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white focus:border-blue-500 outline-none transition"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-3 tracking-widest">2. Selecciona la hora</label>
              <div className="grid grid-cols-3 gap-3">
                {availableSlots.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`py-3 rounded-xl text-sm font-black transition-all border ${
                      selectedTime === slot 
                        ? 'bg-brand border-blue-400 text-white shadow-lg shadow-blue-900/40' 
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-8 rounded-[2rem] border border-slate-700 space-y-6">
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-3 tracking-widest">3. ¿Para qué mascota?</label>
              <select 
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white focus:border-blue-500 outline-none appearance-none"
                value={selectedPet}
                onChange={(e) => setSelectedPet(e.target.value)}
              >
                <option value="">Seleccionar mascota...</option>
                {myPets.map(pet => (
                  <option key={pet.id} value={pet.id}>{pet.name} ({pet.species})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-3 tracking-widest">4. Notas adicionales</label>
              <textarea 
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white focus:border-blue-500 outline-none h-28 resize-none"
                placeholder="Cuéntanos un poco el motivo..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-brand hover:bg-blue-700 text-white font-black py-5 rounded-2xl transition shadow-xl shadow-blue-900/20 uppercase tracking-widest"
            >
              Confirmar Solicitud
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingPage;