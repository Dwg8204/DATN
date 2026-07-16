import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';

const ReadingHeroSection = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 md:p-12 mb-8 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-red-50 opacity-50 blur-3xl"></div>
      
      <div className="relative z-10 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
          READING <span className="text-red-600">OVERVIEW</span>
        </h1>
        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
          APTIS Reading consists of four tasks which become increasingly difficult as the test progresses. It takes 35 minutes to complete and is designed to assess your ability to read and understand texts in English.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3">What you need to know:</h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              <span><strong>Part 1:</strong> Sentence comprehension (Gap fill)</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              <span><strong>Part 2:</strong> Text cohesion (Sentence ordering)</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              <span><strong>Part 3:</strong> Opinion matching (Short text matching)</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              <span><strong>Part 4:</strong> Long text comprehension (Matching headings)</span>
            </li>
          </ul>
        </div>
        
        <button 
          onClick={() => navigate('/reading/choose')}
          className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all duration-200 bg-red-600 border border-transparent rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          <Play className="w-5 h-5 mr-2" />
          START PRACTICING
        </button>
      </div>
    </div>
  );
};

export default ReadingHeroSection;
