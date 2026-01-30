import React, { createContext, useState, useContext, useEffect } from 'react';

export const AuthContext = createContext(null);

const decodeJWT = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            window.atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = decodeJWT(token);
            if (payload) {
                return { id: payload.user_id, role: payload.role, token, ...payload };
            }
            localStorage.removeItem('token');
        }
        return null;
    });

    const [loadingProfile, setLoadingProfile] = useState(true);

    // Definimos la función para que sea accesible desde fuera (login, etc.)
    const checkProfileStatus = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoadingProfile(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:8080/api/me', {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUser(prev => ({
                    ...prev,
                    ...data.user,
                    has_profile: data.has_profile
                }));
            } else if (response.status === 401) {
                logout();
            }
        } catch (error) {
            console.error("Error verificando perfil real:", error);
        } finally {
            setLoadingProfile(false);
        }
    };

    // Usamos el efecto para la carga inicial
    useEffect(() => {
        checkProfileStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Desactivamos el aviso aquí para evitar bucles y que el linter no se queje

    const login = async (token) => {
        localStorage.setItem('token', token);
        const payload = decodeJWT(token);
        const userData = { id: payload.user_id, role: payload.role, token, ...payload };
        setUser(userData);
        await checkProfileStatus();
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loadingProfile, checkProfileStatus }}>
            
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
    }
    return context;
};