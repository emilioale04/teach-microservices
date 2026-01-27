import { z } from 'zod';

export const courseSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  description: z.string().max(1000, 'Máximo 1000 caracteres').optional().nullable(),
});

export const enrollStudentSchema = z.object({
  student_email: z.string().email('Email inválido'),
  student_name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
});

export type CourseInput = z.infer<typeof courseSchema>;
export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;
