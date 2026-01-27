import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourse } from '../../hooks/useCourses';
import { coursesApi } from '../../lib/api';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { EnrollStudentModal } from '../../components/courses/EnrollStudentModal';
import type { EnrollStudentInput } from '../../schemas/course';

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { course, isLoading, refetch } = useCourse(courseId);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleEnrollStudent = async (data: EnrollStudentInput) => {
    if (!courseId) return;
    await coursesApi.enrollStudent(courseId, data);
    refetch();
  };

  const handleBulkEnroll = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!courseId || !e.target.files?.[0]) return;

    try {
      setFileError(null);
      const file = e.target.files[0];
      const response = await coursesApi.bulkEnrollStudents(courseId, file);
      
      if (response.data.error_count > 0) {
        setFileError(`${response.data.success_count} estudiantes inscritos, ${response.data.error_count} errores`);
      }
      
      refetch();
      e.target.value = '';
    } catch (error) {
      setFileError('Error al cargar el archivo');
      console.error(error);
    }
  };

  const handleUnenrollStudent = async (studentId: string) => {
    if (!courseId || !confirm('¿Desinscribir este estudiante?')) return;

    try {
      await coursesApi.unenrollStudent(courseId, studentId);
      refetch();
    } catch (error) {
      console.error('Error unenrolling student:', error);
      alert('Error al desinscribir estudiante');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Cargando curso...</p>
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
            <h2 className="text-2xl font-bold text-[#111418] dark:text-white mb-4">
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
      
      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50 dark:bg-slate-900">
        <Header title={course.name}>
          <button
            onClick={() => navigate('/courses')}
            className="flex items-center px-4 py-2 bg-slate-100 dark:bg-slate-800 text-[#111418] dark:text-white font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined mr-2">arrow_back</span>
            Volver
          </button>
        </Header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {/* Course Info */}
          <div className="bg-white dark:bg-[#1a242d] rounded-xl p-6 border border-[#dbe0e6] dark:border-slate-800 mb-8">
            <h2 className="text-2xl font-bold text-[#111418] dark:text-white mb-2">
              {course.name}
            </h2>
            <p className="text-[#617589] dark:text-slate-400">
              {course.description || 'Sin descripción'}
            </p>
          </div>

          {/* Student Management */}
          <div className="bg-white dark:bg-[#1a242d] rounded-xl p-6 border border-[#dbe0e6] dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#111418] dark:text-white">
                  Estudiantes Inscritos
                </h3>
                <p className="text-sm text-[#617589] dark:text-slate-400">
                  {course.students.length} estudiante{course.students.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="flex gap-3">
                <label className="flex items-center px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors cursor-pointer">
                  <span className="material-symbols-outlined mr-2">upload_file</span>
                  Cargar Excel/CSV
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleBulkEnroll}
                    className="hidden"
                  />
                </label>
                
                <button
                  onClick={() => setIsEnrollModalOpen(true)}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <span className="material-symbols-outlined mr-2">person_add</span>
                  Inscribir Estudiante
                </button>
              </div>
            </div>

            {fileError && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">{fileError}</p>
              </div>
            )}

            {course.students.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-slate-400">group</span>
                </div>
                <p className="text-[#617589] dark:text-slate-400">
                  No hay estudiantes inscritos en este curso
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-semibold text-sm text-[#111418] dark:text-white">
                        Nombre
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-[#111418] dark:text-white">
                        Email
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-sm text-[#111418] dark:text-white">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {course.students.map((student) => (
                      <tr
                        key={student.id}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="py-3 px-4 text-sm text-[#111418] dark:text-white">
                          {student.full_name}
                        </td>
                        <td className="py-3 px-4 text-sm text-[#617589] dark:text-slate-400">
                          {student.email}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleUnenrollStudent(student.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title="Desinscribir"
                          >
                            <span className="material-symbols-outlined text-xl">person_remove</span>
                          </button>
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
      />
    </div>
  );
}
