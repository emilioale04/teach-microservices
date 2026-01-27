import { Link } from 'react-router-dom';
import type { Course } from '../../types';

interface CourseCardProps {
  course: Course;
  onDelete: (id: string) => void;
}

export function CourseCard({ course, onDelete }: CourseCardProps) {
  return (
    <div className="group bg-white dark:bg-[#1a242d] rounded-xl overflow-hidden border border-[#dbe0e6] dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
      <div className="aspect-video w-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center">
        <span className="material-symbols-outlined text-white text-6xl">book</span>
      </div>
      
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-[#111418] dark:text-white group-hover:text-blue-500 transition-colors">
            {course.name}
          </h3>
          <button
            onClick={() => onDelete(course.id)}
            className="text-slate-400 hover:text-red-600"
            title="Eliminar curso"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-[#617589] dark:text-slate-400 text-sm line-clamp-2">
            {course.description || 'Sin descripción'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Link
            to={`/courses/${course.id}`}
            className="flex-1 py-2 text-center text-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm font-bold hover:bg-blue-500 hover:text-white transition-colors"
          >
            Ver Detalles
          </Link>
        </div>
      </div>
    </div>
  );
}
