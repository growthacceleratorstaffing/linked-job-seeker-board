import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Sparkles, X, MessageSquare, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AICopilotProps {
  isOpen: boolean;
  onClose: () => void;
  onVacancyGenerated?: (vacancy: string) => void;
  initialMessage?: string;
}

const initialGreeting: Message = {
  id: '1',
  role: 'assistant',
  content: "Hello! I'm your AI recruitment assistant. I can help you create job vacancies, improve job descriptions, develop interview strategies, and provide hiring insights. What would you like to work on today?",
  timestamp: new Date()
};

export const AICopilot: React.FC<AICopilotProps> = ({ isOpen, onClose, onVacancyGenerated, initialMessage }) => {
  const [messages, setMessages] = useState<Message[]>([initialGreeting]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for quick questions
  useEffect(() => {
    const handleQuickQuestion = (event: CustomEvent) => {
      const question = event.detail;
      if (question && question.trim()) {
        setInputMessage(question);
        // Auto-send the question
        setTimeout(() => {
          handleSendMessage(question);
        }, 500);
      }
    };

    window.addEventListener('quickQuestion', handleQuickQuestion as EventListener);
    return () => {
      window.removeEventListener('quickQuestion', handleQuickQuestion as EventListener);
    };
  }, []);

  // Handle initial message from props and sync with input
  useEffect(() => {
    if (initialMessage && initialMessage.trim() && isOpen) {
      setInputMessage(initialMessage);
    }
  }, [initialMessage, isOpen]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && inputMessage) {
      const textarea = document.querySelector('textarea[placeholder="Type your message..."]') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }
  }, [isOpen, inputMessage]);

  const handleNewChat = () => {
    setMessages([{
      ...initialGreeting,
      id: Date.now().toString(),
      timestamp: new Date()
    }]);
    setInputMessage('');
    toast({
      title: "New chat started! 🎉",
      description: "Your conversation has been reset.",
    });
  };

  const handleSendMessage = async (messageText?: string) => {
    const message = messageText || inputMessage;
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Prepare conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('myowncopilot-chat', {
        body: { 
          message: message,
          conversationHistory: conversationHistory
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If the response looks like a job vacancy, offer to use it
      if (data.response.includes('Job Title') || data.response.includes('Position:') || data.response.includes('Role:') || data.response.includes('# ')) {
        setTimeout(() => {
          const useVacancyMessage: Message = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: "💡 This looks like a job vacancy! Would you like me to transfer it to the main generator?",
            timestamp: new Date()
          };
          setMessages(prev => [...prev, useVacancyMessage]);
        }, 1000);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Connection Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleUseVacancy = (content: string) => {
    if (onVacancyGenerated) {
      onVacancyGenerated(content);
      toast({
        title: "Vacancy transferred! 🎉",
        description: "The job vacancy has been added to the main generator.",
      });
      onClose();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl h-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-600 shadow-xl flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-slate-600 bg-gradient-to-r from-pink-500/10 to-purple-600/10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-secondary-pink to-primary-blue flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-lg font-bold">AI Assistant</CardTitle>
              <div className="flex items-center space-x-1 mt-0.5">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-300">Online & Ready</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-full h-8 px-3"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              New chat
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-full w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area with ScrollArea */}
          <ScrollArea className="flex-1 p-4 max-h-full overflow-y-auto">
            <div className="space-y-4 pr-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
                    <Avatar className="w-7 h-7 mt-1 flex-shrink-0">
                      <AvatarFallback className={`${message.role === 'user' ? 'bg-gradient-to-r from-secondary-pink to-primary-blue' : 'bg-gradient-to-r from-purple-500 to-purple-600'} text-white text-xs`}>
                        {message.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} min-w-0 flex-1`}>
                      <div
                        className={`rounded-lg px-3 py-2 text-sm break-words ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-secondary-pink to-primary-blue text-white rounded-br-sm'
                            : 'bg-gradient-to-r from-slate-700 to-slate-800 text-slate-100 rounded-bl-sm border border-slate-600'
                        }`}
                      >
                        <div className="whitespace-pre-wrap leading-relaxed break-words overflow-wrap-anywhere">
                          {message.content}
                        </div>
                        
                        {message.role === 'assistant' && (message.content.includes('Job Title') || message.content.includes('Position:') || message.content.includes('# ')) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUseVacancy(message.content)}
                            className="mt-2 text-xs border-pink-400 text-pink-400 hover:bg-pink-400 hover:text-white h-6"
                          >
                            <Sparkles className="w-2 h-2 mr-1" />
                            Use This
                          </Button>
                        )}
                      </div>
                      
                      <span className="text-xs text-slate-400 mt-1 px-1">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2">
                    <Avatar className="w-7 h-7 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs">
                        <Bot className="w-3 h-3" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-lg rounded-bl-sm px-3 py-2 border border-slate-600">
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-slate-600 p-3 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Textarea
                  placeholder="Type your message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-secondary-pink focus:ring-secondary-pink resize-none min-h-[40px] pr-12 rounded-lg text-sm"
                  rows={1}
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isTyping}
                  size="sm"
                  className="absolute right-2 bottom-2 bg-gradient-to-r from-secondary-pink to-primary-blue hover:from-secondary-pink/80 hover:to-primary-blue/80 text-white p-1 h-6 w-6 rounded"
                >
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge
                variant="outline"
                className="cursor-pointer border-slate-500 text-slate-300 hover:bg-slate-700 hover:border-secondary-pink transition-all duration-200 text-xs py-0.5 px-2"
                onClick={() => setInputMessage("Create a job vacancy")}
              >
                Create Job
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer border-slate-500 text-slate-300 hover:bg-slate-700 hover:border-secondary-pink transition-all duration-200 text-xs py-0.5 px-2"
                onClick={() => setInputMessage("Interview questions")}
              >
                Interview Tips
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer border-slate-500 text-slate-300 hover:bg-slate-700 hover:border-secondary-pink transition-all duration-200 text-xs py-0.5 px-2"
                onClick={() => setInputMessage("Hiring best practices")}
              >
                Hiring Tips
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
