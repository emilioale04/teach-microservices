import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { enrollStudentSchema, type EnrollStudentInput } from '../../schemas/course';
import { useToast } from '../../contexts/ToastContext';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface EnrollStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (data: EnrollStudentInput) => Promise<void>;
  onBulkEnroll: (file: File) => Promise<{ success_count: number; error_count: number; errors: string[] }>;
}

export function EnrollStudentModal({ isOpen, onClose, onEnroll, onBulkEnroll }: EnrollStudentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [bulkResult, setBulkResult] = useState<{ success_count: number; error_count: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EnrollStudentInput>({
    resolver: zodResolver(enrollStudentSchema),
  });

  const onSubmit = async (data: EnrollStudentInput) => {
    try {
      setIsLoading(true);
      setError(null);
      await onEnroll(data);
      toast.success('Estudiante inscrito correctamente');
      reset();
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error al inscribir estudiante';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea CSV
    if (!file.name.endsWith('.csv')) {
      const errorMsg = 'Solo se aceptan archivos CSV';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setBulkResult(null);
      
      const result = await onBulkEnroll(file);
      setBulkResult(result);
      
      if (result.error_count === 0) {
        toast.success(`${result.success_count} estudiantes inscritos correctamente`);
      } else if (result.success_count > 0) {
        toast.warning(`${result.success_count} inscritos, ${result.error_count} con errores`);
      } else {
        toast.error('No se pudo inscribir ningún estudiante');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error al cargar archivo';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    setBulkResult(null);
    setMode('single');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Inscribir Estudiante(s)</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setMode('single')}
            className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
              mode === 'single'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Individual
          </button>
          <button
            onClick={() => setMode('bulk')}
            className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
              mode === 'bulk'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Carga Masiva (CSV)
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {mode === 'single' ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Nombre Completo
              </label>
              <input
                {...register('student_name')}
                type="text"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Juan Pérez"
              />
              {errors.student_name && (
                <p className="mt-1 text-sm text-red-600">{errors.student_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Email
              </label>
              <input
                {...register('student_email')}
                type="email"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="estudiante@email.com"
              />
              {errors.student_email && (
                <p className="mt-1 text-sm text-red-600">{errors.student_email.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Inscribiendo...' : 'Inscribir'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Formato del archivo CSV:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Debe contener las columnas: <code className="bg-blue-100 px-1 rounded">email</code> y <code className="bg-blue-100 px-1 rounded">full_name</code> (o <code className="bg-blue-100 px-1 rounded">nombre</code>)</li>
                    <li>La primera fila debe contener los nombres de las columnas</li>
                    <li>Cada fila representa un estudiante</li>
                  </ul>
                  <p className="mt-2">
                    <a 
                      href="/students-example.csv" 
                      download 
                      className="text-blue-600 hover:text-blue-800 underline font-semibold"
                    >
                      Descargar archivo de ejemplo
                    </a>
                  </p>
                </div>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
                disabled={isLoading}
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-12 h-12 text-gray-400" />
                <p className="text-sm font-semibold text-gray-900">
                  {isLoading ? 'Procesando archivo...' : 'Haz clic para seleccionar un archivo CSV'}
                </p>
                <p className="text-xs text-gray-500">Solo archivos .csv</p>
              </label>
            </div>

            {bulkResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-900">
                    <span className="font-semibold">{bulkResult.success_count}</span> estudiantes inscritos correctamente
                  </p>
                </div>

                {bulkResult.error_count > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <p className="text-sm font-semibold text-red-900">
                        {bulkResult.error_count} errores encontrados:
                      </p>
                    </div>
                    <ul className="text-xs text-red-800 space-y-1 ml-7 max-h-32 overflow-y-auto">
                      {bulkResult.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                {bulkResult ? 'Cerrar' : 'Cancelar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
