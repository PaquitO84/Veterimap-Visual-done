import React from 'react';
import { useNavigate } from 'react-router-dom';

const Suscripciones = () => {
  const navigate = useNavigate();

  const planes = [
  {
    nombre: "Plan ESSENTIAL",
    tag: "GRATIS",
    enfoque: "Empieza sin riesgo y date a conocer",
    precio: "0 €",
    detalles: "para siempre",
    buttonText: "Activar plan gratis",
    trialDesc: "Accede 2 meses GRATIS al Plan PREMIUM al registrarte",
    popular: false,
    caracteristicas: [
      { label: "Presencia en mapa", desc: "Perfil visible básico" },
      { label: "Historial clínico", desc: "Acceso de lectura limitado" }
      // Puedes descomentar y mejorar cuando lo implementes:
      // { label: "Sello Verificado", desc: "No incluido" },
      // { label: "Agendamiento online", desc: "Solo contacto manual" },
      // { label: "Soporte", desc: "Comunidad y email" }
    ]
  },
  {
    nombre: "Plan PREMIUM",
    tag: "MÁS CONTRATADO",
    enfoque: "Atrae más clientes, llena tu agenda y ahorra tiempo todos los días",
    precio: "70 €",
    detalles: "/mes + IVA",
    buttonText: "Quiero mis 2 meses gratis",
    trialDesc: "Sin riesgos: 2 meses completos gratis – luego decides",
    popular: true,
    caracteristicas: [
      { label: "Perfil destacado", desc: "Aparece primero + sello profesional verificado" },
      { label: "Sello Verificado", desc: "Genera confianza inmediata" },
      { label: "Reservas 24/7", desc: "Agenda automática – clientes reservan solos" },
      { label: "Recordatorios inteligentes", desc: "Email + WhatsApp → menos cancelaciones" },
      { label: "Historial clínico digital", desc: "Completo, seguro y compartido con dueños" },
      { label: "Soporte VIP", desc: "Respuesta rápida por WhatsApp Premium" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 font-sans flex flex-col justify-center">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">
        Impulsa tu <span className="text-brand">Actividad Profesional</span>
      </h1>
        <p className="text-slate-500 text-base md:text-lg mb-12 max-w-2xl mx-auto">
          Prueba todas las funciones profesionales gratis. <br className="hidden md:block" />
          Sin tarjetas, sin compromiso y sin permanencia.
        </p>

        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          {planes.map((plan, idx) => (
            <div 
              key={idx} 
              className={`relative bg-white rounded-[2rem] p-8 md:p-10 shadow-xl transition-all border-2 flex flex-col h-full ${
                plan.popular ? 'border-brand ring-4 ring-brand/10' : 'border-slate-100'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand text-white text-[10px] font-black px-6 py-1.5 rounded-full tracking-widest shadow-lg">
                  {plan.tag}
                </span>
              )}

              <div className="text-left mb-6">
                <h3 className="text-xl font-black text-slate-800 mb-1">{plan.nombre}</h3>
                <p className="text-slate-400 font-medium text-xs uppercase tracking-tighter">{plan.enfoque}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-black text-slate-900">{plan.precio}</span>
                <span className="text-slate-400 text-sm font-bold">{plan.detalles}</span>
              </div>

              {/* CAJA DE TRIAL - EXPLICACIÓN DE LOS 2 MESES */}
              <div className={`p-4 rounded-2xl mb-8 flex flex-col gap-1 border ${
                plan.popular ? 'bg-brand/5 border-brand/20' : 'bg-emerald-50 border-emerald-100'
              }`}>
                <div className="flex items-center justify-center gap-2">
                   <i className={`fas fa-star ${plan.popular ? 'text-brand' : 'text-emerald-500'}`}></i>
                   <span className={`text-[11px] font-black uppercase ${plan.popular ? 'text-brand' : 'text-emerald-600'}`}>
                     {plan.trialDesc}
                   </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium italic">
                  *Al finalizar, tú decides si continuar. Sin cobros automáticos.
                </p>
              </div>

              {/* LISTA DE CARACTERÍSTICAS - flex-1 asegura que ocupe el espacio sobrante */}
              <ul className="space-y-4 mb-10 flex-1">
                {plan.caracteristicas.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-left">
                    <i className={`fas fa-check-circle mt-1 text-sm ${plan.popular ? 'text-brand' : 'text-slate-300'}`}></i>
                    <div>
                      <p className="text-[11px] font-black text-slate-800 uppercase tracking-tighter leading-none">{item.label}</p>
                      <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => navigate(`/registro?plan=${plan.nombre.toLowerCase()}&trial=true`)}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                  plan.popular 
                  ? 'bg-brand text-white hover:bg-[#1a8a8e] shadow-brand/20' 
                  : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-10 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
          ¿Dudas sobre el Plan PRO? <span className="text-brand cursor-pointer hover:underline border-b border-brand/30">Habla con nosotros</span>
        </p>
      </div>
    </div>
  );
};

export default Suscripciones;