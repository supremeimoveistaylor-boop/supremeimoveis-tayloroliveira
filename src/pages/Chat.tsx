import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, ArrowLeft, Phone, Video, MoreVertical } from "lucide-react";
import { Link } from "react-router-dom";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'taylor';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Olá! Sou Taylor Oliveira, especialista em imóveis. Como posso te ajudar hoje?',
      sender: 'taylor',
      timestamp: new Date(Date.now() - 5000),
      status: 'read'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');

    // Simulate Taylor's response
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Obrigado pela sua mensagem! Vou te responder em breve com todas as informações sobre os imóveis disponíveis.',
        sender: 'taylor',
        timestamp: new Date(),
        status: 'sent'
      };
      setMessages(prev => [...prev, response]);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <span className="text-sm font-medium">T</span>
              </div>
              <div>
                <h2 className="font-semibold">Taylor Oliveira</h2>
                <p className="text-xs opacity-80">Especialista em Imóveis</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
              <Video className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-muted/30">
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card className={`max-w-xs lg:max-w-md p-3 ${
                message.sender === 'user' 
                  ? 'bg-primary text-primary-foreground ml-12' 
                  : 'bg-card mr-12'
              }`}>
                <p className="text-sm">{message.text}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${
                    message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {formatTime(message.timestamp)}
                  </span>
                  {message.sender === 'user' && message.status && (
                    <span className={`text-xs ${
                      message.status === 'read' ? 'text-green-400' :
                      message.status === 'delivered' ? 'text-primary-foreground/70' :
                      'text-primary-foreground/50'
                    }`}>
                      {message.status === 'read' ? '✓✓' : 
                       message.status === 'delivered' ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </Card>
            </div>
          ))}
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
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* WhatsApp Integration Notice */}
      <div className="bg-green-50 border-t border-green-200 p-2">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-green-700 text-center">
            💬 Esta conversa será sincronizada com WhatsApp
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chat;