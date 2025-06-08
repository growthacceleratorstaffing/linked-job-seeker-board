
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Sparkles, Send } from "lucide-react";
import { AICopilot } from './AICopilot';

interface CopilotTriggerProps {
  onVacancyGenerated?: (vacancy: string) => void;
}

export const CopilotTrigger: React.FC<CopilotTriggerProps> = ({ onVacancyGenerated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [quickQuestion, setQuickQuestion] = useState('');

  const handleQuickQuestion = () => {
    if (quickQuestion.trim()) {
      setIsOpen(true);
      // Pass the question to the AI Copilot
      setTimeout(() => {
        const event = new CustomEvent('quickQuestion', { detail: quickQuestion });
        window.dispatchEvent(event);
        setQuickQuestion('');
      }, 100);
    } else {
      setIsOpen(true);
    }
  };

  return (
    <>
      {/* Proactive Input Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-lg px-4">
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-full shadow-lg p-2">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 ml-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-secondary-pink to-primary-blue flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm text-slate-600 font-medium">AI Assistant</span>
            </div>
            <Input
              placeholder="Ask me anything about jobs, hiring, or recruitment..."
              value={quickQuestion}
              onChange={(e) => setQuickQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleQuickQuestion();
                }
              }}
              className="flex-1 border-0 bg-transparent text-sm placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              onClick={handleQuickQuestion}
              size="sm"
              className="w-8 h-8 rounded-full bg-gradient-to-r from-secondary-pink to-primary-blue hover:from-secondary-pink/80 hover:to-primary-blue/80 text-white p-0"
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Smaller Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 rounded-full bg-gradient-to-r from-secondary-pink to-primary-blue hover:from-secondary-pink/80 hover:to-primary-blue/80 text-white shadow-lg transition-all duration-300 hover:scale-110 group"
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-primary-blue text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          Open Chat
          <div className="absolute top-full right-3 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-primary-blue"></div>
        </div>
      </div>

      {/* AI Copilot Modal */}
      <AICopilot
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onVacancyGenerated={onVacancyGenerated}
        initialMessage={quickQuestion}
      />
    </>
  );
};
