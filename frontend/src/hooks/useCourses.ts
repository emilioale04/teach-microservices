import { useState, useEffect } from 'react';
import { coursesApi } from '../lib/api';
import type { Course, CourseWithStudents } from '../types';

export function useCourses(teacherId: string | undefined) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = async () => {
    if (!teacherId) return;
    
    try {
      setIsLoading(true);
      const response = await coursesApi.list(teacherId);
      setCourses(response.data);
      setError(null);
    } catch (err) {
      setError('Error al cargar cursos');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [teacherId]);

  return { courses, isLoading, error, refetch: fetchCourses };
}

export type CourseError = {
  type: 'not_found' | 'forbidden' | 'error';
  message: string;
};

export function useCourse(courseId: string | undefined) {
  const [course, setCourse] = useState<CourseWithStudents | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<CourseError | null>(null);

  const fetchCourse = async () => {
    if (!courseId) return;
    
    try {
      setIsLoading(true);
      const response = await coursesApi.get(courseId);
      setCourse(response.data);
      setError(null);
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      
      if (status === 404) {
        setError({ type: 'not_found', message: detail || 'Curso no encontrado' });
      } else if (status === 403) {
        setError({ type: 'forbidden', message: detail || 'No tienes permiso para acceder a este curso' });
      } else {
        setError({ type: 'error', message: detail || 'Error al cargar curso' });
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  return { course, isLoading, error, refetch: fetchCourse };
}
