import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AICopilot } from './AICopilot';

interface CopilotTriggerProps {
  onVacancyGenerated?: (vacancy: string) => void;
}

// The assistant stays hidden until the user clicks the button at the bottom right
export const CopilotTrigger: React.FC<CopilotTriggerProps> = ({ onVacancyGenerated }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-40">
          <Button
            onClick={() => setIsOpen(true)}
            className="h-11 rounded-full px-4 bg-gradient-to-r from-secondary-pink to-primary-blue hover:from-secondary-pink/80 hover:to-primary-blue/80 text-white shadow-lg transition-transform hover:scale-105"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Assistant
          </Button>
        </div>
      )}

      <AICopilot
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onVacancyGenerated={onVacancyGenerated}
        initialMessage=""
      />
    </>
  );
};
