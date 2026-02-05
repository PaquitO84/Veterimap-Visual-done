import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    // useCallback asegura que la función sea estable
    const fetchNotifications = useCallback(async () => {
    try {
        const data = await api.request('/notifications');
        // Si data es null o undefined, usamos []
        setNotifications(data || []); 
    } catch {
        console.error("Error al cargar notificaciones");
        setNotifications([]);
    }
}, []);

    useEffect(() => {
        let isMounted = true;

        const loadInitial = async () => {
            if (isMounted) {
                await fetchNotifications();
            }
        };

        loadInitial();

        const interval = setInterval(() => {
            fetchNotifications();
        }, 30000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [fetchNotifications]);

    const markAsRead = async () => {
        if (notifications.length === 0) return;
        try {
            await api.request('/notifications/read', 'POST');
            // Limpiamos localmente después de marcar como leídas en el servidor
            setNotifications([]);
        } catch {
            console.error("Error al marcar como leídas");
        }
    };

    return (
        <div className="relative">
            <button 
                onClick={() => { 
                    setIsOpen(!isOpen); 
                    if (!isOpen) markAsRead(); 
                }}
                className="relative p-2 text-slate-400 hover:text-brand transition-colors"
            >
                <i className="fas fa-bell text-xl"></i>
                {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                    <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Notificaciones</span>
                        <span className="text-[10px] bg-blue-100 text-brand px-2 py-0.5 rounded-full font-bold">
                            {notifications.length}
                        </span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 italic text-sm">No tienes avisos nuevos</div>
                        ) : (
                            notifications.map((n) => (
                                <div key={n.id} className="p-4 border-b hover:bg-slate-50 transition-colors">
                                    <p className="text-xs font-bold text-slate-800 mb-1">{n.title}</p>
                                    <p className="text-[11px] text-slate-500 leading-tight">{n.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;