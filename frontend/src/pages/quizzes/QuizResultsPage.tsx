import { useParams, useNavigate } from 'react-router-dom';
import { useQuiz, useQuizStatistics, useQuizResponses } from '../../hooks/useQuizzes';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';

export function QuizResultsPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { quiz, isLoading: quizLoading } = useQuiz(quizId);
  const { statistics, isLoading: statsLoading } = useQuizStatistics(quizId);
  const { responses, isLoading: responsesLoading } = useQuizResponses(quizId);

  const isLoading = quizLoading || statsLoading || responsesLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando resultados...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!quiz || !statistics) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quiz no encontrado</h2>
            <button onClick={() => navigate(-1)} className="px-4 py-2 bg-purple-500 text-white rounded-lg">
              Volver
            </button>
          </div>
        </main>
      </div>
    );
  }

  const sortedResponses = [...responses].sort((a, b) => b.score - a.score);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
        <Header title={`Resultados - ${quiz.title}`}>
          <button
            onClick={() => navigate(`/quizzes/${quizId}`)}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            <span className="material-symbols-outlined mr-2">arrow_back</span>
            Volver
          </button>
        </Header>

        <div className="p-8 max-w-6xl mx-auto w-full">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600">group</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Participantes</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.total_participants}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600">check_circle</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Completados</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.completed_participants}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-600">trending_up</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Promedio</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.average_score.toFixed(1)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-yellow-600">emoji_events</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Mejor Puntaje</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.highest_score}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Question Performance */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Rendimiento por Pregunta</h3>
              
              {statistics.questions_stats.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sin datos de preguntas</p>
              ) : (
                <div className="space-y-4">
                  {statistics.questions_stats.map((stat) => (
                    <div key={stat.question_id} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          Pregunta {stat.question_number}
                        </span>
                        <span className={`text-sm font-semibold ${
                          stat.accuracy >= 70 ? 'text-green-600' :
                          stat.accuracy >= 40 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {stat.accuracy}% correcto
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{stat.text}</p>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            stat.accuracy >= 70 ? 'bg-green-500' :
                            stat.accuracy >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${stat.accuracy}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {stat.correct_answers} de {stat.total_answers} respuestas correctas
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Student Rankings */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Ranking de Estudiantes</h3>
              
              {sortedResponses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sin respuestas aún</p>
              ) : (
                <div className="space-y-3">
                  {sortedResponses.map((response, index) => (
                    <div 
                      key={response._id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                        index === 1 ? 'bg-gray-50 border border-gray-200' :
                        index === 2 ? 'bg-orange-50 border border-orange-200' :
                        'bg-white border border-gray-100'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-orange-300 text-orange-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {response.student_name || response.student_email}
                        </p>
                        {response.student_name && (
                          <p className="text-xs text-gray-500 truncate">{response.student_email}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {response.score}/{response.total_questions}
                        </p>
                        <p className="text-xs text-gray-500">
                          {((response.score / response.total_questions) * 100).toFixed(0)}%
                        </p>
                      </div>
                      {response.is_completed ? (
                        <span className="material-symbols-outlined text-green-500">check_circle</span>
                      ) : (
                        <span className="material-symbols-outlined text-yellow-500">pending</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
