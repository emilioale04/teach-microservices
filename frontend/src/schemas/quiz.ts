import { z } from 'zod';

export const quizSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(200, 'Máximo 200 caracteres'),
  description: z.string().max(1000, 'Máximo 1000 caracteres').optional().nullable(),
});

export const questionSchema = z.object({
  text: z.string().min(1, 'La pregunta es requerida').max(1000, 'Máximo 1000 caracteres'),
  options: z.array(z.string().min(1, 'La opción no puede estar vacía'))
    .length(4, 'Debe haber exactamente 4 opciones'),
  correct_option: z.number().min(0).max(3, 'Opción inválida'),
});

export const answerSchema = z.object({
  question_id: z.string().min(1),
  selected_option: z.number().min(0).max(3),
});

export type QuizInput = z.infer<typeof quizSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type AnswerInput = z.infer<typeof answerSchema>;
