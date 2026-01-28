import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, Mail, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { studentApi, ApiError } from '../lib/api';
import { useStudent } from '../contexts/StudentContext';

const joinSchema = z.object({
  email: z.string().email('Ingresa un email válido'),
});

type JoinFormData = z.infer<typeof joinSchema>;

interface QuizInfo {
  quiz_id: string;
  title: string;
  description: string;
  status: string;
  question_count: number;
  is_active: boolean;
}

export default function JoinQuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { session, setSession } = useStudent();
  
  const [quizInfo, setQuizInfo] = useState<QuizInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinFormData>({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      email: session?.email || '',
    },
  });

  // Load quiz info
  useEffect(() => {
    if (!quizId) return;

    async function loadQuiz() {
      try {
        setLoading(true);
        setError(null);
        const info = await studentApi.getQuizInfo(quizId!);
        setQuizInfo(info);
        
        // If already joined this quiz, redirect to play
        if (session?.quizId === quizId && session?.joined) {
          navigate(`/quiz/${quizId}/play`);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Error al cargar el quiz');
        }
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [quizId, session, navigate]);

  const onSubmit = async (data: JoinFormData) => {
    if (!quizId) return;

    try {
      setJoining(true);
      setError(null);
      
      await studentApi.joinQuiz(quizId, data.email);
      
      // Save session and navigate
      setSession({
        email: data.email,
        quizId: quizId,
        joined: true,
      });
      
      navigate(`/quiz/${quizId}/play`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al unirse al quiz');
      }
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="card w-full max-w-md text-center">
        <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
        <p className="mt-4 text-gray-600">Cargando quiz...</p>
      </div>
    );
  }

  if (error && !quizInfo) {
    return (
      <div className="card w-full max-w-md text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
        <h2 className="mt-4 text-xl font-semibold text-gray-800">Quiz no disponible</h2>
        <p className="mt-2 text-gray-600">{error}</p>
      </div>
    );
  }

  if (!quizInfo?.is_active) {
    return (
      <div className="card w-full max-w-md text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-yellow-500" />
        <h2 className="mt-4 text-xl font-semibold text-gray-800">Quiz no activo</h2>
        <p className="mt-2 text-gray-600">
          Este quiz aún no está disponible para responder.
          <br />
          Por favor, espera a que el profesor lo active.
        </p>
      </div>
    );
  }

  return (
    <div className="card w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">{quizInfo.title}</h1>
        {quizInfo.description && (
          <p className="mt-2 text-gray-600">{quizInfo.description}</p>
        )}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>{quizInfo.question_count} preguntas</span>
        </div>
      </div>

      {/* Join Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tu correo electrónico
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              placeholder="estudiante@ejemplo.com"
              className="input-field pl-10"
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={joining}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {joining ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Uniéndose...
            </>
          ) : (
            'Unirme al Quiz'
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-500">
        Debes estar inscrito en el curso para participar
      </p>
    </div>
  );
}
