
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, Send, Sparkles, X, MessageSquare } from "lucide-react";
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
}

export const AICopilot: React.FC<AICopilotProps> = ({ isOpen, onClose, onVacancyGenerated }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI recruitment assistant powered by MyOwnCopilot. I specialize in helping you create outstanding job vacancies, improve job descriptions, develop interview strategies, and provide expert hiring insights. What would you like to work on today?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
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
          message: inputMessage,
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
            content: "💡 This looks like a job vacancy! Would you like me to transfer it to the main generator for further editing and formatting?",
            timestamp: new Date()
          };
          setMessages(prev => [...prev, useVacancyMessage]);
        }, 1000);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Connection Error",
        description: "Failed to get AI response. Please check your connection and try again.",
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl h-[700px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-600 shadow-2xl flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-slate-600 bg-gradient-to-r from-pink-500/10 to-purple-600/10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-xl font-bold">AI Recruitment Assistant</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-300">Powered by MyOwnCopilot • Online & Ready</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-full w-10 h-10 p-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
                  <Avatar className="w-9 h-9 mt-1 shadow-md">
                    <AvatarFallback className={`${message.role === 'user' ? 'bg-gradient-to-r from-pink-500 to-pink-600' : 'bg-gradient-to-r from-purple-500 to-purple-600'} text-white text-xs`}>
                      {message.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-5 py-4 max-w-full shadow-lg ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-br-md'
                          : 'bg-gradient-to-r from-slate-700 to-slate-800 text-slate-100 rounded-bl-md border border-slate-600'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                      
                      {message.role === 'assistant' && (message.content.includes('Job Title') || message.content.includes('Position:') || message.content.includes('# ')) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUseVacancy(message.content)}
                          className="mt-4 text-xs border-pink-400 text-pink-400 hover:bg-pink-400 hover:text-white transition-all duration-200"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          Use This Vacancy
                        </Button>
                      )}
                    </div>
                    
                    <span className="text-xs text-slate-400 mt-2 px-1">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <Avatar className="w-9 h-9 mt-1 shadow-md">
                    <AvatarFallback className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs">
                      <Bot className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl rounded-bl-md px-5 py-4 border border-slate-600 shadow-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-600 p-6 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <Textarea
                  placeholder="Ask me about creating job vacancies, interview strategies, hiring best practices..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-pink-400 focus:ring-pink-400 resize-none min-h-[70px] pr-14 rounded-xl"
                  rows={2}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  size="sm"
                  className="absolute right-3 bottom-3 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white p-2 h-10 w-10 rounded-lg shadow-lg transition-all duration-200"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Enhanced Quick Actions */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge
                variant="outline"
                className="cursor-pointer border-slate-500 text-slate-300 hover:bg-slate-700 hover:border-pink-400 transition-all duration-200"
                onClick={() => setInputMessage("Create a comprehensive job vacancy for a Senior Frontend Developer")}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Create Job Vacancy
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer border-slate-500 text-slate-300 hover:bg-slate-700 hover:border-pink-400 transition-all duration-200"
                onClick={() => setInputMessage("What are the best interview questions for a software engineering role?")}
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                Interview Questions
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer border-slate-500 text-slate-300 hover:bg-slate-700 hover:border-pink-400 transition-all duration-200"
                onClick={() => setInputMessage("How can I improve this job description to attract better candidates?")}
              >
                <Bot className="w-3 h-3 mr-1" />
                Improve Job Description
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer border-slate-500 text-slate-300 hover:bg-slate-700 hover:border-pink-400 transition-all duration-200"
                onClick={() => setInputMessage("What are the latest hiring trends and best practices?")}
              >
                <User className="w-3 h-3 mr-1" />
                Hiring Insights
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
