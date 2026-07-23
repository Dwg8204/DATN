import React, { useContext } from 'react';
import { Clock, LogOut, CheckCircle } from 'lucide-react';
import { ReadingTestContext } from '../../context/ReadingTestContext';
import { useTimer } from '../../hooks/useTimer';

const TestHeader = ({ onExit, onSubmit }) => {
  const { testData } = useContext(ReadingTestContext);
  const { formattedTime, isWarning } = useTimer();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Test Info */}
        <div className="flex items-center">
          <div className="hidden md:flex flex-col mr-6 border-r border-gray-200 pr-6">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">APTIS Reading</span>
            <span className="text-sm font-extrabold text-gray-900 truncate max-w-[200px]">
              {testData?.title || 'Loading Test...'}
            </span>
          </div>
          <button 
            onClick={onExit}
            className="flex items-center text-gray-500 hover:text-red-600 transition-colors font-medium text-sm bg-gray-50 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-200"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Exit Test</span>
          </button>
        </div>

        {/* Center: Timer */}
        <div className={`flex items-center justify-center px-6 py-1.5 rounded-full border-2 font-bold text-lg tabular-nums tracking-wide ${
          isWarning 
            ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' 
            : 'bg-gray-50 border-gray-200 text-gray-800'
        }`}>
          <Clock className={`w-5 h-5 mr-2 ${isWarning ? 'text-red-500' : 'text-gray-400'}`} />
          {formattedTime}
        </div>

        {/* Right: Submit Button */}
        <div>
          <button 
            onClick={onSubmit}
            className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-lg shadow-sm transition-colors transform hover:-translate-y-0.5"
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Submit</span>
          </button>
        </div>

      </div>
    </header>
  );
};

export default TestHeader;
