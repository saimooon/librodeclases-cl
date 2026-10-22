import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authClient } from '../lib/authClient';
import { fetchTeacher, subscribeTeacher } from '../services/teacherData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const { data: session, isPending } = authClient.useSession();
	const [teacher, setTeacher] = useState(null);
	const [providers, setProviders] = useState([]);
	const sessionUser = session?.user;

	useEffect(() => subscribeTeacher(setTeacher), []);

	useEffect(() => {
		if (!sessionUser?.id) { setTeacher(null); setProviders([]); return; }
		fetchTeacher().then(result => setProviders(result.providers)).catch(() => setTeacher(null));
	}, [sessionUser?.id]);

	// Misma forma que tenía el usuario de Firebase para no tocar las vistas: undefined = cargando, null = sin sesión.
	const user = useMemo(() => {
		if (isPending) return undefined;
		if (!sessionUser) return null;
		return { uid: sessionUser.id, email: sessionUser.email, displayName: sessionUser.name, phoneNumber: teacher?.phoneNumber || null, providers };
	}, [isPending, sessionUser, teacher?.phoneNumber, providers]);

	const value = { user, teacher, logout: () => authClient.signOut() };
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
