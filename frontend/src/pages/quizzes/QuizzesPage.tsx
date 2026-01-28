import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuizzes } from '../../hooks/useQuizzes';
import { useCourse } from '../../hooks/useCourses';
import { quizzesApi } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { QuizCard } from '../../components/quizzes/QuizCard';
import { CreateQuizModal } from '../../components/quizzes/CreateQuizModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { QuizInput } from '../../schemas/quiz';

export function QuizzesPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { course, isLoading: courseLoading } = useCourse(courseId);
  const { quizzes, isLoading, refetch } = useQuizzes(courseId);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);
  const toast = useToast();

  const handleCreateQuiz = async (data: QuizInput) => {
    if (!courseId) return;
    await quizzesApi.create({
      title: data.title,
      description: data.description || null,
      course_id: courseId,
    });
    toast.success('Quiz creado correctamente');
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

  if (courseLoading || isLoading) {
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

  if (!course) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Curso no encontrado
            </h2>
            <button
              onClick={() => navigate('/courses')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Volver a Cursos
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
        <Header title={`Quizzes - ${course.name}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/courses/${courseId}`)}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
              <span className="material-symbols-outlined mr-2">arrow_back</span>
              Volver al Curso
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center px-4 py-2 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 transition-colors"
            >
              <span className="material-symbols-outlined mr-2">add</span>
              Crear Quiz
            </button>
          </div>
        </Header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              Quizzes del Curso
            </h1>
            <p className="text-gray-600 text-lg mt-2">
              Gestiona los quizzes y evalúa a tus estudiantes en tiempo real.
            </p>
          </div>

          {quizzes.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-gray-400">quiz</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No hay quizzes aún
              </h3>
              <p className="text-gray-600 mb-6">
                Crea tu primer quiz para evaluar a tus estudiantes
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-6 py-3 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 transition-colors"
              >
                <span className="material-symbols-outlined mr-2">add</span>
                Crear Primer Quiz
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {quizzes.map((quiz) => (
                <QuizCard
                  key={quiz._id}
                  quiz={quiz}
                  onDelete={handleDeleteQuiz}
                  onActivate={handleActivateQuiz}
                  onFinish={handleFinishQuiz}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateQuizModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateQuiz}
      />

      <ConfirmDialog
        isOpen={quizToDelete !== null}
        onClose={() => setQuizToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar Quiz"
        message="¿Estás seguro de eliminar este quiz? Se eliminarán también todas las respuestas de los estudiantes."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}
