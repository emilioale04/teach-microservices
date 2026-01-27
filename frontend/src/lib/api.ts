import axios from 'axios';
import type { AuthResponse, Course, CourseWithStudents, Student, EnrollStudentRequest, BulkEnrollResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  signup: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/signup', { email, password }),
  
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
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

export default api;
