// API client for Student BFF endpoints

const API_BASE = '/api/student';

class ApiError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({ detail: 'Error desconocido' }));
    throw new ApiError(response.status, data.detail || 'Error en la solicitud');
  }
  return response.json();
}

export const studentApi = {
  // Get quiz info (public)
  async getQuizInfo(quizId: string) {
    const response = await fetch(`${API_BASE}/quiz/${quizId}/info`);
    return handleResponse<{
      quiz_id: string;
      title: string;
      description: string;
      status: string;
      question_count: number;
      is_active: boolean;
    }>(response);
  },

  // Join a quiz
  async joinQuiz(quizId: string, email: string) {
    const response = await fetch(`${API_BASE}/quiz/${quizId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse<{
      message: string;
      quiz_id: string;
      student_email: string;
      questions_count: number;
    }>(response);
  },

  // Get questions (without answers)
  async getQuestions(quizId: string, email: string) {
    const params = new URLSearchParams({ email });
    const response = await fetch(`${API_BASE}/quiz/${quizId}/questions?${params}`);
    return handleResponse<{
      quiz_id: string;
      title: string;
      questions: Array<{
        question_id: string;
        text: string;
        options: Array<{ id: number; text: string }>;
        order: number;
      }>;
    }>(response);
  },

  // Submit an answer
  async submitAnswer(quizId: string, email: string, questionId: string, selectedOption: number) {
    const params = new URLSearchParams({ email });
    const response = await fetch(`${API_BASE}/quiz/${quizId}/answer?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: questionId,
        selected_option: selectedOption,
      }),
    });
    return handleResponse<{
      message: string;
      is_correct: boolean;
      correct_option?: number;
    }>(response);
  },

  // Get progress
  async getProgress(quizId: string, email: string) {
    const params = new URLSearchParams({ email });
    const response = await fetch(`${API_BASE}/quiz/${quizId}/progress?${params}`);
    return handleResponse<{
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
    }>(response);
  },
};

export { ApiError };
