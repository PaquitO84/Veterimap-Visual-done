import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';

// CONFIGURACIÓN DE ICONOS
let DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// COMPONENTES DE CONTROL DEL MAPA
const PanToVet = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        const isValidCoordinate = (coord) => {
            return typeof coord === 'number' && !isNaN(coord) && coord !== 0;
        };
        if (center && isValidCoordinate(center[0]) && isValidCoordinate(center[1])) {
            try {
                map.flyTo(center, 15, { duration: 1.5 });
            } catch (err) {
                console.error("Error al mover el mapa:", err);
            }
        }
    }, [center, map]);
    return null;
};

const RecenterMap = ({ points }) => {
    const map = useMap();
    useEffect(() => {
        const validPoints = points.filter(p => p.lat && p.lng && !isNaN(p.lat) && !isNaN(p.lng));
        if (validPoints.length > 0) {
            const bounds = L.latLngBounds(validPoints.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [points, map]);
    return null;
};

const Mapa = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [vets, setVets] = useState([]);
    
    // ESTADOS INICIALIZADOS DESDE LA URL PARA PERSISTENCIA
    const [city, setCity] = useState(searchParams.get('city') || '');
    const [service, setService] = useState(searchParams.get('type') || 'CLINIC');
    const [specialty, setSpecialty] = useState(searchParams.get('specialty') || '');
    
    const [sortBy, setSortBy] = useState('rating-desc');
    const [ratingFilter, setRatingFilter] = useState(0);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('list');
    const [selectedVet, setSelectedVet] = useState(null);
    const listRefs = useRef({});

    const fetchVets = useCallback(async (targetCity) => {
        if (!targetCity) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                city: targetCity,
                type: service
            });
            if (service === 'INDIVIDUAL' && specialty) {
                params.append('specialty', specialty);
            }
            const response = await api.request(`profiles/map?${params.toString()}`);
            if (response && response.results) {
                const mapped = response.results.map(v => ({
                    id: v.id,
                    nombre: v.name,
                    direccion: v.full_address || v.city || targetCity,
                    lat: v.lat,
                    lng: v.lng,
                    rating: v.rating,
                    reviews: v.review_count,
                    tipoFicha: v.entity_type
                }));
                setVets(mapped.filter(v => !isNaN(v.lat) && v.lat !== 0));
            }
        } catch (err) {
            console.error("Error en fetchVets:", err);
            setVets([]);
        } finally {
            setLoading(false);
        }
    }, [service, specialty]);

    // EFECTO PARA DISPARAR BÚSQUEDA AL VOLVER ATRÁS
    useEffect(() => {
        const cityParam = searchParams.get('city');
        if (cityParam) {
            setCity(cityParam);
            setService(searchParams.get('type') || 'CLINIC');
            setSpecialty(searchParams.get('specialty') || '');
            fetchVets(cityParam);
        }
    }, [searchParams, fetchVets]);

    const handleSearchClick = () => {
        setSearchParams({ 
            city, 
            type: service, 
            specialty: service === 'INDIVIDUAL' ? specialty : '' 
        });
        fetchVets(city);
    };

    const processedVets = [...vets]
        .filter(v => v.rating >= parseFloat(ratingFilter))
        .sort((a, b) => {
            if (sortBy === 'rating-desc') return b.rating - a.rating;
            if (sortBy === 'name-asc') return a.nombre.localeCompare(b.nombre);
            return 0;
        });

    useEffect(() => {
        setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
    }, [viewMode]);


    return (
        <div className="h-screen w-full bg-slate-100 flex flex-col overflow-hidden font-sans text-slate-900">
            {/* HEADER / FILTROS */}
            <div className="bg-blue-600 p-3 md:p-4 shadow-xl z-[1000]">
                <div className="max-w-7xl mx-auto">
                    <div className="hidden md:grid grid-cols-6 gap-3 items-end">
                        <div className="flex flex-col text-left">
                            <label className="text-[10px] font-bold text-blue-100 mb-1 uppercase">Ciudad</label>
                            <input type="text" className="p-2.5 rounded-xl text-sm outline-none" placeholder="Ej: Madrid" value={city} onChange={(e) => setCity(e.target.value)} />
                        </div>
                        <div className="flex flex-col text-left">
                            <label className="text-[10px] font-bold text-blue-100 mb-1 uppercase">Servicio</label>
                            <select className="p-2.5 rounded-xl text-sm outline-none" value={service} onChange={(e) => { setService(e.target.value); if(e.target.value !== 'INDIVIDUAL') setSpecialty(''); }}>
                                <option value="CLINIC">Clínica</option>
                                <option value="HOSPITAL">Hospital 24h</option>
                                <option value="HOME_VET">A domicilio</option>
                                <option value="INDIVIDUAL">Autónomo</option>
                            </select>
                        </div>
                        <div className="flex flex-col text-left">
                            <label className={`text-[10px] font-bold mb-1 uppercase ${service === 'INDIVIDUAL' ? 'text-blue-100' : 'text-blue-400'}`}>Especialidad</label>
                            <input 
                                type="text" 
                                disabled={service !== 'INDIVIDUAL'}
                                className={`p-2.5 rounded-xl text-sm outline-none ${service !== 'INDIVIDUAL' ? 'bg-blue-800 text-blue-300' : 'bg-white'}`}
                                placeholder="Ej: Cirugía" 
                                value={specialty} 
                                onChange={(e) => setSpecialty(e.target.value)} 
                            />
                        </div>
                        <div className="flex flex-col text-left">
                            <label className="text-[10px] font-bold text-blue-100 mb-1 uppercase">Rating mínimo</label>
                            <select className="p-2.5 rounded-xl text-sm outline-none" value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
                                <option value="0">Todos</option>
                                <option value="3.5">⭐ 3.5+</option>
                                <option value="4">⭐ 4.0+</option>
                                <option value="4.5">⭐ 4.5+</option>
                            </select>
                        </div>
                        <div className="flex flex-col text-left">
                            <label className="text-[10px] font-bold text-blue-100 mb-1 uppercase">Orden</label>
                            <select className="p-2.5 rounded-xl text-sm outline-none" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                <option value="rating-desc">Rating ↓</option>
                                <option value="name-asc">Nombre A-Z</option>
                            </select>
                        </div>
                        <button onClick={handleSearchClick} className="bg-emerald-500 py-2.5 rounded-xl font-bold text-white hover:bg-emerald-600 transition">
                            {loading ? '...' : 'BUSCAR'}
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex-1 relative flex overflow-hidden">
                {/* LISTA LATERAL */}
                <aside className={`${viewMode === 'list' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[400px] bg-white border-r overflow-y-auto p-4 z-10`}>
                    <h2 className="text-slate-400 text-[10px] font-black uppercase mb-4 tracking-widest text-left">Resultados en {city}</h2>
                    <div className="space-y-4">
                        {processedVets.map(vet => (
                            <div 
                                key={vet.id} 
                                ref={el => listRefs.current[vet.id] = el}
                                onClick={() => { setSelectedVet(vet); if(window.innerWidth < 768) setViewMode('map'); }}
                                className={`p-4 border rounded-2xl cursor-pointer text-left transition-all ${selectedVet?.id === vet.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-100 hover:border-blue-200'}`}
                            >
                                <h3 className="font-bold text-slate-800">{vet.nombre}</h3>
                                <p className="text-xs text-slate-500 mt-1">📍 {vet.direccion}</p>
                                <div className="mt-3 flex justify-between items-center">
                                    <span className="text-emerald-600 font-black text-sm">⭐ {vet.rating.toFixed(1)} <span className="text-slate-400 font-normal">({vet.reviews})</span></span>
                                    <Link to={`/profile-vet/${vet.id}`} className="text-blue-600 font-bold text-xs uppercase hover:underline">Ver Perfil</Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* CONTENEDOR MAPA */}
                <div className={`${viewMode === 'map' ? 'block' : 'hidden md:block'} flex-1 relative h-full`}>
                    <MapContainer center={[40.41, -3.70]} zoom={6} className="h-full w-full z-0">
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {processedVets.map(vet => (
                            <Marker 
                                key={vet.id} 
                                position={[vet.lat, vet.lng]}
                                eventHandlers={{ click: () => setSelectedVet(vet) }}
                            >
                                <Popup>
                                    <div className="text-left p-1">
                                        <p className="font-bold text-sm mb-1">{vet.nombre}</p>
                                        <p className="text-[10px] text-slate-500 mb-2">📍 {vet.direccion}</p>
                                        <Link to={`/profile-vet/${vet.id}`} className="text-blue-600 font-bold text-[10px] uppercase underline">Ver Perfil</Link>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                        <RecenterMap points={processedVets} />
                        {selectedVet && <PanToVet center={[selectedVet.lat, selectedVet.lng]} />}
                    </MapContainer>

                                        {/* TARJETA FLOTANTE / CARRUSEL CORREGIDA */}
                    {selectedVet && (
                        <div className="absolute bottom-12 left-0 right-0 flex justify-center px-4 z-[1002] md:bottom-6">
                            <div className="relative w-full max-w-[360px] bg-white rounded-3xl shadow-2xl p-5 border-2 border-blue-500 animate-in slide-in-from-bottom-10 duration-300">
                                
                                {processedVets.length > 1 && (
                                    <div className="absolute -top-5 left-0 right-0 flex justify-center gap-4 pointer-events-none">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const idx = processedVets.findIndex(v => v.id === selectedVet.id);
                                                const prev = (idx - 1 + processedVets.length) % processedVets.length;
                                                setSelectedVet(processedVets[prev]);
                                            }}
                                            className="pointer-events-auto bg-white border-2 border-blue-500 w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform font-bold text-blue-600"
                                        >
                                            ←
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const idx = processedVets.findIndex(v => v.id === selectedVet.id);
                                                const next = (idx + 1) % processedVets.length;
                                                setSelectedVet(processedVets[next]);
                                            }}
                                            className="pointer-events-auto bg-white border-2 border-blue-500 w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform font-bold text-blue-600"
                                        >
                                            →
                                        </button>
                                    </div>
                                )}

                                <button onClick={() => setSelectedVet(null)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-500">✕</button>
                                
                                <div className="text-left">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">
                                            {processedVets.findIndex(v => v.id === selectedVet.id) + 1} de {processedVets.length}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800 leading-tight pr-6 truncate">{selectedVet.nombre}</h3>
                                    <p className="text-xs text-slate-500 mt-1 truncate">📍 {selectedVet.direccion}</p>
                                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                                        <div className="flex flex-col">
                                            <span className="text-emerald-600 font-black text-xl">⭐ {selectedVet.rating.toFixed(1)}</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{selectedVet.reviews} Reseñas</span>
                                        </div>
                                        <Link to={`/profile-vet/${selectedVet.id}`} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition">VER FICHA</Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* BOTÓN MÓVIL FLOTANTE */}
            <button 
                onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                className="md:hidden fixed bottom-10 left-1/2 -translate-x-1/2 z-[1001] bg-slate-900 text-white px-8 py-4 rounded-full font-black shadow-2xl"
            >
                {viewMode === 'list' ? '🗺️ VER MAPA' : '📋 VER LISTA'}
            </button>
        </div>
    );
};

export default Mapa;