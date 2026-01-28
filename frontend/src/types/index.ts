export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
}

export interface Course {
  id: string;
  name: string;
  description: string | null;
  teacher_id: string;
}

export interface Student {
  id: string;
  full_name: string;
  email: string;
}

export interface CourseWithStudents extends Course {
  students: Student[];
}

export interface EnrollStudentRequest {
  student_email: string;
  student_name: string;
}

export interface BulkEnrollResponse {
  success_count: number;
  error_count: number;
  errors: string[];
}

// ========================
// Quiz Types
// ========================

export type QuizStatus = 'draft' | 'active' | 'finished';

export interface Question {
  _id: string;
  text: string;
  options: string[];
  correct_option: number;
}

export interface QuestionForStudent {
  _id: string;
  text: string;
  options: string[];
}

export interface Quiz {
  _id: string;
  title: string;
  description: string | null;
  course_id: string;
  status: QuizStatus;
  questions: Question[];
  created_at: string;
  updated_at: string;
}

export interface QuizSummary {
  _id: string;
  title: string;
  description: string | null;
  course_id: string;
  status: QuizStatus;
  question_count: number;
  created_at: string;
}

export interface QuizForStudent {
  _id: string;
  title: string;
  description: string | null;
  questions: QuestionForStudent[];
}

export interface QuestionCreate {
  text: string;
  options: string[];
  correct_option: number;
}

export interface QuestionUpdate {
  text?: string;
  options?: string[];
  correct_option?: number;
}

export interface QuizCreate {
  title: string;
  description?: string | null;
  course_id: string;
}

export interface QuizUpdate {
  title?: string;
  description?: string | null;
}

export interface JoinQuizRequest {
  email: string;
}

export interface JoinQuizResponse {
  message: string;
  quiz_id: string;
  student_email: string;
  quiz_title: string;
  question_count: number;
}

export interface AnswerSubmit {
  question_id: string;
  selected_option: number;
}

export interface AnswerResult {
  is_correct: boolean;
  correct_option: number;
  message: string;
  current_score: number;
  questions_answered: number;
  total_questions: number;
}

export interface StudentAnswer {
  question_id: string;
  selected_option: number;
  is_correct: boolean;
  answered_at: string;
}

export interface StudentQuizResponse {
  _id: string;
  quiz_id: string;
  student_email: string;
  student_name: string | null;
  answers: StudentAnswer[];
  score: number;
  total_questions: number;
  started_at: string;
  completed_at: string | null;
  is_completed: boolean;
}

export interface QuizStatistics {
  quiz_id: string;
  title: string;
  total_participants: number;
  completed_participants: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  questions_stats: QuestionStat[];
}

export interface QuestionStat {
  question_number: number;
  question_id: string;
  text: string;
  total_answers: number;
  correct_answers: number;
  accuracy: number;
}

export interface ActivateQuizResponse {
  message: string;
  quiz_id: string;
  status: QuizStatus;
}

// WebSocket Event Types
export interface WSStudentJoined {
  event: 'student_joined';
  student_email: string;
  timestamp: string;
}

export interface WSStudentProgress {
  event: 'student_progress';
  student_email: string;
  student_name: string | null;
  question_number: number;
  total_questions: number;
  is_correct: boolean;
  current_score: number;
  timestamp: string;
}

export interface WSStudentCompleted {
  event: 'student_completed';
  student_email: string;
  student_name: string | null;
  final_score: number;
  total_questions: number;
  timestamp: string;
}

export interface WSQuizFinished {
  event: 'quiz_finished';
  quiz_id: string;
  timestamp: string;
}

export interface WSConnected {
  event: 'connected';
  quiz_id: string;
  quiz_title: string;
  quiz_status: QuizStatus;
  total_questions: number;
  current_stats: {
    active_students: number;
    completed_students: number;
    average_score: number;
  };
  timestamp: string;
}

export type WSMessage = WSStudentJoined | WSStudentProgress | WSStudentCompleted | WSQuizFinished | WSConnected;
