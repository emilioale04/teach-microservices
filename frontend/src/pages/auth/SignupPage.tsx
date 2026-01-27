import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../contexts/AuthContext';
import { signupSchema, type SignupInput } from '../../schemas/auth';

export function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupInput) => {
    try {
      setIsLoading(true);
      setError(null);
      await signup(data.email, data.password);
      navigate('/courses');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al crear cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-[#1a242d] rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-800">
          {/* Brand */}
          <div className="flex justify-center mb-8">
            <div className="bg-blue-500 rounded-xl p-3 text-white">
              <span className="material-symbols-outlined text-4xl">school</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-[#111418] dark:text-white mb-2">
            Crear Cuenta
          </h1>
          <p className="text-center text-[#617589] dark:text-slate-400 mb-8">
            Regístrate como docente
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#111418] dark:text-white mb-2">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="tu@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#111418] dark:text-white mb-2">
                Contraseña
              </label>
              <input
                {...register('password')}
                type="password"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#617589] dark:text-slate-400">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-blue-500 hover:text-blue-600 font-semibold">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
