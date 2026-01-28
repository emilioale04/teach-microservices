import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Loader2, Trophy, CheckCircle, XCircle, RotateCcw, AlertCircle } from 'lucide-react';
import { studentApi, ApiError } from '../lib/api';
import { useStudent } from '../contexts/StudentContext';

interface ProgressData {
  quiz_id: string;
  student_email: string;
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  score_percentage: number;
  answers: Array<{
    question_id: string;
    selected_option: number;
    is_correct: boolean;
  }>;
}

export default function ResultsPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { session, clearSession } = useStudent();

  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if no session
  if (!session || session.quizId !== quizId) {
    return <Navigate to={`/quiz/${quizId}`} replace />;
  }

  useEffect(() => {
    async function loadResults() {
      if (!quizId || !session?.email) return;

      try {
        setLoading(true);
        setError(null);
        
        const data = await studentApi.getProgress(quizId, session.email);
        setProgress(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Error al cargar los resultados');
        }
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [quizId, session?.email]);

  const handleNewQuiz = () => {
    clearSession();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="card w-full max-w-md text-center">
        <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
        <p className="mt-4 text-gray-600">Cargando resultados...</p>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="card w-full max-w-md text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
        <h2 className="mt-4 text-xl font-semibold text-gray-800">Error</h2>
        <p className="mt-2 text-gray-600">{error || 'No se encontraron resultados'}</p>
        <button
          onClick={() => navigate(`/quiz/${quizId}`)}
          className="btn-primary mt-4"
        >
          Volver al quiz
        </button>
      </div>
    );
  }

  const isPerfect = progress.score_percentage === 100;
  const isGood = progress.score_percentage >= 70;

  return (
    <div className="card w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-6">
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
          isPerfect ? 'bg-yellow-100' : isGood ? 'bg-green-100' : 'bg-blue-100'
        }`}>
          <Trophy className={`w-10 h-10 ${
            isPerfect ? 'text-yellow-500' : isGood ? 'text-green-500' : 'text-blue-500'
          }`} />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800">
          {isPerfect ? '¡Perfecto!' : isGood ? '¡Muy bien!' : '¡Quiz completado!'}
        </h1>
        
        <p className="mt-2 text-gray-600">
          {progress.student_email}
        </p>
      </div>

      {/* Score */}
      <div className="bg-gray-50 rounded-xl p-6 mb-6">
        <div className="text-center">
          <div className={`text-5xl font-bold ${
            isPerfect ? 'text-yellow-500' : isGood ? 'text-green-500' : 'text-blue-500'
          }`}>
            {Math.round(progress.score_percentage)}%
          </div>
          <p className="text-gray-600 mt-2">Puntuación</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center p-3 bg-white rounded-lg">
            <div className="flex items-center justify-center gap-1 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-2xl font-bold">{progress.correct_answers}</span>
            </div>
            <p className="text-sm text-gray-500">Correctas</p>
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg">
            <div className="flex items-center justify-center gap-1 text-red-500">
              <XCircle className="w-5 h-5" />
              <span className="text-2xl font-bold">{progress.total_questions - progress.correct_answers}</span>
            </div>
            <p className="text-sm text-gray-500">Incorrectas</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="text-center text-sm text-gray-500 mb-6">
        <p>
          Respondiste {progress.answered_questions} de {progress.total_questions} preguntas
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={handleNewQuiz}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          Responder otro quiz
        </button>
      </div>

      {/* Encouragement message */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg text-center">
        <p className="text-sm text-blue-700">
          {isPerfect 
            ? '🎉 ¡Excelente trabajo! Has respondido todas las preguntas correctamente.'
            : isGood 
              ? '👏 ¡Buen trabajo! Sigue practicando para mejorar aún más.'
              : '💪 ¡No te rindas! Cada intento es una oportunidad para aprender.'}
        </p>
      </div>
    </div>
  );
}
