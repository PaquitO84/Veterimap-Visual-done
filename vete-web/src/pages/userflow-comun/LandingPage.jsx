import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const LandingPage = () => {
  const [city, setCity] = useState('');
  const [service, setService] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
  e.preventDefault();
  const params = new URLSearchParams();
  
  if (city) params.append('city', city);
  
  if (service) {
    // Si es autónomo, enviamos un flag específico para que el Mapa sepa
    // que debe priorizar o filtrar por la tabla professional_accounts
    params.append('type', service);
  }

  // Esto enviará algo como: /mapa?city=Madrid&type=autonomo
  navigate(`/mapa?${params.toString()}`);
};

  return (
    <div className="bg-gray-50 text-gray-800 font-sans min-h-screen">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-brand flex items-center">
            <i className="fas fa-paw mr-2"></i> Veterimap
          </Link>
          <div className="hidden md:flex space-x-6 items-center">
            <a href="#servicios" className="text-gray-600 hover:text-brand">Servicios</a>
            <Link to="/mapa" className="text-gray-600 hover:text-brand">Explorar Mapa</Link>
            <Link to="/login" className="font-medium">Iniciar Sesión</Link>
            <Link to="/registro" className="bg-brand text-white px-5 py-2 rounded-full hover:bg-blue-700 transition">
              Regístrate
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section & Search */}
      <header className="relative bg-white pt-16 pb-32 overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
              Encuentra al mejor aliado para la <span className="text-brand">salud de tu mascota</span>.
            </h1>
            <p className="text-xl text-gray-600 mb-10">
              Busca clínicas, hospitales y especialistas cerca de ti. La red más grande de profesionales veterinarios a un clic.
            </p>

            <form 
              onSubmit={handleSearch}
              className="bg-white p-4 rounded-xl shadow-2xl flex flex-col md:flex-row gap-4 border border-gray-100"
            >
              <div className="flex-1 flex items-center border-b md:border-b-0 md:border-r border-gray-200 px-3 py-2">
                <i className="fas fa-search text-gray-400 mr-2"></i>
                <input 
                  type="text" 
                  placeholder="¿En qué ciudad estás?" 
                  className="w-full focus:outline-none text-lg"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="flex-1 flex items-center px-3 py-2">
                <i className="fas fa-stethoscope text-gray-400 mr-2"></i>
                <select 
  className="w-full focus:outline-none bg-transparent text-gray-500 text-lg"
  value={service}
  onChange={(e) => setService(e.target.value)}
>
  <option value="">Todos los servicios</option>
  {/* Datos de la tabla señuelo (CLINIC) */}
  <option value="fichas_clinicas">Clínica Veterinaria</option>
  <option value="fichas_hospitales">Hospital 24h (Urgencias)</option>
  <option value="fichas_veterinarios">Atención a Domicilio</option>
  
  {/* Datos de la tabla real (professional_accounts) */}
  <option value="autonomo">Veterinarios Autónomos</option>
</select>
              </div>
              <button 
                type="submit"
                className="bg-brand text-white px-10 py-4 rounded-lg font-bold hover:bg-blue-700 transition transform hover:scale-105"
              >
                BUSCAR AHORA
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Role Selection Section */}
      <section id="servicios" className="bg-gray-100 py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-12">¿Cómo quieres usar Veterimap?</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* Card Dueño */}
            <RoleCard 
              title="Soy dueño de mascota"
              description="Busca especialistas, gestiona citas y guarda el historial de tus peludos de forma gratuita."
              buttonText="Empezar como Dueño"
              icon="fa-paw"
              iconColor="blue"
              link="/registro"
            />

            {/* Card Profesional */}
            <RoleCard 
              title="Soy Profesional"
              description="Digitaliza tu servicio, recibe reservas online y mejora tu visibilidad en nuestra red."
              buttonText="Registrarme como Profesional"
              icon="fa-user-md"
              iconColor="green"
              link="/registro"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

// Subcomponente para las tarjetas para evitar repetición
const RoleCard = ({ title, description, buttonText, icon, iconColor, link }) => {
  const colorClasses = {
    blue: "bg-blue-100 text-brand group-hover:bg-brand",
    green: "bg-green-100 text-green-600 group-hover:bg-green-600"
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-none hover:shadow-xl transition group">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 transition ${colorClasses[iconColor]}`}>
        <i className={`fas ${icon} text-3xl transition group-hover:text-white`}></i>
      </div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      <Link 
        to={link}
        className="inline-block border-2 border-brand text-brand font-bold px-8 py-3 rounded-lg hover:bg-brand hover:text-white transition"
      >
        {buttonText}
      </Link>
    </div>
  );
};

export default LandingPage;