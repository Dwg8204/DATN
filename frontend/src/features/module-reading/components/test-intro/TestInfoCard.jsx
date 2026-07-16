import React from 'react';
import { Clock, FileText, Target, AlertCircle } from 'lucide-react';

const TestInfoCard = ({ test }) => {
  if (!test) return null;

  return (
    <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-sm">
      <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between mb-8 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">{test.title}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 bg-red-50 text-red-700 font-bold text-sm rounded-md uppercase tracking-wide">
              {test.type}
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 font-bold text-sm rounded-md">
              Level {test.level}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center text-gray-500 mb-1">
              <Clock className="w-5 h-5 mr-1.5" />
            </div>
            <div className="font-bold text-gray-900 text-lg">{test.duration} Min</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Time limit</div>
          </div>
          
          <div className="w-px h-12 bg-gray-200 hidden md:block"></div>
          
          <div className="text-center">
            <div className="flex items-center justify-center text-gray-500 mb-1">
              <FileText className="w-5 h-5 mr-1.5" />
            </div>
            <div className="font-bold text-gray-900 text-lg">{test.totalQuestions}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Questions</div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center mb-4">
          <Target className="w-5 h-5 text-red-500 mr-2" />
          Test Structure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="font-bold text-gray-800 mb-1">Part 1: Sentence Comprehension</div>
            <p className="text-sm text-gray-600">Choose a word (A, B, or C) from a list to complete each sentence.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="font-bold text-gray-800 mb-1">Part 2: Text Cohesion</div>
            <p className="text-sm text-gray-600">Sort sentences into the correct order to form a coherent story.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="font-bold text-gray-800 mb-1">Part 3: Opinion Matching</div>
            <p className="text-sm text-gray-600">Match people's opinions to short statements.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="font-bold text-gray-800 mb-1">Part 4: Matching Headings</div>
            <p className="text-sm text-gray-600">Match headings to paragraphs in a long text.</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-blue-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-bold text-blue-800">Important Instructions</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>You can navigate between parts freely during the test.</li>
                <li>If you exit the test before submitting, your progress will <strong>NOT</strong> be saved.</li>
                <li>Make sure you have a stable internet connection before starting.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestInfoCard;
