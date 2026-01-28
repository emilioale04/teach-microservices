import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuiz } from '../../hooks/useQuizzes';
import { useToast } from '../../contexts/ToastContext';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import type { WSStudentProgress, WSStudentCompleted, WSStudentJoined, WSConnected } from '../../types';

const WS_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  .replace('http://', 'ws://')
  .replace('https://', 'wss://');

// Helper to get token for WebSocket auth
const getWsToken = () => localStorage.getItem('token') || '';

interface StudentActivity {
  email: string;
  name: string | null;
  questionsAnswered: number;
  totalQuestions: number;
  score: number;
  isCompleted: boolean;
  lastActivity: string;
}

interface ActivityLog {
  id: string;
  type: 'join' | 'progress' | 'completed';
  message: string;
  timestamp: string;
  isCorrect?: boolean;
}

export function QuizMonitorPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { quiz, isLoading } = useQuiz(quizId);
  const toast = useToast();
  
  const [isConnected, setIsConnected] = useState(false);
  const [students, setStudents] = useState<Map<string, StudentActivity>>(new Map());
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({
    activeStudents: 0,
    completedStudents: 0,
    averageScore: 0,
  });
  
  // Use refs to avoid dependency issues
  const wsRef = useRef<WebSocket | null>(null);
  const hasConnectedRef = useRef(false);
  const toastRef = useRef(toast);
  const quizQuestionsLengthRef = useRef(0);

  // Keep toast ref updated
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // Keep quiz questions length ref updated
  useEffect(() => {
    if (quiz?.questions?.length) {
      quizQuestionsLengthRef.current = quiz.questions.length;
    }
  }, [quiz?.questions?.length]);

  // Single WebSocket connection effect - only depends on quizId
  useEffect(() => {
    // Don't connect if no quizId or already connected
    if (!quizId || hasConnectedRef.current) {
      return;
    }

    const connectWebSocket = () => {
      // Double check we haven't already connected
      if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
        return;
      }

      hasConnectedRef.current = true;
      const token = getWsToken();
      const wsUrl = `${WS_BASE_URL}/ws/quizzes/${quizId}/monitor${token ? `?token=${token}` : ''}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.event) {
            case 'connected': {
              const connectedData = data as WSConnected;
              setStats({
                activeStudents: connectedData.current_stats.active_students,
                completedStudents: connectedData.current_stats.completed_students,
                averageScore: connectedData.current_stats.average_score,
              });
              toastRef.current.success('Conectado al monitoreo en tiempo real');
              break;
            }
            
            case 'student_joined': {
              const joinData = data as WSStudentJoined;
              setStudents(prev => {
                const updated = new Map(prev);
                updated.set(joinData.student_email, {
                  email: joinData.student_email,
                  name: null,
                  questionsAnswered: 0,
                  totalQuestions: quizQuestionsLengthRef.current,
                  score: 0,
                  isCompleted: false,
                  lastActivity: joinData.timestamp,
                });
                return updated;
              });
              setStats(prev => ({ ...prev, activeStudents: prev.activeStudents + 1 }));
              setActivityLog(prev => [{
                id: `${Date.now()}-${Math.random()}`,
                type: 'join' as const,
                message: `${joinData.student_email} se unió al quiz`,
                timestamp: joinData.timestamp,
              }, ...prev].slice(0, 50));
              break;
            }
            
            case 'student_progress': {
              const progressData = data as WSStudentProgress;
              setStudents(prev => {
                const updated = new Map(prev);
                updated.set(progressData.student_email, {
                  email: progressData.student_email,
                  name: progressData.student_name,
                  questionsAnswered: progressData.question_number,
                  totalQuestions: progressData.total_questions,
                  score: progressData.current_score,
                  isCompleted: false,
                  lastActivity: progressData.timestamp,
                });
                return updated;
              });
              setActivityLog(prev => [{
                id: `${Date.now()}-${Math.random()}`,
                type: 'progress' as const,
                message: `${progressData.student_name || progressData.student_email} respondió pregunta ${progressData.question_number}`,
                timestamp: progressData.timestamp,
                isCorrect: progressData.is_correct,
              }, ...prev].slice(0, 50));
              break;
            }
            
            case 'student_completed': {
              const completedData = data as WSStudentCompleted;
              setStudents(prev => {
                const updated = new Map(prev);
                updated.set(completedData.student_email, {
                  email: completedData.student_email,
                  name: completedData.student_name,
                  questionsAnswered: completedData.total_questions,
                  totalQuestions: completedData.total_questions,
                  score: completedData.final_score,
                  isCompleted: true,
                  lastActivity: completedData.timestamp,
                });
                return updated;
              });
              setStats(prev => ({
                ...prev,
                completedStudents: prev.completedStudents + 1,
              }));
              setActivityLog(prev => [{
                id: `${Date.now()}-${Math.random()}`,
                type: 'completed' as const,
                message: `${completedData.student_name || completedData.student_email} completó el quiz (${completedData.final_score}/${completedData.total_questions})`,
                timestamp: completedData.timestamp,
              }, ...prev].slice(0, 50));
              break;
            }
            
            case 'quiz_finished': {
              toastRef.current.info('El quiz ha sido finalizado');
              break;
            }
            
            case 'pong': {
              // Heartbeat response - do nothing
              break;
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;
        // Don't reset hasConnectedRef - we don't want to reconnect automatically
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    };

    // Small delay to ensure component is fully mounted
    const timeoutId = setTimeout(connectWebSocket, 100);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      hasConnectedRef.current = false;
    };
  }, [quizId]); // ONLY depend on quizId

  // Heartbeat to keep connection alive
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping');
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quiz no encontrado</h2>
            <button onClick={() => navigate(-1)} className="px-4 py-2 bg-purple-500 text-white rounded-lg">
              Volver
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (quiz.status !== 'active') {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">monitoring</span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz no activo</h2>
            <p className="text-gray-600 mb-4">El monitoreo solo está disponible para quizzes activos</p>
            <button 
              onClick={() => navigate(`/quizzes/${quizId}`)} 
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              Ver Quiz
            </button>
          </div>
        </main>
      </div>
    );
  }

  const studentsList = Array.from(students.values()).sort((a, b) => {
    // Completed students first, then by score
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? -1 : 1;
    return b.score - a.score;
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <Header title={`Monitoreo - ${quiz.title}`}>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              {isConnected ? 'En vivo' : 'Desconectado'}
            </div>
            <button
              onClick={() => navigate(`/quizzes/${quizId}`)}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
              <span className="material-symbols-outlined mr-2">arrow_back</span>
              Volver
            </button>
          </div>
        </Header>

        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600">group</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estudiantes Activos</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeStudents}</p>
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
                    <p className="text-2xl font-bold text-gray-900">{stats.completedStudents}</p>
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
                    <p className="text-2xl font-bold text-gray-900">{stats.averageScore.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Participantes</h3>
              </div>
              <div className="flex-1 overflow-auto">
                {studentsList.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-4xl text-gray-300">hourglass_empty</span>
                      <p className="mt-2">Esperando estudiantes...</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Estudiante</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">Progreso</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">Puntaje</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsList.map((student) => (
                        <tr key={student.email} className="border-b border-gray-100">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-gray-900">{student.name || 'Sin nombre'}</p>
                              <p className="text-sm text-gray-500">{student.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-purple-500 transition-all duration-300"
                                  style={{ width: `${student.totalQuestions > 0 ? (student.questionsAnswered / student.totalQuestions) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">
                                {student.questionsAnswered}/{student.totalQuestions}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-bold text-gray-900">{student.score}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              student.isCompleted
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              <span className="material-symbols-outlined text-sm">
                                {student.isCompleted ? 'check_circle' : 'pending'}
                              </span>
                              {student.isCompleted ? 'Completado' : 'En progreso'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Actividad</h3>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {activityLog.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>Sin actividad reciente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityLog.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          activity.type === 'join' ? 'bg-blue-100' :
                          activity.type === 'completed' ? 'bg-green-100' :
                          activity.isCorrect ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <span className={`material-symbols-outlined text-lg ${
                            activity.type === 'join' ? 'text-blue-600' :
                            activity.type === 'completed' ? 'text-green-600' :
                            activity.isCorrect ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {activity.type === 'join' ? 'login' :
                             activity.type === 'completed' ? 'flag' :
                             activity.isCorrect ? 'check' : 'close'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{activity.message}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleTimeString('es-ES')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
