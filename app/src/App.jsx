import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AppShell from './pages/AppShell';

function PrivateRoute({ children }) {
	const { user } = useAuth();
	if (user === undefined) return <div className="grid min-h-screen place-items-center text-slate-400">Cargando…</div>;
	return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
	const { user } = useAuth();
	if (user === undefined) return <div className="grid min-h-screen place-items-center text-slate-400">Cargando…</div>;
	return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
	return (
		<ThemeProvider>
			<AuthProvider>
				<Routes>
					<Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
					<Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
					<Route path="/" element={<PrivateRoute><AppShell /></PrivateRoute>} />
					{/* Demo pública con datos de prueba en memoria (no requiere cuenta ni escribe en la base de datos). */}
					<Route path="/demo" element={<AppShell demo />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</AuthProvider>
		</ThemeProvider>
	);
}
