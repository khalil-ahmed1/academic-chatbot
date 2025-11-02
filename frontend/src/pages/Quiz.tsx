import { useLocation } from "react-router-dom";
import { MCQQuiz } from "@/components/MCQQuiz";
import { toast } from "sonner";

const Quiz = () => {
  const location = useLocation();
  const mcqs = location.state?.mcqs;

  const handleQuizComplete = (score: number, total: number) => {
    toast.success(`Quiz completed! Score: ${score}/${total}`);
  };

  if (!mcqs) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">No Quiz Available</h1>
          <p className="text-gray-600">Please upload documents and start gamify learning first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Gamify Learning Quiz</h1>
            <p className="text-gray-600">Test your knowledge and earn points!</p>
          </div>
          <MCQQuiz mcqs={mcqs} onComplete={handleQuizComplete} />
        </div>
      </div>
    </div>
  );
};

export default Quiz;
