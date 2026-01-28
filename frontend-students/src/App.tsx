import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StudentProvider } from './contexts/StudentContext';
import JoinQuizPage from './pages/JoinQuizPage';
import QuizPage from './pages/QuizPage';
import ResultsPage from './pages/ResultsPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <StudentProvider>
      <BrowserRouter>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Routes>
            {/* Landing / Join page with quiz ID param */}
            <Route path="/quiz/:quizId" element={<JoinQuizPage />} />
            
            {/* Quiz answering page */}
            <Route path="/quiz/:quizId/play" element={<QuizPage />} />
            
            {/* Results page */}
            <Route path="/quiz/:quizId/results" element={<ResultsPage />} />
            
            {/* Root and 404 */}
            <Route path="/" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </StudentProvider>
  );
}

export default App;
