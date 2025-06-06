
import { VacancyGenerator } from "@/components/VacancyGenerator";

const Index = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-pink-300 bg-clip-text text-transparent">
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
