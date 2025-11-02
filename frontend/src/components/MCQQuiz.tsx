import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, BookOpen } from "lucide-react";

interface MCQ {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: string;
  explanation: string;
}

interface MCQQuizProps {
  mcqs: MCQ[];
  onComplete: (score: number, total: number) => void;
}

export const MCQQuiz = ({ mcqs, onComplete }: MCQQuizProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const currentMCQ = mcqs[currentIndex];
  const totalQuestions = mcqs.length;

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [currentIndex]: answer }));
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowExplanation(false);
    } else {
      // Calculate score
      const score = Object.entries(selectedAnswers).reduce((acc, [idx, answer]) => {
        const mcqIndex = parseInt(idx);
        return acc + (answer === mcqs[mcqIndex].correct ? 1 : 0);
      }, 0);
      setShowResults(true);
      onComplete(score, totalQuestions);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
  };

  if (showResults) {
    const score = Object.entries(selectedAnswers).reduce((acc, [idx, answer]) => {
      const mcqIndex = parseInt(idx);
      return acc + (answer === mcqs[mcqIndex].correct ? 1 : 0);
    }, 0);
    const percentage = Math.round((score / totalQuestions) * 100);

    return (
      <Card className="p-6 max-w-2xl mx-auto">
        <div className="text-center space-y-4">
          <Trophy className="w-16 h-16 mx-auto text-yellow-500" />
          <h2 className="text-2xl font-bold">Quiz Complete!</h2>
          <div className="text-4xl font-bold text-primary">{score}/{totalQuestions}</div>
          <Badge variant={percentage >= 70 ? "default" : percentage >= 50 ? "secondary" : "destructive"}>
            {percentage}% Correct
          </Badge>
          <p className="text-muted-foreground">
            {percentage >= 80 ? "Excellent work! 🎉" :
             percentage >= 60 ? "Good job! Keep learning! 📚" :
             "Keep practicing! You'll get better! 💪"}
          </p>
          <Button onClick={handleRestart} className="mt-4">
            <BookOpen className="w-4 h-4 mr-2" />
            Take Quiz Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Target className="w-5 h-5" />
            Academic Quiz
          </h2>
          <Badge variant="outline">
            Question {currentIndex + 1} of {totalQuestions}
          </Badge>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">{currentMCQ.question}</h3>

          <RadioGroup
            value={selectedAnswers[currentIndex] || ""}
            onValueChange={handleAnswerSelect}
            disabled={showExplanation}
            className="space-y-3"
          >
            {Object.entries(currentMCQ.options).map(([key, value]) => {
              const isSelected = selectedAnswers[currentIndex] === key;
              const isCorrect = key === currentMCQ.correct;
              let bgColor = "";
              if (showExplanation) {
                if (isCorrect) bgColor = "bg-green-100 border-green-500";
                else if (isSelected && !isCorrect) bgColor = "bg-red-100 border-red-500";
              }
              return (
                <div key={key} className="flex items-center space-x-2">
                  <RadioGroupItem value={key} id={`option-${key}`} />
                  <Label
                    htmlFor={`option-${key}`}
                    className={`flex-1 cursor-pointer p-3 rounded-lg border hover:bg-accent ${bgColor}`}
                  >
                    <span className="font-medium mr-2">{key}.</span>
                    {value}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          {showExplanation && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800">Answer: {currentMCQ.correct}</h4>
              <p className="text-blue-700 mt-2">{currentMCQ.explanation}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Progress: {Object.keys(selectedAnswers).length}/{totalQuestions} answered
          </div>
          <Button
            onClick={handleNext}
            disabled={!selectedAnswers[currentIndex]}
          >
            {showExplanation
              ? (currentIndex < totalQuestions - 1 ? "Continue" : "Finish Quiz")
              : (currentIndex < totalQuestions - 1 ? "Next Question" : "Finish Quiz")
            }
          </Button>
        </div>
      </div>
    </Card>
  );
};
