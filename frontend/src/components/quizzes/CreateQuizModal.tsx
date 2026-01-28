import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { quizSchema, type QuizInput } from '../../schemas/quiz';
import { useToast } from '../../contexts/ToastContext';

interface CreateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: QuizInput) => Promise<void>;
  onCreate?: (data: QuizInput) => Promise<void>;
  embedded?: boolean;
}

export function CreateQuizModal({ isOpen, onClose, onSubmit: onSubmitProp, onCreate, embedded = false }: CreateQuizModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const handleCreate = onSubmitProp || onCreate;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<QuizInput>({
    resolver: zodResolver(quizSchema),
  });

  const onFormSubmit = async (data: QuizInput) => {
    if (!handleCreate) return;
    try {
      setIsLoading(true);
      setError(null);
      await handleCreate(data);
      reset();
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error al crear quiz';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Embedded mode - render just the form fields
  if (embedded) {
    return (
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Título del Quiz
          </label>
          <input
            {...register('title')}
            type="text"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Ej: Quiz de Repaso - Tema 1"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Descripción
          </label>
          <textarea
            {...register('description')}
            rows={3}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Describe el contenido del quiz..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3 px-4 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Creando...' : 'Crear Quiz'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Crear Quiz</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Título del Quiz
            </label>
            <input
              {...register('title')}
              type="text"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Ej: Quiz de Repaso - Tema 1"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Descripción
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Describe el contenido del quiz..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creando...' : 'Crear Quiz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
