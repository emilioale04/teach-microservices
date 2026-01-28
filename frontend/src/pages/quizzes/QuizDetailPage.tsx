import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuiz } from '../../hooks/useQuizzes';
import { quizzesApi } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { QuestionList } from '../../components/quizzes/QuestionList';
import { QuestionModal } from '../../components/quizzes/QuestionModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { Question } from '../../types';
import type { QuestionInput } from '../../schemas/quiz';

const STUDENT_FRONTEND_URL = 'http://localhost:5174';

const statusConfig = {
  draft: {
    label: 'Borrador',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: 'edit_note',
  },
  active: {
    label: 'Activo',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: 'play_circle',
  },
  finished: {
    label: 'Finalizado',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: 'check_circle',
  },
};

export function QuizDetailPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { quiz, isLoading, refetch } = useQuiz(quizId);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const toast = useToast();

  const handleAddQuestion = async (data: QuestionInput) => {
    if (!quizId) return;
    await quizzesApi.addQuestion(quizId, data);
    toast.success('Pregunta agregada');
    refetch();
  };

  const handleEditQuestion = async (data: QuestionInput) => {
    if (!quizId || !selectedQuestion) return;
    await quizzesApi.updateQuestion(quizId, selectedQuestion._id, data);
    toast.success('Pregunta actualizada');
    refetch();
  };

  const handleDeleteQuestion = (questionId: string) => {
    setQuestionToDelete(questionId);
  };

  const confirmDeleteQuestion = async () => {
    if (!quizId || !questionToDelete) return;
    
    try {
      await quizzesApi.deleteQuestion(quizId, questionToDelete);
      toast.success('Pregunta eliminada');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al eliminar pregunta');
    } finally {
      setQuestionToDelete(null);
    }
  };

  const handleActivateQuiz = async () => {
    if (!quizId || !quiz) return;
    
    if (quiz.questions.length === 0) {
      toast.error('El quiz debe tener al menos una pregunta');
      return;
    }
    
    try {
      setIsActivating(true);
      await quizzesApi.activate(quizId);
      toast.success('Quiz activado correctamente');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al activar quiz');
    } finally {
      setIsActivating(false);
    }
  };

  const handleFinishQuiz = async () => {
    if (!quizId) return;
    
    try {
      await quizzesApi.finish(quizId);
      toast.success('Quiz finalizado');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al finalizar quiz');
    }
  };

  const openEditQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setIsQuestionModalOpen(true);
  };

  const openAddQuestion = () => {
    setSelectedQuestion(null);
    setIsQuestionModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando quiz...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Quiz no encontrado
            </h2>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              Volver
            </button>
          </div>
        </main>
      </div>
    );
  }

  const status = statusConfig[quiz.status];
  const isDraft = quiz.status === 'draft';
  const isActive = quiz.status === 'active';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
        <Header title={quiz.title}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/courses/${quiz.course_id}/quizzes`)}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
              <span className="material-symbols-outlined mr-2">arrow_back</span>
              Volver
            </button>
            
            {isDraft && (
              <button
                onClick={handleActivateQuiz}
                disabled={isActivating || quiz.questions.length === 0}
                className="flex items-center px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined mr-2">play_arrow</span>
                {isActivating ? 'Activando...' : 'Activar Quiz'}
              </button>
            )}
            
            {isActive && (
              <>
                <button
                  onClick={() => navigate(`/quizzes/${quizId}/monitor`)}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <span className="material-symbols-outlined mr-2">monitoring</span>
                  Monitorear
                </button>
                <button
                  onClick={handleFinishQuiz}
                  className="flex items-center px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <span className="material-symbols-outlined mr-2">stop</span>
                  Finalizar
                </button>
              </>
            )}
            
            {quiz.status === 'finished' && (
              <button
                onClick={() => navigate(`/quizzes/${quizId}/results`)}
                className="flex items-center px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
              >
                <span className="material-symbols-outlined mr-2">analytics</span>
                Ver Resultados
              </button>
            )}
          </div>
        </Header>

        <div className="p-8 max-w-5xl mx-auto w-full">
          {/* Quiz Info */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 mb-8">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {quiz.title}
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 border ${status.color}`}>
                    <span className="material-symbols-outlined text-base">{status.icon}</span>
                    {status.label}
                  </span>
                </div>
                <p className="text-gray-600">
                  {quiz.description || 'Sin descripción'}
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-lg">help</span>
                    {quiz.questions.length} preguntas
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-lg">schedule</span>
                    Creado: {new Date(quiz.created_at).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Student Link (when active) */}
          {isActive && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 mb-8">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-blue-600">link</span>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Enlace para Estudiantes
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Comparte este enlace con tus estudiantes para que puedan responder el quiz.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 font-mono truncate">
                      {STUDENT_FRONTEND_URL}/quiz/{quizId}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${STUDENT_FRONTEND_URL}/quiz/${quizId}`);
                        toast.success('Enlace copiado al portapapeles');
                      }}
                      className="flex items-center px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <span className="material-symbols-outlined mr-1">content_copy</span>
                      Copiar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Questions Section */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Preguntas
                </h3>
                <p className="text-sm text-gray-600">
                  {quiz.questions.length} pregunta{quiz.questions.length !== 1 ? 's' : ''} en este quiz
                </p>
              </div>
              
              {isDraft && (
                <button
                  onClick={openAddQuestion}
                  className="flex items-center px-4 py-2 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <span className="material-symbols-outlined mr-2">add</span>
                  Agregar Pregunta
                </button>
              )}
            </div>

            <QuestionList
              questions={quiz.questions}
              onEdit={openEditQuestion}
              onDelete={handleDeleteQuestion}
              isEditable={isDraft}
            />
          </div>
        </div>
      </main>

      <QuestionModal
        isOpen={isQuestionModalOpen}
        onClose={() => {
          setIsQuestionModalOpen(false);
          setSelectedQuestion(null);
        }}
        onSave={selectedQuestion ? handleEditQuestion : handleAddQuestion}
        question={selectedQuestion}
      />

      <ConfirmDialog
        isOpen={questionToDelete !== null}
        onClose={() => setQuestionToDelete(null)}
        onConfirm={confirmDeleteQuestion}
        title="Eliminar Pregunta"
        message="¿Estás seguro de eliminar esta pregunta?"
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}
