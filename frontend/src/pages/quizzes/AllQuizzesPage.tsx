import { useState, useMemo } from 'react';
import { useAllQuizzes } from '../../hooks/useQuizzes';
import { useCourses } from '../../hooks/useCourses';
import { useAuth } from '../../contexts/AuthContext';
import { quizzesApi } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { QuizCard } from '../../components/quizzes/QuizCard';
import { CreateQuizModal } from '../../components/quizzes/CreateQuizModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { QuizInput } from '../../schemas/quiz';

export function AllQuizzesPage() {
  const { user } = useAuth();
  const { quizzes, isLoading, refetch } = useAllQuizzes();
  const { courses } = useCourses(user?.id);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [filterCourseId, setFilterCourseId] = useState<string>('all');
  const toast = useToast();

  // Create a map of course_id to course name for display
  const courseMap = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach(course => {
      map.set(course.id, course.name);
    });
    return map;
  }, [courses]);

  // Filter quizzes by selected course
  const filteredQuizzes = useMemo(() => {
    if (filterCourseId === 'all') return quizzes;
    return quizzes.filter(quiz => quiz.course_id === filterCourseId);
  }, [quizzes, filterCourseId]);

  const handleCreateQuiz = async (data: QuizInput) => {
    if (!selectedCourseId) {
      toast.error('Debes seleccionar un curso');
      return;
    }
    await quizzesApi.create({
      title: data.title,
      description: data.description || null,
      course_id: selectedCourseId,
    });
    toast.success('Quiz creado correctamente');
    setSelectedCourseId('');
    refetch();
  };

  const handleDeleteQuiz = (quizId: string) => {
    setQuizToDelete(quizId);
  };

  const confirmDelete = async () => {
    if (!quizToDelete) return;
    
    try {
      await quizzesApi.delete(quizToDelete);
      toast.success('Quiz eliminado correctamente');
      refetch();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Error al eliminar el quiz';
      toast.error(errorMessage);
    } finally {
      setQuizToDelete(null);
    }
  };

  const handleActivateQuiz = async (quizId: string) => {
    try {
      await quizzesApi.activate(quizId);
      toast.success('Quiz activado correctamente');
      refetch();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Error al activar el quiz';
      toast.error(errorMessage);
    }
  };

  const handleFinishQuiz = async (quizId: string) => {
    try {
      await quizzesApi.finish(quizId);
      toast.success('Quiz finalizado');
      refetch();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Error al finalizar el quiz';
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando quizzes...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
        <Header title="Quizzes">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center px-4 py-2 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 transition-colors"
          >
            <span className="material-symbols-outlined mr-2">add</span>
            Nuevo Quiz
          </button>
        </Header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {/* Filter by Course */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Filtrar por curso:</label>
              <select
                value={filterCourseId}
                onChange={(e) => setFilterCourseId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Todos los cursos</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500">
                {filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? 'zes' : ''} encontrado{filteredQuizzes.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {filteredQuizzes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <div className="bg-purple-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-purple-500">quiz</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {filterCourseId === 'all' ? 'No hay quizzes creados' : 'No hay quizzes en este curso'}
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {filterCourseId === 'all' 
                  ? 'Crea tu primer quiz para evaluar el conocimiento de tus estudiantes.'
                  : 'Este curso aún no tiene quizzes. Crea uno para comenzar.'
                }
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-6 py-3 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 transition-colors"
              >
                <span className="material-symbols-outlined mr-2">add</span>
                Crear Quiz
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuizzes.map((quiz) => (
                <div key={quiz._id} className="relative">
                  {/* Course Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                      {courseMap.get(quiz.course_id) || 'Curso desconocido'}
                    </span>
                  </div>
                  <QuizCard
                    quiz={quiz}
                    onDelete={handleDeleteQuiz}
                    onActivate={handleActivateQuiz}
                    onFinish={handleFinishQuiz}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Quiz Modal with Course Selection */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-lg w-full mx-4 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Crear Nuevo Quiz</h2>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecciona el curso <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">-- Selecciona un curso --</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                </div>
                {selectedCourseId ? (
                  <CreateQuizModal
                    isOpen={true}
                    onClose={() => {
                      setIsCreateModalOpen(false);
                      setSelectedCourseId('');
                    }}
                    onSubmit={handleCreateQuiz}
                    embedded={true}
                  />
                ) : (
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => {
                        setIsCreateModalOpen(false);
                        setSelectedCourseId('');
                      }}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={quizToDelete !== null}
          onClose={() => setQuizToDelete(null)}
          onConfirm={confirmDelete}
          title="Eliminar Quiz"
          message="¿Estás seguro de eliminar este quiz? Se eliminarán también todas las respuestas de los estudiantes."
          confirmText="Eliminar"
          variant="danger"
        />
      </main>
    </div>
  );
}
