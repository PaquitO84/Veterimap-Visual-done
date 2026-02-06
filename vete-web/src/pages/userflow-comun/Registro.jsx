import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import api from "../../services/api";



const Register = () => {
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get('plan');
  const trialParam = searchParams.get('trial');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    // Si hay un plan en la URL, asumimos que es Profesional
    role: planParam ? 'PROFESSIONAL' : 'PET_OWNER'
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  // --- BLOQUE DE SEGURIDAD PARA PLANES ---
  useEffect(() => {
    // Si el usuario cambia manualmente el selector a PROFESSIONAL 
    // y no hay plan en la URL, podemos dejarlo como 'essential' por defecto
    // o redirigirlo a la sección de servicios.
    if (formData.role === 'PROFESSIONAL' && !planParam) {
      console.log("Registro profesional detectado sin plan previo.");
    }
  }, [formData.role, planParam]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    // Añadimos la info del plan al objeto que enviamos al servidor
    // Dentro de handleSubmit
    const dataToSend = {
      ...formData,
      // Si no hay planParam, pero es profesional, le asignamos 'essential'
      selected_plan: planParam || (formData.role === 'PROFESSIONAL' ? 'essential' : 'none'),
      has_trial: trialParam === 'true' || (formData.role === 'PROFESSIONAL' && !planParam) 
      // Si entra directo, le regalamos el trial igual para que no se bloquee de entrada
    };

    await api.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dataToSend)
    });
      
      // 1. Guardamos el email para que la pantalla de verify sepa a quién verificar
      localStorage.setItem('pendingEmail', formData.email);
      localStorage.setItem('pendingRole', formData.role);

      // 2. Avisamos al usuario (En prod podrías usar un modal más bonito)
      alert("¡Registro exitoso! Por favor, introduce el código que recibiste.");

      // 3. Redirigimos a la pantalla de verificación
      navigate('/verify');
      
    } catch (err) {
      console.error("Error en el registro:", err.message);
      alert(err.message || "Error en el registro. Verifica si el email ya existe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f8f9] flex justify-center items-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <h2 className="text-3xl font-bold text-[bg-brand] text-center mb-6">Crear cuenta</h2>
        
        

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700">Nombre Completo</label>
            <input
              type="text"
              id="name"
              required
              className="w-full p-3 mt-1 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1cabb0] outline-none transition"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              required
              className="w-full p-3 mt-1 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1cabb0] outline-none transition"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Contraseña</label>
            <input
              type="password"
              id="password"
              required
              className="w-full p-3 mt-1 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1cabb0] outline-none transition"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">¿Quién eres?</label>
            <select
              id="role"
              className="w-full p-3 mt-1 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-[#1cabb0] outline-none transition"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="PET_OWNER">Propietario de mascota</option>
              <option value="PROFESSIONAL">Veterinario / Profesional</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full p-4 bg-[bg-brand] text-black font-bold rounded-xl shadow-lg hover:bg-brand transition transform active:scale-95 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Procesando...' : 'Registrarse'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-[#1cabb0] font-bold hover:underline">
            Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;