import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { Lock, CheckCircle } from 'lucide-react';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    try {
      setIsLoading(true);
      
      // Supabase puede enviar el token en diferentes formatos
      // 1. Como query param: ?token=xxx
      // 2. Como hash fragment: #access_token=xxx
      let token = searchParams.get('token') || searchParams.get('access_token');
      
      // Si no está en query params, revisar el hash
      if (!token) {
        const hash = window.location.hash.substring(1); // Remover el #
        const hashParams = new URLSearchParams(hash);
        token = hashParams.get('access_token') || hashParams.get('token');
      }
      
      if (!token) {
        toast.error('Token de recuperación inválido o expirado. Por favor solicita un nuevo enlace.');
        setTimeout(() => navigate('/forgot-password'), 2000);
        return;
      }

      await authApi.confirmPasswordReset(data.password);
      setSuccess(true);
      toast.success('Contraseña actualizada correctamente');
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Error al actualizar contraseña';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="bg-blue-500 text-white rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              {success ? (
                <CheckCircle className="w-8 h-8" />
              ) : (
                <Lock className="w-8 h-8" />
              )}
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">
              {success ? '¡Contraseña Actualizada!' : 'Nueva Contraseña'}
            </h1>
            <p className="text-gray-600">
              {success 
                ? 'Tu contraseña ha sido actualizada correctamente'
                : 'Ingresa tu nueva contraseña'
              }
            </p>
          </div>

          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 text-center">
                Serás redirigido al login en unos segundos...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Nueva Contraseña
                </label>
                <input
                  {...register('password')}
                  type="password"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Confirmar Contraseña
                </label>
                <input
                  {...register('confirmPassword')}
                  type="password"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
