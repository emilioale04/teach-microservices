import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { studentApi, ApiError } from '../lib/api';
import { useStudent } from '../contexts/StudentContext';

interface Question {
  question_id: string;
  text: string;
  options: Array<{ id: number; text: string }>;
  order: number;
}

interface AnswerResult {
  is_correct: boolean;
  correct_option?: number;
}

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { session, clearSession } = useStudent();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if no session
  if (!session || session.quizId !== quizId || !session.joined) {
    return <Navigate to={`/quiz/${quizId}`} replace />;
  }

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const hasAnswered = currentQuestion ? answeredQuestions.has(currentQuestion.question_id) : false;

  // Load questions
  useEffect(() => {
    async function loadQuestions() {
      if (!quizId || !session?.email) return;

      try {
        setLoading(true);
        setError(null);
        
        const data = await studentApi.getQuestions(quizId, session.email);
        setQuestions(data.questions.sort((a, b) => a.order - b.order));
        setQuizTitle(data.title);
        
        // Load existing progress
        try {
          const progress = await studentApi.getProgress(quizId, session.email);
          const answered = new Set(progress.answers.map(a => a.question_id));
          setAnsweredQuestions(answered);
          
          // If all questions answered, go to results
          if (progress.answered_questions === progress.total_questions) {
            navigate(`/quiz/${quizId}/results`, { replace: true });
          }
        } catch {
          // No progress yet, that's fine
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 403) {
            // Not joined, redirect to join page
            clearSession();
            navigate(`/quiz/${quizId}`, { replace: true });
            return;
          }
          setError(err.message);
        } else {
          setError('Error al cargar las preguntas');
        }
      } finally {
        setLoading(false);
      }
    }

    loadQuestions();
  }, [quizId, session?.email, navigate, clearSession]);

  const submitAnswer = useCallback(async () => {
    if (!quizId || !session?.email || selectedOption === null || !currentQuestion) return;

    try {
      setSubmitting(true);
      setError(null);

      const result = await studentApi.submitAnswer(
        quizId,
        session.email,
        currentQuestion.question_id,
        selectedOption
      );

      setAnswerResult(result);
      setAnsweredQuestions(prev => new Set(prev).add(currentQuestion.question_id));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al enviar la respuesta');
      }
    } finally {
      setSubmitting(false);
    }
  }, [quizId, session?.email, selectedOption, currentQuestion]);

  const goToNext = useCallback(() => {
    if (isLastQuestion) {
      navigate(`/quiz/${quizId}/results`);
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setAnswerResult(null);
    }
  }, [isLastQuestion, quizId, navigate]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSelectedOption(null);
      setAnswerResult(null);
    }
  }, [currentIndex]);

  if (loading) {
    return (
      <div className="card w-full max-w-2xl text-center">
        <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
        <p className="mt-4 text-gray-600">Cargando preguntas...</p>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="card w-full max-w-2xl text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
        <h2 className="mt-4 text-xl font-semibold text-gray-800">Error</h2>
        <p className="mt-2 text-gray-600">{error}</p>
        <button
          onClick={() => navigate(`/quiz/${quizId}`)}
          className="btn-primary mt-4"
        >
          Volver a intentar
        </button>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="card w-full max-w-2xl text-center">
        <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
        <h2 className="mt-4 text-xl font-semibold text-gray-800">¡Quiz completado!</h2>
        <button
          onClick={() => navigate(`/quiz/${quizId}/results`)}
          className="btn-primary mt-4"
        >
          Ver resultados
        </button>
      </div>
    );
  }

  // Helper function for option button classes
  const getOptionClasses = (optionId: number): string => {
    const isSelected = selectedOption === optionId;
    const showResult = answerResult !== null;
    const isCorrect = answerResult?.correct_option === optionId;
    const isWrong = showResult && isSelected && !answerResult?.is_correct;

    let classes = 'option-btn flex items-center gap-3';
    if (isSelected && !showResult) classes += ' selected';
    if (showResult && isCorrect) classes += ' correct';
    if (showResult && isWrong) classes += ' incorrect';
    
    return classes;
  };

  // Helper function for option label classes
  const getLabelClasses = (optionId: number): string => {
    const isSelected = selectedOption === optionId;
    const showResult = answerResult !== null;
    const isCorrect = answerResult?.correct_option === optionId;
    const isWrong = showResult && isSelected && !answerResult?.is_correct;

    let classes = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ';
    if (isSelected && !showResult) classes += 'bg-blue-500 text-white';
    else if (showResult && isCorrect) classes += 'bg-green-500 text-white';
    else if (showResult && isWrong) classes += 'bg-red-500 text-white';
    else classes += 'bg-gray-100 text-gray-600';
    
    return classes;
  };

  return (
    <div className="card w-full max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">{quizTitle}</h1>
        <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
          <span>Pregunta {currentIndex + 1} de {questions.length}</span>
          <span>{answeredQuestions.size} respondidas</span>
        </div>
        
        {/* Progress bar */}
        <div className="progress-bar mt-2">
          <div
            className="progress-fill"
            style={{ width: `${((answeredQuestions.size) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {currentQuestion.text}
        </h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option) => {
            const showResult = answerResult !== null;
            const isCorrect = answerResult?.correct_option === option.id;
            const isWrong = showResult && selectedOption === option.id && !answerResult?.is_correct;

            return (
              <button
                key={option.id}
                onClick={() => !hasAnswered && !answerResult && setSelectedOption(option.id)}
                disabled={hasAnswered || answerResult !== null}
                className={getOptionClasses(option.id)}
              >
                <span className={getLabelClasses(option.id)}>
                  {String.fromCharCode(65 + option.id)}
                </span>
                <span className="flex-1 text-left">{option.text}</span>
                {showResult && isCorrect && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {showResult && isWrong && (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Answer feedback */}
      {answerResult && (
        <div className={`p-4 rounded-lg mb-6 ${answerResult.is_correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-2">
            {answerResult.is_correct ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-700">¡Correcto!</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-700">Incorrecto</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="btn-secondary flex items-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Anterior
        </button>

        {!hasAnswered && !answerResult ? (
          <button
            onClick={submitAnswer}
            disabled={selectedOption === null || submitting}
            className="btn-primary flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Respuesta'
            )}
          </button>
        ) : (
          <button
            onClick={goToNext}
            className="btn-primary flex items-center gap-2"
          >
            {isLastQuestion ? 'Ver Resultados' : 'Siguiente'}
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
