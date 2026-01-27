import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { courseSchema, type CourseInput } from '../../schemas/course';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CourseInput) => Promise<void>;
}

export function CreateCourseModal({ isOpen, onClose, onCreate }: CreateCourseModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CourseInput>({
    resolver: zodResolver(courseSchema),
  });

  const onSubmit = async (data: CourseInput) => {
    try {
      setIsLoading(true);
      setError(null);
      await onCreate(data);
      reset();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al crear curso');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#1a242d] rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#111418] dark:text-white">Crear Curso</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#111418] dark:text-white mb-2">
              Nombre del Curso
            </label>
            <input
              {...register('name')}
              type="text"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Matemáticas Avanzadas"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#111418] dark:text-white mb-2">
              Descripción
            </label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe el contenido del curso..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-[#111418] dark:text-white font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creando...' : 'Crear Curso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
