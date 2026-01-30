import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from "../../context/useAuth";
import api from "../../services/api";

const BookingPage = () => {
  const { id } = useParams(); // ID del veterinario
  const navigate = useNavigate();
  const { user } = useAuth();

  const [vetProfile, setVetProfile] = useState(null);
  const [myPets, setMyPets] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedPet, setSelectedPet] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  // Horas de ejemplo (En el futuro esto vendrá de la tabla working_hours)
  const availableSlots = ["09:00", "10:00", "11:00", "16:00", "17:00", "18:00"];

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        // 1. Cargar perfil del veterinario (Tabla professional_accounts)
        const vetData = await api.getProfileDetails(id);
        setVetProfile(vetData.data || vetData);

        // 2. Cargar mis mascotas (Tabla pets filtrada por PET_OWNER)
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
      alert("¡Cita solicitada con éxito! Espera la confirmación del veterinario.");
      navigate('/backoffice-owner'); // O la página principal del cliente
    } catch (err) {
      alert("Error al crear la cita: " + err.message);
    }
  };

  if (loading) return <div className="p-10 text-white">Cargando agenda...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
  <h1 className="text-3xl font-bold text-blue-400">Reservar Cita</h1>
  {/* Usamos user.name para saludar al cliente */}
  <p className="text-slate-400">
    Hola <span className="text-white font-medium">{user?.name}</span>, solicita tu cita con: 
    <span className="text-white font-bold"> {vetProfile?.name}</span>
  </p>
</header>

        <form onSubmit={handleBooking} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Columna 1: Fecha y Hora */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">1. Selecciona el día</label>
              <input 
                type="date" 
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">2. Selecciona la hora</label>
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`p-2 rounded-lg text-sm font-bold border ${selectedTime === slot ? 'bg-blue-600 border-blue-400' : 'bg-slate-900 border-slate-700 hover:border-blue-500'}`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Columna 2: Mascota y Notas */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">3. ¿Para qué mascota?</label>
              <select 
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3"
                value={selectedPet}
                onChange={(e) => setSelectedPet(e.target.value)}
              >
                <option value="">Selecciona una mascota</option>
                {myPets.map(pet => (
                  <option key={pet.id} value={pet.id}>{pet.name} ({pet.species})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">4. Motivo de la consulta (Opcional)</label>
              <textarea 
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 h-24"
                placeholder="Ej: Vacunación, revisión anual..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-blue-900/20"
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