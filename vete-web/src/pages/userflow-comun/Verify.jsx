import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from "../../services/api";

const Verify = () => {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState({ text: '', isError: false });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const pendingEmail = localStorage.getItem('pendingEmail');
    if (!pendingEmail) {
      setMessage({ text: 'No se encontró un email pendiente. Regresa al registro.', isError: true });
    } else {
      setEmail(pendingEmail);
    }
  }, []);

  const handleVerify = async () => {
    if (code.length < 6) {
      setMessage({ text: 'Introduce el código completo de 6 dígitos.', isError: true });
      return;
    }

    setLoading(true);
    setMessage({ text: '', isError: false });

    try {
      await api.request('/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code })
      });

      setMessage({ text: '¡Cuenta verificada con éxito! Redirigiendo...', isError: false });

      // RECUPERAMOS EL ROL PARA SABER A DÓNDE IR
      const pendingRole = localStorage.getItem('pendingRole');

      setTimeout(() => {
        // Limpiamos los datos temporales antes de irnos
        localStorage.removeItem('pendingEmail');
        localStorage.removeItem('pendingRole');

        // Si es profesional, directo al formulario de Vet
        if (pendingRole === 'PROFESSIONAL') {
          navigate('/formulario-vet');
        } else {
          // Si es dueño o no hay rol, al formulario de Owner
          navigate('/formulario-owner');
        }
      }, 2000);

    } catch (err) {
      setMessage({ text: err.message || 'Código incorrecto o expirado.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  // NUEVA FUNCIÓN: Para evitar que el usuario se quede atrapado por un error de rol
  const handleCancel = () => {
    if (window.confirm("¿Deseas cancelar este registro? Tendrás que empezar de nuevo.")) {
      localStorage.removeItem('pendingEmail');
      localStorage.removeItem('pendingRole'); // <--- Añade esta línea
      navigate('/registro');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f8f9] flex justify-center items-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-gray-100">
        <h2 className="text-3xl font-bold text-[#1cabb0] mb-2">Verifica tu cuenta</h2>
        <p className="text-gray-500 text-sm mb-6">
          Introduce el código de 6 dígitos enviado para: <br />
          <span className="font-bold text-slate-700">{email || '---'}</span>
        </p>

        <input
          type="text"
          maxLength="6"
          placeholder="000000"
          className="w-full text-4xl text-center tracking-[10px] font-mono p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1cabb0] outline-none transition mb-6"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          autoFocus
        />

        <div className="space-y-3">
          <button
            onClick={handleVerify}
            disabled={loading || !email || code.length < 6}
            className={`w-full p-4 bg-[#1cabb0] text-white font-bold rounded-xl shadow-lg hover:bg-[#168a8e] transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Verificando...' : 'Verificar Cuenta'}
          </button>

          <button 
            onClick={handleCancel}
            className="w-full p-2 text-gray-400 text-xs hover:text-red-500 hover:underline transition"
          >
            ¿Email o Rol incorrecto? Cancelar y volver al registro
          </button>
        </div>

        {message.text && (
          <p className={`mt-4 text-sm font-semibold ${message.isError ? 'text-red-500' : 'text-green-600'}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
};

export default Verify;