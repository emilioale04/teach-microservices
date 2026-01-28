import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourse } from '../../hooks/useCourses';
import { coursesApi } from '../../lib/api';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { EnrollStudentModal } from '../../components/courses/EnrollStudentModal';
import { EditStudentModal } from '../../components/courses/EditStudentModal';
import { EditCourseModal } from '../../components/courses/EditCourseModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import type { EnrollStudentInput } from '../../schemas/course';
import type { Student } from '../../types';

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { course, isLoading, error, refetch } = useCourse(courseId);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentToUnenroll, setStudentToUnenroll] = useState<Student | null>(null);
  const toast = useToast();

  const handleEnrollStudent = async (data: EnrollStudentInput) => {
    if (!courseId) return;
    await coursesApi.enrollStudent(courseId, data);
    refetch();
  };

  const handleBulkEnroll = async (file: File) => {
    if (!courseId) {
      throw new Error('Course ID not found');
    }
    
    const response = await coursesApi.bulkEnrollStudents(courseId, file);
    refetch();
    return response.data;
  };

  const handleUnenrollStudent = (student: Student) => {
    setStudentToUnenroll(student);
    setIsConfirmDialogOpen(true);
  };

  const confirmUnenrollStudent = async () => {
    if (!courseId || !studentToUnenroll) return;

    try {
      await coursesApi.unenrollStudent(courseId, studentToUnenroll.id);
      toast.success('Estudiante desinscrito correctamente');
      refetch();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Error al desinscribir estudiante';
      toast.error(errorMessage);
    } finally {
      setStudentToUnenroll(null);
    }
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsEditStudentModalOpen(true);
  };

  const handleUpdateStudent = async (studentId: string, fullName: string, email: string) => {
    try {
      await coursesApi.updateStudent(studentId, fullName, email);
      toast.success('Estudiante actualizado correctamente');
      refetch();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Error al actualizar estudiante';
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleUpdateCourse = async (courseId: string, name: string, description: string | null) => {
    try {
      await coursesApi.update(courseId, name, description);
      toast.success('Curso actualizado correctamente');
      refetch();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Error al actualizar curso';
      toast.error(errorMessage);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando curso...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            {error.type === 'forbidden' ? (
              <>
                <span className="material-symbols-outlined text-6xl text-red-500 mb-4">block</span>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Acceso denegado
                </h2>
                <p className="text-gray-600 mb-4">
                  {error.message}
                </p>
              </>
            ) : error.type === 'not_found' ? (
              <>
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">search_off</span>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Curso no encontrado
                </h2>
                <p className="text-gray-600 mb-4">
                  El curso que buscas no existe o ha sido eliminado.
                </p>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-6xl text-yellow-500 mb-4">error</span>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Error al cargar el curso
                </h2>
                <p className="text-gray-600 mb-4">
                  {error.message}
                </p>
              </>
            )}
            <button
              onClick={() => navigate('/courses')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Volver a Cursos
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Curso no encontrado
            </h2>
            <button
              onClick={() => navigate('/courses')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Volver a Cursos
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
        <Header title={course.name}>
          <button
            onClick={() => navigate('/courses')}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            <span className="material-symbols-outlined mr-2">arrow_back</span>
            Volver
          </button>
        </Header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {/* Course Info */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 mb-8">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {course.name}
                </h2>
                <p className="text-gray-600">
                  {course.description || 'Sin descripción'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditCourseModalOpen(true)}
                  className="flex items-center px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar curso"
                >
                  <span className="material-symbols-outlined">edit</span>
                </button>
              </div>
            </div>
          </div>

          {/* Student Management */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Estudiantes Inscritos
                </h3>
                <p className="text-sm text-gray-600">
                  {course.students.length} estudiante{course.students.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEnrollModalOpen(true)}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <span className="material-symbols-outlined mr-2">person_add</span>
                  Inscribir Estudiante(s)
                </button>
              </div>
            </div>

            {course.students.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-gray-400">group</span>
                </div>
                <p className="text-gray-600">
                  No hay estudiantes inscritos en este curso
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">
                        Nombre
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">
                        Email
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-sm text-gray-900">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {course.students.map((student) => (
                      <tr
                        key={student.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {student.full_name}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {student.email}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditStudent(student)}
                              className="text-blue-600 hover:text-blue-700"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-xl">edit</span>
                            </button>
                            <button
                              onClick={() => handleUnenrollStudent(student)}
                              className="text-red-600 hover:text-red-700"
                              title="Desinscribir"
                            >
                              <span className="material-symbols-outlined text-xl">person_remove</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <EnrollStudentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        onEnroll={handleEnrollStudent}
        onBulkEnroll={handleBulkEnroll}
      />

      <EditStudentModal
        isOpen={isEditStudentModalOpen}
        onClose={() => {
          setIsEditStudentModalOpen(false);
          setSelectedStudent(null);
        }}
        onUpdate={handleUpdateStudent}
        student={selectedStudent}
      />

      <EditCourseModal
        isOpen={isEditCourseModalOpen}
        onClose={() => setIsEditCourseModalOpen(false)}
        onUpdate={handleUpdateCourse}
        course={course}
      />

      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => {
          setIsConfirmDialogOpen(false);
          setStudentToUnenroll(null);
        }}
        onConfirm={confirmUnenrollStudent}
        title="Desinscribir Estudiante"
        message={`¿Estás seguro de que deseas desinscribir a ${studentToUnenroll?.full_name || 'este estudiante'}? Esta acción no se puede deshacer.`}
        confirmText="Desinscribir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}
