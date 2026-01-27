import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-64 bg-white dark:bg-[#1a242d] border-r border-[#dbe0e6] dark:border-slate-800 flex flex-col justify-between py-6">
      <div className="flex flex-col gap-8 px-4">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2">
          <div className="bg-blue-500 rounded-lg p-2 text-white">
            <span className="material-symbols-outlined text-2xl">school</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-[#111418] dark:text-white text-base font-bold leading-tight">EduPlataforma</h1>
            <p className="text-[#617589] dark:text-slate-400 text-xs font-normal">Panel del Docente</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2">
          <Link
            to="/courses"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isActive('/courses')
                ? 'bg-blue-500 text-white'
                : 'text-[#617589] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-sm font-semibold">Cursos</span>
          </Link>
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="px-4 flex flex-col gap-4">
        <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
          <div className="size-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
            {user?.email[0].toUpperCase()}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs font-bold dark:text-white truncate">{user?.email}</span>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full py-2 px-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
