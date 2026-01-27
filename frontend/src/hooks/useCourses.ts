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

export function useCourse(courseId: string | undefined) {
  const [course, setCourse] = useState<CourseWithStudents | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourse = async () => {
    if (!courseId) return;
    
    try {
      setIsLoading(true);
      const response = await coursesApi.get(courseId);
      setCourse(response.data);
      setError(null);
    } catch (err) {
      setError('Error al cargar curso');
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
