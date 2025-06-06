
import { VacancyGenerator } from "@/components/VacancyGenerator";

const Index = () => {
  return (
    <div className="min-h-screen bg-secondary-blue text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <div className="mb-6">
            <img 
              src="/lovable-uploads/b75d59b1-dda0-4ae9-aa70-24966bdd42d5.png" 
              alt="Growth Accelerator Logo" 
              className="mx-auto h-16 w-16 object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-secondary-pink bg-clip-text text-transparent">
            Growth Accelerator Jobs
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Create compelling job descriptions with the power of AI. Simply enter your requirements and let our generator craft the perfect vacancy text.
          </p>
        </header>
        
        <VacancyGenerator />
      </div>
    </div>
  );
};

export default Index;
