import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { questionSchema, type QuestionInput } from '../../schemas/quiz';
import { useToast } from '../../contexts/ToastContext';
import type { Question } from '../../types';

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: QuestionInput) => Promise<void>;
  question?: Question | null; // For editing existing question
}

export function QuestionModal({ isOpen, onClose, onSave, question }: QuestionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<QuestionInput>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      text: '',
      options: ['', '', '', ''],
      correct_option: 0,
    },
  });

  const correctOption = watch('correct_option');

  useEffect(() => {
    if (question) {
      setValue('text', question.text);
      setValue('options', question.options);
      setValue('correct_option', question.correct_option);
    } else {
      reset({
        text: '',
        options: ['', '', '', ''],
        correct_option: 0,
      });
    }
  }, [question, setValue, reset]);

  const onSubmit = async (data: QuestionInput) => {
    try {
      setIsLoading(true);
      setError(null);
      await onSave(data);
      reset();
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error al guardar pregunta';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {question ? 'Editar Pregunta' : 'Nueva Pregunta'}
          </h2>
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Pregunta
            </label>
            <textarea
              {...register('text')}
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Escribe la pregunta..."
            />
            {errors.text && (
              <p className="mt-1 text-sm text-red-600">{errors.text.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Opciones de Respuesta
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Selecciona la opción correcta haciendo clic en el círculo
            </p>
            
            <div className="space-y-3">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setValue('correct_option', index)}
                    className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                      correctOption === index
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {correctOption === index && (
                      <span className="material-symbols-outlined text-lg">check</span>
                    )}
                  </button>
                  <input
                    {...register(`options.${index}`)}
                    type="text"
                    className={`flex-1 px-4 py-2.5 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      correctOption === index ? 'border-green-300 bg-green-50' : 'border-gray-200'
                    }`}
                    placeholder={`Opción ${index + 1}`}
                  />
                </div>
              ))}
            </div>
            {errors.options && (
              <p className="mt-2 text-sm text-red-600">Todas las opciones son requeridas</p>
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
              {isLoading ? 'Guardando...' : question ? 'Actualizar' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
