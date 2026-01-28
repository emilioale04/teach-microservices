import { BookOpen, AlertCircle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="card w-full max-w-md text-center">
      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-gray-400" />
      </div>
      
      <h1 className="text-2xl font-bold text-gray-800">Quiz no encontrado</h1>
      
      <p className="mt-4 text-gray-600">
        Para acceder a un quiz, necesitas el enlace proporcionado por tu profesor.
      </p>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <BookOpen className="w-8 h-8 mx-auto text-blue-600 mb-2" />
        <p className="text-sm text-blue-700">
          El enlace tiene el formato:
        </p>
        <code className="font-mono bg-white px-2 py-1 rounded mt-2 inline-block text-sm">
          /quiz/[id-del-quiz]
        </code>
      </div>
      
      <p className="mt-4 text-xs text-gray-500">
        Si crees que esto es un error, contacta a tu profesor.
      </p>
    </div>
  );
}
