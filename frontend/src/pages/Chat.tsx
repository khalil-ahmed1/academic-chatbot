import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/ChatInterface";
import { DocumentUpload } from "@/components/DocumentUpload";
import { AuthGuard } from "@/components/AuthGuard";
import { User, LogOut, Plus, MessageSquare, Trash2, Gamepad2, Loader2, BookOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  type?: "academic" | "rag";
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

const Chat = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const [generatingMcqs, setGeneratingMcqs] = useState(false);

  useEffect(() => {
    if (conversations.length === 0) {
      createNewConversation();
    }
  }, []);

  const createNewConversation = () => {
    const id = Date.now().toString();
    const newConv: Conversation = {
      id,
      title: "New Chat",
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversationId(id);
    toast.success("New conversation created");
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((conv) => conv.id !== id));
    if (currentConversationId === id) {
      const remaining = conversations.filter((conv) => conv.id !== id);
      if (remaining.length > 0) {
        setCurrentConversationId(remaining[0].id);
      } else {
        createNewConversation();
      }
    }
    toast.success("Conversation deleted");
  };

  const handleMessagesChange = (messages: Message[]) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === currentConversationId
          ? {
              ...conv,
              messages,
              title: messages.length > 0 && conv.title === "New Chat"
                ? messages[0].content.slice(0, 30) + (messages[0].content.length > 30 ? "..." : "")
                : conv.title,
            }
          : conv
      )
    );
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gradient-subtle">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r flex flex-col">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Academic AI
            </h1>
          </div>

          <ScrollArea className="flex-1 p-2">
            <Button
              onClick={createNewConversation}
              className="w-full mb-2"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>

            <div className="space-y-1">
              {conversations.map((conv) => (
                <div key={conv.id} className="flex items-center gap-1">
                  <Button
                    variant={currentConversationId === conv.id ? "secondary" : "ghost"}
                    className="flex-1 justify-start"
                    onClick={() => setCurrentConversationId(conv.id)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    <span className="truncate">{conv.title}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteConversation(conv.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/documents")}
            >
              Documents
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={generatingMcqs}
              onClick={async () => {
                setGeneratingMcqs(true);
                try {
                  const response = await fetch(`${import.meta.env.VITE_RAG_BACKEND_URL}/generate_mcqs`, {
                    method: "POST",
                  });
                  const result = await response.json();
                  if (result.error) {
                    toast.error(result.error);
                    return;
                  }
                  // Parse JSON from response
                  const parsedMcqs = JSON.parse(result.mcqs);
                  navigate('/quiz', { state: { mcqs: parsedMcqs } });
                } catch (error) {
                  console.error("MCQ generation error:", error);
                  toast.error("Failed to generate MCQs. Please try again.");
                } finally {
                  setGeneratingMcqs(false);
                }
              }}
            >
              {generatingMcqs ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Gamepad2 className="w-4 h-4 mr-2" />
              )}
              {generatingMcqs ? "Generating MCQs..." : "Gamify Learning"}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/topic-quiz")}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Topic Quiz
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <User className="w-4 h-4 mr-2" />
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {currentConversationId && (
            <ChatInterface
              messages={conversations.find((conv) => conv.id === currentConversationId)?.messages || []}
              onMessagesChange={handleMessagesChange}
            />
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default Chat;
