import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Book, Folder } from 'lucide-react';

const TestCard = ({ test, layoutMode, index }) => {
  const navigate = useNavigate();

  // If layoutMode is 'full', show the British Council Logo layout
  if (layoutMode === 'full') {
    return (
      <div className="bg-white rounded-lg border border-red-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
          <span className="text-xs font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded">Test {index + 1}</span>
          <span className="text-xs font-semibold text-gray-500 border border-gray-200 px-2 py-0.5 rounded">Not Started</span>
        </div>
        
        <div className="p-8 flex-1 flex items-center justify-center">
          {/* Aptis British Council Logo mockup */}
          <div className="flex items-center gap-3">
            <div className="grid grid-cols-2 gap-1 opacity-80">
              <div className="w-4 h-4 bg-[#A3CD39] rounded-sm"></div>
              <div className="w-4 h-4 bg-[#A3CD39] rounded-sm"></div>
              <div className="w-4 h-4 bg-[#A3CD39] rounded-sm"></div>
              <div className="w-4 h-4 bg-[#A3CD39] rounded-sm"></div>
            </div>
            <div className="text-[#E31837] font-bold text-3xl tracking-tight leading-none">Aptis</div>
          </div>
        </div>
        
        <div className="px-4 py-4 border-t border-gray-100 flex justify-center">
          <button 
            onClick={() => navigate(`/reading/intro/${test.id}`)}
            className="text-red-600 border border-red-600 hover:bg-red-50 text-xs font-bold py-1.5 px-6 rounded transition-colors"
          >
            Do the test
          </button>
        </div>
      </div>
    );
  }

  // Default: layoutMode === 'part' (Đề lẻ)
  return (
    <div className="bg-white rounded-lg border border-red-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded">Aptis {test.level || 'C'}</span>
        {index % 3 === 0 ? (
          <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded uppercase">Completed</span>
        ) : (
          <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded uppercase">Not Started</span>
        )}
      </div>

      <div className="flex gap-4 mb-4">
        <div className="w-20 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
          <img 
            src={test.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"} 
            alt={test.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 mb-1 truncate" title={test.title}>
            {test.title}
          </h3>
          <div className="flex items-start text-xs text-gray-500 mb-2">
            <Folder className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
            <div className="leading-tight">
              <div>Matching Headings</div>
              <div>Sentence Ordering</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-600 mb-4 bg-gray-50 p-2 rounded">
        <div className="flex items-center font-medium">
          <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
          {test.duration || 12} mins
        </div>
        <div className="flex items-center font-medium">
          <Book className="w-3.5 h-3.5 mr-1 text-gray-400" />
          Reading
        </div>
      </div>

      <div className="flex gap-2 mt-auto">
        <button 
          onClick={() => navigate(`/reading/intro/${test.id}`)}
          className="flex-1 text-red-600 border border-red-600 hover:bg-red-50 text-xs font-bold py-1.5 rounded transition-colors text-center"
        >
          Details
        </button>
        <button 
          onClick={() => navigate(`/reading/intro/${test.id}`)}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white border border-red-600 text-xs font-bold py-1.5 rounded transition-colors text-center"
        >
          Try it out
        </button>
      </div>
    </div>
  );
};

export default TestCard;
