import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Loader2, User, Bot, Trash2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import botAvatar from "@/assets/bot-avatar.png";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  type?: "academic" | "rag";
}

interface ChatInterfaceProps {
  messages: Message[];
  onMessagesChange: (messages: Message[]) => void;
}

export const ChatInterface = ({ messages, onMessagesChange }: ChatInterfaceProps) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [examType, setExamType] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const clearChatHistory = () => {
    onMessagesChange([]);
    toast.success("Chat history cleared");
  };

  const summarizeChat = async () => {
    if (messages.length === 0) {
      toast.error("No chat history to summarize");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_RAG_BACKEND_URL}/summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          history: messages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to summarize");
      }

      const result = await response.json();
      const summaryMessage: Message = {
        role: "assistant",
        content: `**Chat Summary:**\n\n${result.summary}`,
        type: "rag",
      };

      onMessagesChange([...messages, summaryMessage]);
    } catch (error) {
      console.error("Summarize error:", error);
      toast.error("Failed to summarize chat");
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    onMessagesChange(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_RAG_BACKEND_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: input,
          history: messages.slice(-5), // Send only last 5 messages to avoid token limit
          exam_type: examType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const result = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: result.answer,
        type: result.type,
      };

      onMessagesChange([...newMessages, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      onMessagesChange(messages); // Revert to original
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b bg-card">
        <h2 className="text-lg font-semibold">Chat</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={summarizeChat}
            disabled={messages.length === 0 || isLoading}
          >
            <FileText className="w-4 h-4 mr-2" />
            Summarize
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearChatHistory}
            disabled={messages.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Chat
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="space-y-4 max-w-4xl mx-auto p-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <img src={botAvatar} alt="AI Assistant" className="w-24 h-24 mx-auto mb-4 opacity-80" />
              <h3 className="text-xl font-semibold mb-2">Welcome to Academic Guidance AI</h3>
              <p className="text-muted-foreground">
                Ask me anything about your academic path, career choices, or upload documents for personalized advice.
              </p>
            </div>
          )}

          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}

              <Card
                className={`p-4 max-w-[80%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card"
                }`}
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
                {/* {message.type && (
                  <Badge className="mt-2" variant={message.type === "academic" ? "secondary" : "default"}>
                    {message.type.toUpperCase()}
                  </Badge>
                )} */}
              </Card>

              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <Card className="p-4">
                <Loader2 className="w-5 h-5 animate-spin" />
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4 bg-card">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium">Exam Type:</label>
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="theory">Theory Exam</SelectItem>
                <SelectItem value="viva">Viva Exam</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Ask me anything about your academic journey..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
