import { Link } from 'react-router-dom';
import type { QuizSummary } from '../../types';

interface QuizCardProps {
  quiz: QuizSummary;
  onDelete: (id: string) => void;
  onActivate?: (id: string) => void;
  onFinish?: (id: string) => void;
}

const statusConfig = {
  draft: {
    label: 'Borrador',
    color: 'bg-gray-100 text-gray-700',
    icon: 'edit_note',
  },
  active: {
    label: 'Activo',
    color: 'bg-green-100 text-green-700',
    icon: 'play_circle',
  },
  finished: {
    label: 'Finalizado',
    color: 'bg-blue-100 text-blue-700',
    icon: 'check_circle',
  },
};

export function QuizCard({ quiz, onDelete, onActivate, onFinish }: QuizCardProps) {
  const status = statusConfig[quiz.status];
  const formattedDate = new Date(quiz.created_at).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="group bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all">
      <div className="aspect-video w-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center relative">
        <span className="material-symbols-outlined text-white text-6xl">quiz</span>
        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${status.color}`}>
          <span className="material-symbols-outlined text-sm">{status.icon}</span>
          {status.label}
        </div>
      </div>
      
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-500 transition-colors">
            {quiz.title}
          </h3>
          <button
            onClick={() => onDelete(quiz._id)}
            className="text-gray-400 hover:text-red-600"
            title="Eliminar quiz"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-600 text-sm line-clamp-2">
            {quiz.description || 'Sin descripción'}
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-lg">help</span>
            <span>{quiz.question_count} preguntas</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-lg">calendar_today</span>
            <span>{formattedDate}</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Link
            to={`/quizzes/${quiz._id}`}
            className="flex-1 py-2 text-center text-purple-500 bg-purple-50 rounded-lg text-sm font-bold hover:bg-purple-500 hover:text-white transition-colors"
          >
            Ver Detalles
          </Link>
          
          {quiz.status === 'draft' && onActivate && (
            <button
              onClick={() => onActivate(quiz._id)}
              className="px-4 py-2 text-green-600 bg-green-50 rounded-lg text-sm font-bold hover:bg-green-500 hover:text-white transition-colors"
              title="Activar quiz"
            >
              <span className="material-symbols-outlined">play_arrow</span>
            </button>
          )}
          
          {quiz.status === 'active' && (
            <>
              <Link
                to={`/quizzes/${quiz._id}/monitor`}
                className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg text-sm font-bold hover:bg-blue-500 hover:text-white transition-colors"
                title="Monitorear en vivo"
              >
                <span className="material-symbols-outlined">monitoring</span>
              </Link>
              {onFinish && (
                <button
                  onClick={() => onFinish(quiz._id)}
                  className="px-4 py-2 text-orange-600 bg-orange-50 rounded-lg text-sm font-bold hover:bg-orange-500 hover:text-white transition-colors"
                  title="Finalizar quiz"
                >
                  <span className="material-symbols-outlined">stop</span>
                </button>
              )}
            </>
          )}

          {quiz.status === 'finished' && (
            <Link
              to={`/quizzes/${quiz._id}/results`}
              className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg text-sm font-bold hover:bg-blue-500 hover:text-white transition-colors"
              title="Ver resultados"
            >
              <span className="material-symbols-outlined">analytics</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
