export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
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
