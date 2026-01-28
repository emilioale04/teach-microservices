import type { Question } from '../../types';

interface QuestionListProps {
  questions: Question[];
  onEdit: (question: Question) => void;
  onDelete: (questionId: string) => void;
  isEditable: boolean;
}

export function QuestionList({ questions, onEdit, onDelete, isEditable }: QuestionListProps) {
  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-gray-400">help</span>
        </div>
        <p className="text-gray-600">
          No hay preguntas en este quiz
        </p>
        {isEditable && (
          <p className="text-gray-500 text-sm mt-2">
            Agrega preguntas para comenzar
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <div
          key={question._id}
          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                {index + 1}
              </span>
              <p className="text-gray-900 font-medium pt-1">{question.text}</p>
            </div>
            
            {isEditable && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(question)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar pregunta"
                >
                  <span className="material-symbols-outlined text-xl">edit</span>
                </button>
                <button
                  onClick={() => onDelete(question._id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar pregunta"
                >
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
              </div>
            )}
          </div>
          
          <div className="ml-11 grid grid-cols-1 md:grid-cols-2 gap-2">
            {question.options.map((option, optIndex) => (
              <div
                key={optIndex}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  optIndex === question.correct_option
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  optIndex === question.correct_option
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {String.fromCharCode(65 + optIndex)}
                </span>
                <span>{option}</span>
                {optIndex === question.correct_option && (
                  <span className="material-symbols-outlined text-green-600 ml-auto text-lg">check_circle</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
