import React, { useState } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';

const AIHintButton = ({ questionId, contextText }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState('');

  const handleGetHint = async () => {
    if (hint) return; // Đã có hint thì không gọi lại
    setLoading(true);
    
    // Giả lập gọi API Gemini
    // TODO: Tích hợp @google/generative-ai khi có API KEY
    setTimeout(() => {
      setHint("Đây là gợi ý từ AI: Hãy chú ý đến từ khóa đằng trước và đằng sau ô trống. Đại từ phản thân hoặc mạo từ có thể giúp bạn xác định loại từ cần điền.");
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="relative inline-block ml-3">
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && !hint) handleGetHint();
        }}
        className={`flex items-center justify-center p-1.5 rounded-full transition-colors ${
          isOpen ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
        }`}
        title="Get AI Hint"
      >
        <Sparkles className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-indigo-100 p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-50">
            <h4 className="text-sm font-bold text-indigo-800 flex items-center">
              <Sparkles className="w-4 h-4 mr-1.5" />
              AI Assistant
            </h4>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="text-sm text-gray-700 min-h-[60px] flex items-center justify-center">
            {loading ? (
              <div className="flex flex-col items-center text-indigo-400">
                <Loader2 className="w-5 h-5 animate-spin mb-1" />
                <span className="text-xs">Analyzing context...</span>
              </div>
            ) : (
              <p className="leading-relaxed">{hint}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIHintButton;
