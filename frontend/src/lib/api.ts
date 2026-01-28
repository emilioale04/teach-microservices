import axios from 'axios';
import type { 
  AuthResponse, Course, CourseWithStudents, Student, EnrollStudentRequest, BulkEnrollResponse,
  Quiz, QuizSummary, QuizCreate, QuizUpdate, Question, QuestionCreate, QuestionUpdate,
  ActivateQuizResponse, StudentQuizResponse, QuizStatistics, JoinQuizResponse, AnswerResult
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si es error 401 y no es la petición de login/refresh, intentar refrescar
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        // Si ya se está refrescando, esperar en cola
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            originalRequest.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        // No hay refresh token, hacer logout
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;
        
        localStorage.setItem('token', access_token);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Actualizar header y reintentar peticiones en cola
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        processQueue();
        
        return api(originalRequest);
      } catch (refreshError) {
        // Error al refrescar, hacer logout
        processQueue(refreshError);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  signup: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/signup', { email, password }),
  
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  
  refresh: (refreshToken: string) =>
    api.post<AuthResponse>('/auth/refresh', { refresh_token: refreshToken }),
  
  requestPasswordReset: (email: string) =>
    api.post('/auth/password-reset', { email }),
  
  confirmPasswordReset: (password: string) =>
    api.post('/auth/password-reset/confirm', { password }),
};

// Courses API
export const coursesApi = {
  list: (teacherId: string) =>
    api.get<Course[]>('/courses', { params: { teacher_id: teacherId } }),
  
  get: (courseId: string) =>
    api.get<CourseWithStudents>(`/courses/${courseId}`),
  
  create: (name: string, description: string | null, teacherId: string) =>
    api.post<Course>('/courses', { name, description, teacher_id: teacherId }),
  
  update: (courseId: string, name?: string, description?: string | null) =>
    api.patch<Course>(`/courses/${courseId}`, { name, description }),
  
  delete: (courseId: string) =>
    api.delete(`/courses/${courseId}`),
  
  enrollStudent: (courseId: string, data: EnrollStudentRequest) =>
    api.post<Student>(`/courses/${courseId}/students`, data),
  
  bulkEnrollStudents: (courseId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<BulkEnrollResponse>(`/courses/${courseId}/students/bulk`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  unenrollStudent: (courseId: string, studentId: string) =>
    api.delete(`/courses/${courseId}/students/${studentId}`),
  
  updateStudent: (studentId: string, fullName: string, email: string) =>
    api.patch<Student>(`/students/${studentId}`, { full_name: fullName, email }),
};

// Students API
export const studentsApi = {
  get: (studentId: string) =>
    api.get<Student>(`/students/${studentId}`),
  
  getByEmail: (email: string) =>
    api.get<Student>('/students', { params: { email } }),
  
  update: (studentId: string, full_name?: string, email?: string) =>
    api.patch<Student>(`/students/${studentId}`, { full_name, email }),
};

// Quizzes API
export const quizzesApi = {
  // Quiz CRUD
  list: (courseId?: string) =>
    api.get<QuizSummary[]>('/quizzes', { params: courseId ? { course_id: courseId } : {} }),
  
  listAll: () =>
    api.get<QuizSummary[]>('/quizzes'),
  
  get: (quizId: string) =>
    api.get<Quiz>(`/quizzes/${quizId}`),
  
  create: (data: QuizCreate) =>
    api.post<Quiz>('/quizzes', data),
  
  update: (quizId: string, data: QuizUpdate) =>
    api.patch<Quiz>(`/quizzes/${quizId}`, data),
  
  delete: (quizId: string) =>
    api.delete(`/quizzes/${quizId}`),
  
  // Quiz Status
  activate: (quizId: string) =>
    api.post<ActivateQuizResponse>(`/quizzes/${quizId}/activate`),
  
  finish: (quizId: string) =>
    api.post<ActivateQuizResponse>(`/quizzes/${quizId}/finish`),
  
  // Questions
  addQuestion: (quizId: string, data: QuestionCreate) =>
    api.post<Question>(`/quizzes/${quizId}/questions`, data),
  
  updateQuestion: (quizId: string, questionId: string, data: QuestionUpdate) =>
    api.patch<Question>(`/quizzes/${quizId}/questions/${questionId}`, data),
  
  deleteQuestion: (quizId: string, questionId: string) =>
    api.delete(`/quizzes/${quizId}/questions/${questionId}`),
  
  // Results
  getResponses: (quizId: string) =>
    api.get<StudentQuizResponse[]>(`/quizzes/${quizId}/responses`),
  
  getStatistics: (quizId: string) =>
    api.get<QuizStatistics>(`/quizzes/${quizId}/statistics`),
  
  // Student Participation
  join: (quizId: string, email: string) =>
    api.post<JoinQuizResponse>(`/quizzes/${quizId}/join`, { email }),
  
  getForStudent: (quizId: string, email: string) =>
    api.get(`/quizzes/${quizId}/student`, { params: { email } }),
  
  submitAnswer: (quizId: string, email: string, questionId: string, selectedOption: number) =>
    api.post<AnswerResult>(`/quizzes/${quizId}/answer`, 
      { question_id: questionId, selected_option: selectedOption },
      { params: { email } }
    ),
  
  getMyProgress: (quizId: string, email: string) =>
    api.get<StudentQuizResponse>(`/quizzes/${quizId}/my-progress`, { params: { email } }),
};

export default api;
