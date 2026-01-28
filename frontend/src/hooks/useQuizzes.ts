import { useState, useEffect, useCallback } from 'react';
import { quizzesApi } from '../lib/api';
import type { Quiz, QuizSummary, QuizStatistics, StudentQuizResponse } from '../types';

export function useQuizzes(courseId?: string) {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuizzes = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await quizzesApi.list(courseId);
      setQuizzes(response.data);
      setError(null);
    } catch (err) {
      setError('Error al cargar quizzes');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  return { quizzes, isLoading, error, refetch: fetchQuizzes };
}

export function useAllQuizzes() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuizzes = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await quizzesApi.listAll();
      setQuizzes(response.data);
      setError(null);
    } catch (err) {
      setError('Error al cargar quizzes');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  return { quizzes, isLoading, error, refetch: fetchQuizzes };
}

export function useQuiz(quizId: string | undefined) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuiz = useCallback(async () => {
    if (!quizId) return;
    
    try {
      setIsLoading(true);
      const response = await quizzesApi.get(quizId);
      setQuiz(response.data);
      setError(null);
    } catch (err) {
      setError('Error al cargar quiz');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  return { quiz, isLoading, error, refetch: fetchQuiz };
}

export function useQuizStatistics(quizId: string | undefined) {
  const [statistics, setStatistics] = useState<QuizStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    if (!quizId) return;
    
    try {
      setIsLoading(true);
      const response = await quizzesApi.getStatistics(quizId);
      setStatistics(response.data);
      setError(null);
    } catch (err) {
      setError('Error al cargar estadísticas');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return { statistics, isLoading, error, refetch: fetchStatistics };
}

export function useQuizResponses(quizId: string | undefined) {
  const [responses, setResponses] = useState<StudentQuizResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResponses = useCallback(async () => {
    if (!quizId) return;
    
    try {
      setIsLoading(true);
      const response = await quizzesApi.getResponses(quizId);
      setResponses(response.data);
      setError(null);
    } catch (err) {
      setError('Error al cargar respuestas');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  return { responses, isLoading, error, refetch: fetchResponses };
}
