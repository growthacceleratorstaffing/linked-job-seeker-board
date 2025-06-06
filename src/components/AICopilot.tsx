
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
      content: "Hi! I'm your AI recruitment assistant. I can help you create job vacancies, improve job descriptions, suggest interview questions, or provide hiring insights. What would you like to work on today?",
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
      // Use the existing Azure OpenAI integration
      const { data, error } = await supabase.functions.invoke('generate-vacancy', {
        body: { 
          prompt: `As an expert HR assistant, respond to this user query about recruitment and job creation: "${inputMessage}". If they're asking for a job vacancy, create one. If they have questions about hiring, interviewing, or job descriptions, provide helpful advice. Keep responses concise but informative.`
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.generatedVacancy,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If the response looks like a job vacancy, offer to use it
      if (data.generatedVacancy.includes('Job Title') || data.generatedVacancy.includes('Position:') || data.generatedVacancy.includes('Role:')) {
        setTimeout(() => {
          const useVacancyMessage: Message = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: "Would you like me to transfer this job vacancy to the main generator for further editing?",
            timestamp: new Date()
          };
          setMessages(prev => [...prev, useVacancyMessage]);
        }, 1000);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
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
        title: "Vacancy transferred!",
        description: "The job vacancy has been added to the main generator.",
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl h-[600px] bg-slate-900 border-slate-700 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-lg">AI Recruitment Assistant</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-400">Online & Ready to Help</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
                  <Avatar className="w-8 h-8 mt-1">
                    <AvatarFallback className={`${message.role === 'user' ? 'bg-pink-600' : 'bg-purple-600'} text-white text-xs`}>
                      {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-full ${
                        message.role === 'user'
                          ? 'bg-pink-600 text-white rounded-br-md'
                          : 'bg-slate-800 text-slate-100 rounded-bl-md'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                      
                      {message.role === 'assistant' && (message.content.includes('Job Title') || message.content.includes('Position:')) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUseVacancy(message.content)}
                          className="mt-3 text-xs border-pink-400 text-pink-400 hover:bg-pink-400 hover:text-white"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          Use This Vacancy
                        </Button>
                      )}
                    </div>
                    
                    <span className="text-xs text-slate-500 mt-1 px-1">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <Avatar className="w-8 h-8 mt-1">
                    <AvatarFallback className="bg-purple-600 text-white text-xs">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-700 p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <Textarea
                  placeholder="Ask me about job creation, hiring best practices, interview questions..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-pink-400 resize-none min-h-[60px] pr-12"
                  rows={2}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  size="sm"
                  className="absolute right-2 bottom-2 bg-pink-600 hover:bg-pink-700 text-white p-2 h-8 w-8"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge
                variant="outline"
                className="cursor-pointer border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={() => setInputMessage("Create a job vacancy for a Senior Frontend Developer")}
              >
                Create Job Vacancy
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={() => setInputMessage("What interview questions should I ask for this role?")}
              >
                Interview Questions
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={() => setInputMessage("How can I improve this job description?")}
              >
                Improve JD
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
