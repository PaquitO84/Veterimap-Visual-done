import React from 'react';
import { useNavigate } from 'react-router-dom';

const Suscripciones = () => {
  const navigate = useNavigate();

  const planes = [
    {
      nombre: "Plan ESSENTIAL",
      tag: "FREE",
      enfoque: "Visibilidad básica para empezar.",
      precio: "0€",
      detalles: "Para siempre",
      buttonText: "Empezar Gratis",
      popular: false,
      caracteristicas: [
        { label: "Perfil en Mapa", desc: "Estándar (baja prioridad)" },
        { label: "Sello Verificado", desc: "Sí (tras validación)" },
        { label: "Agendamiento", desc: "Manual (solo contacto)" },
        { label: "Historial Clínico", desc: "Lectura limitada" },
        { label: "Soporte", desc: "Comunidad / Email" }
      ]
    },
    {
      nombre: "Plan PREMIUM",
      tag: "RECOMENDADO",
      enfoque: "La gestión total de tu negocio.",
      precio: "70€",
      detalles: "/ mes + IVA",
      trial: "2 Meses de Trial Incluido",
      buttonText: "Suscribirse ahora",
      popular: true,
      caracteristicas: [
        { label: "Perfil en Mapa", desc: "Destacado (prioridad total)" },
        { label: "Sello Verificado", desc: "Sí + Distintivo rápido" },
        { label: "Agendamiento", desc: "Reserva Online 24/7" },
        { label: "Recordatorios", desc: "Automáticos por Email" },
        { label: "Historial Clínico", desc: "Gestión Integral Compartida" },
        { label: "Soporte", desc: "WhatsApp Premium" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-20 px-4 font-sans">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
          Impulsa tu <span className="text-brand">Clínica Veterinaria</span>
        </h1>
        <p className="text-slate-500 text-lg mb-16 max-w-2xl mx-auto">
          Elige el plan que mejor se adapte a tus necesidades. Sin compromiso de permanencia.
        </p>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {planes.map((plan, idx) => (
            <div 
              key={idx} 
              className={`relative bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl transition-all hover:-translate-y-2 border-2 ${
                plan.popular ? 'border-brand ring-4 ring-brand/10' : 'border-slate-100'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-brand text-white text-[10px] font-black px-6 py-2 rounded-full tracking-widest shadow-lg">
                  {plan.tag}
                </span>
              )}

              <div className="text-left mb-8">
                <h3 className="text-2xl font-black text-slate-800 mb-2">{plan.nombre}</h3>
                <p className="text-slate-400 font-medium text-sm">{plan.enfoque}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-black text-slate-900">{plan.precio}</span>
                <span className="text-slate-400 font-bold">{plan.detalles}</span>
              </div>

              {plan.trial && (
                <div className="bg-emerald-50 text-emerald-600 font-bold text-xs p-3 rounded-xl mb-8 flex items-center justify-center gap-2 italic">
                  <i className="fas fa-gift"></i> {plan.trial}
                </div>
              )}

              <ul className="space-y-4 mb-10">
                {plan.caracteristicas.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-left">
                    <i className={`fas fa-check-circle mt-1 ${plan.popular ? 'text-brand' : 'text-slate-300'}`}></i>
                    <div>
                      <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">{item.label}</p>
                      <p className="text-sm text-slate-500 font-medium">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => navigate('/registro')}
                className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                  plan.popular 
                  ? 'bg-brand text-white hover:bg-brand-dark shadow-brand/20' 
                  : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-12 text-slate-400 text-xs font-bold uppercase tracking-widest">
          ¿Tienes dudas? <span className="text-brand cursor-pointer hover:underline">Contacta con soporte</span>
        </p>
      </div>
    </div>
  );
};

export default Suscripciones;