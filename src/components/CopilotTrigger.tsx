
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles } from "lucide-react";
import { AICopilot } from './AICopilot';

interface CopilotTriggerProps {
  onVacancyGenerated?: (vacancy: string) => void;
}

export const CopilotTrigger: React.FC<CopilotTriggerProps> = ({ onVacancyGenerated }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-2xl transition-all duration-300 hover:scale-110 group"
        >
          <div className="relative">
            <MessageSquare className="w-7 h-7 transition-transform group-hover:scale-110" />
            <Sparkles className="w-4 h-4 absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
          </div>
        </Button>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-3 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          AI Assistant
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      </div>

      {/* AI Copilot Modal */}
      <AICopilot
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onVacancyGenerated={onVacancyGenerated}
      />
    </>
  );
};
