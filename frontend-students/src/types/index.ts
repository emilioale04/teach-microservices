// Types for Student Quiz Frontend

export interface QuizInfo {
  quiz_id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'finished';
  question_count: number;
  is_active: boolean;
}

export interface QuestionOption {
  id: number;
  text: string;
}

export interface Question {
  question_id: string;
  text: string;
  options: QuestionOption[];
  order: number;
}

export interface QuizQuestionsResponse {
  quiz_id: string;
  title: string;
  questions: Question[];
}

export interface JoinResponse {
  message: string;
  quiz_id: string;
  student_email: string;
  questions_count: number;
}

export interface AnswerResponse {
  message: string;
  is_correct: boolean;
  correct_option?: number;
}

export interface ProgressResponse {
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

export interface StudentSession {
  email: string;
  quizId: string;
  joined: boolean;
}
