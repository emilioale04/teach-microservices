# Student Quiz Frontend

Frontend independiente para que los estudiantes respondan quizzes.

## Caracter√≠sticas

- ÌæØ **Flujo simplificado**: Solo requiere email del estudiante
- Ì¥ê **Validaci√≥n por email**: Sin JWT, validaci√≥n de inscripci√≥n en el curso
- Ì≥± **Dise√±o responsivo**: Optimizado para m√≥viles
- ‚ö° **Tiempo real**: Feedback inmediato de respuestas

## Estructura de URLs

```
/quiz/:quizId       ‚Üí P√°gina de unirse al quiz (email)
/quiz/:quizId/play  ‚Üí Responder preguntas
/quiz/:quizId/results ‚Üí Ver resultados
```

## Patr√≥n BFF (Backend for Frontend)

Este frontend usa el Student BFF del Gateway, que expone endpoints limitados:

| Endpoint | Descripci√≥n |
|----------|-------------|
| GET /student/quiz/:id/info | Info p√∫blica del quiz |
| POST /student/quiz/:id/join | Unirse al quiz |
| GET /student/quiz/:id/questions | Obtener preguntas (sin respuestas) |
| POST /student/quiz/:id/answer | Enviar una respuesta |
| GET /student/quiz/:id/progress | Ver progreso/resultados |

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo (puerto 5174)
npm run dev
```

## Diferencias con el Frontend de Docentes

| Aspecto | Docentes | Estudiantes |
|---------|----------|-------------|
| Autenticaci√≥n | JWT (Supabase) | Solo email |
| Endpoints | Todos (/quizzes/*) | Solo Student BFF |
| Funciones | CRUD completo | Solo responder |
| Puerto | 5173 | 5174 |
