import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, ArrowLeft, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useChatRealtime, ChatMessage } from "@/hooks/useChatRealtime";
import { Skeleton } from "@/components/ui/skeleton";

const Chat = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { messages, isLoading, isConnected, error, sendMessage, reconnect } = useChatRealtime();
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { returnTo: "/chat" } });
    }
  }, [user, authLoading, navigate]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const messageToSend = inputMessage;
    setInputMessage("");
    setIsSending(true);

    const success = await sendMessage(messageToSend);
    
    if (!success) {
      // Restore message if failed
      setInputMessage(messageToSend);
    }

    setIsSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; messages: ChatMessage[] }[]>(
    (groups, message) => {
      const date = formatDate(message.created_at);
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && lastGroup.date === date) {
        lastGroup.messages.push(message);
      } else {
        groups.push({ date, messages: [message] });
      }

      return groups;
    },
    []
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h2 className="font-semibold">Chat da Comunidade</h2>
              <div className="flex items-center gap-2 text-xs opacity-80">
                {isConnected ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span>Conectado</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span>Desconectado</span>
                  </>
                )}
                <span>•</span>
                <span>{messages.length} mensagens</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/20"
            onClick={reconnect}
            title="Reconectar"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-destructive/10 border-b border-destructive/20 p-2">
          <p className="text-xs text-destructive text-center">{error}</p>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-muted/30">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                  <Skeleton className="h-16 w-64 rounded-lg" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Nenhuma mensagem ainda. Seja o primeiro a enviar!
              </p>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.date} className="space-y-4">
                {/* Date separator */}
                <div className="flex items-center justify-center">
                  <span className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                    {group.date}
                  </span>
                </div>

                {/* Messages */}
                {group.messages.map((message) => {
                  const isOwnMessage = message.user_id === user.id;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                    >
                      <Card
                        className={`max-w-xs lg:max-w-md p-3 ${
                          isOwnMessage
                            ? "bg-primary text-primary-foreground ml-12"
                            : "bg-card mr-12"
                        }`}
                      >
                        {!isOwnMessage && (
                          <p
                            className={`text-xs font-medium mb-1 ${
                              isOwnMessage ? "text-primary-foreground/80" : "text-primary"
                            }`}
                          >
                            {message.user_name}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.message}
                        </p>
                        <span
                          className={`text-xs mt-1 block ${
                            isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}
                        >
                          {formatTime(message.created_at)}
                        </span>
                      </Card>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-background border-t p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="flex-1"
            disabled={isSending || !isConnected}
            maxLength={1000}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isSending || !isConnected}
            size="icon"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Logado como <span className="font-medium">{user.email}</span>
        </p>
      </div>
    </div>
  );
};

export default Chat;
