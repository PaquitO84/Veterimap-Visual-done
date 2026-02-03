import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import api from '../../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Login contra el endpoint de Go
      const loginRes = await api.login({ email, password });
      const token = loginRes.token || loginRes.data?.token;

      if (!token) throw new Error("Credenciales inválidas o cuenta no verificada");

      // 2. Guardar token en contexto
      await login(token); 
      
      // 3. Pedir los datos frescos del perfil
      const profileRes = await api.getOwnProfile();
      // Extraemos el rol de forma segura
      const userRole = (profileRes.user?.role || profileRes.role)?.toUpperCase();

      // --- REDIRECCIÓN INTELIGENTE ---
      if (userRole === 'PROFESSIONAL') {
          try {
              const profData = await api.getProfileDetails(); 
              if (profData && profData.name) {
                  navigate('/backoffice-vet');
              } else {
                  navigate('/formulario-vet');
              }
          } catch {
              // Si falla (404), es que no tiene perfil creado aún
              navigate('/formulario-vet');
          }
      } 
      else if (userRole === 'PET_OWNER') {
          try {
              const pets = await api.getMyPets();
              if (pets && pets.length > 0) {
                  navigate('/backoffice-owner');
              } else {
                  navigate('/formulario-owner');
              }
          } catch {
              navigate('/formulario-owner');
          }
      } 
      else {
          navigate('/mapa');
      }

    } catch (loginErr) {
      console.error("Fallo en la autenticación:", loginErr.message);
      alert(loginErr.message || "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🐾</div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Hola de nuevo</h2>
          <p className="text-slate-500 mt-2 font-medium">Entra en tu cuenta de Veterimap</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Contraseña</label>
            <input
              type="password"
              required
              className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all transform active:scale-95 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Cargando...</span>
              </div>
            ) : 'ENTRAR'}
          </button>
        </form>

        <div className="mt-8 text-center text-slate-500 text-sm font-medium">
          ¿Aún no tienes cuenta?{' '}
          <Link to="/registro" className="text-blue-600 font-bold hover:underline">
            Crea una aquí
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;