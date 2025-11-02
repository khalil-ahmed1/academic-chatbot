import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AuthGuard } from "@/components/AuthGuard";
import { toast } from "sonner";
import { BookOpen, Send, CheckCircle, XCircle, Loader2, MessageSquare, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
export const TopicQuiz = () => {
  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"topic" | "answer" | "evaluation">("topic");
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);

  const generateQuestion = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_RAG_BACKEND_URL}/generate_question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setQuestion(result.question);
      setStep("answer");
      toast.success("Question generated!");
    } catch (error) {
      console.error("Generate question error:", error);
      toast.error("Failed to generate question");
    } finally {
      setLoading(false);
    }
  };

  const evaluateAnswer = async () => {
    if (!answer.trim()) {
      toast.error("Please provide an answer");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_RAG_BACKEND_URL}/evaluate_answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          answer,
          topic,
          conversation_history: conversationHistory
        }),
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setEvaluation(result.evaluation);
      setStep("evaluation");

      // Add to conversation history
      setConversationHistory(prev => [...prev, {
        question,
        answer,
        feedback: result.evaluation
      }]);

      toast.success("Answer evaluated!");
    } catch (error) {
      console.error("Evaluate answer error:", error);
      toast.error("Failed to evaluate answer");
    } finally {
      setLoading(false);
    }
  };

  const resetQuiz = () => {
    setTopic("");
    setQuestion("");
    setAnswer("");
    setEvaluation("");
    setStep("topic");
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Viva-Style Topic Quiz
            </h1>
          </div>

          <div className="space-y-6">
            {/* Topic Input */}
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="topic" className="text-lg font-semibold">
                    Enter a Topic
                  </Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Enter any academic topic you want to be quizzed on
                  </p>
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Binary Search Algorithm, Quantum Physics, Database Normalization..."
                    disabled={step !== "topic"}
                  />
                </div>
                {step === "topic" && (
                  <Button
                    onClick={generateQuestion}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Question...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Generate Question
                      </>
                    )}
                  </Button>
                )}
              </div>
            </Card>

            {/* Question Display */}
            {question && (
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">Generated Question:</h3>
                      <p className="text-foreground bg-muted p-4 rounded-lg">{question}</p>
                    </div>
                  </div>

                  {step === "answer" && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="answer" className="text-lg font-semibold">
                          Your Answer
                        </Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          Provide a detailed answer to the question above
                        </p>
                        <Textarea
                          id="answer"
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          placeholder="Write your answer here..."
                          rows={6}
                        />
                      </div>
                      <Button
                        onClick={evaluateAnswer}
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Evaluating Answer...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Submit Answer
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Evaluation Display */}
            {evaluation && (
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-blue-500 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">Evaluation:</h3>
                      <div className="bg-muted p-4 rounded-lg text-foreground">
                        <ReactMarkdown>{evaluation}</ReactMarkdown>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const response = await fetch(`${import.meta.env.VITE_RAG_BACKEND_URL}/continue_viva_chat`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              topic,
                              evaluation,
                              conversation_history: conversationHistory
                            }),
                          });

                          const result = await response.json();
                          if (result.error) {
                            toast.error(result.error);
                            return;
                          }

                          setQuestion(result.question);
                          setStep("answer");
                          setAnswer("");
                          setEvaluation("");
                          toast.success("Next question generated!");
                        } catch (error) {
                          console.error("Continue viva chat error:", error);
                          toast.error("Failed to generate next question");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      variant="outline"
                      className="flex-1"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Continue Deep Chat
                        </>
                      )}
                    </Button>
                    <Button onClick={resetQuiz} variant="outline" className="flex-1">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Try Another Topic
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};
