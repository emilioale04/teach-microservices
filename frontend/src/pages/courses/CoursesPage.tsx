import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCourses } from '../../hooks/useCourses';
import { coursesApi } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { CourseCard } from '../../components/courses/CourseCard';
import { CreateCourseModal } from '../../components/courses/CreateCourseModal';
import type { CourseInput } from '../../schemas/course';

export function CoursesPage() {
  const { user } = useAuth();
  const { courses, isLoading, refetch } = useCourses(user?.id);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const toast = useToast();

  const handleCreateCourse = async (data: CourseInput) => {
    if (!user) return;
    await coursesApi.create(data.name, data.description || null, user.id);
    toast.success('Curso creado correctamente');
    refetch();
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('¿Estás seguro de eliminar este curso?')) return;
    
    try {
      await coursesApi.delete(courseId);
      toast.success('Curso eliminado correctamente');
      refetch();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Error al eliminar el curso';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
        <Header title="Panel Principal">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
          >
            <span className="material-symbols-outlined mr-2">add</span>
            Crear Curso
          </button>
        </Header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              Mis Cursos
            </h1>
            <p className="text-gray-600 text-lg mt-2">
              Gestione sus cursos y verifique el progreso de sus alumnos.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando cursos...</p>
              </div>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-gray-400">school</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No tienes cursos aún
              </h3>
              <p className="text-gray-600 mb-6">
                Comienza creando tu primer curso
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
              >
                <span className="material-symbols-outlined mr-2">add</span>
                Crear Primer Curso
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onDelete={handleDeleteCourse}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateCourseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateCourse}
      />
    </div>
  );
}
