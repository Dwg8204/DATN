import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, RefreshCw, BrainCircuit, LayoutGrid, List, BookOpen } from 'lucide-react';
import { FlashcardSkeleton } from '../../../components/common/SkeletonLoaders';

const FlashcardPage = () => {
  const location = useLocation();
  const isDictation = location.pathname.startsWith('/dictation');
  
  const [vocabData, setVocabData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(isDictation ? 'list' : 'flashcard'); // 'flashcard' or 'list'
  const [cardMode, setCardMode] = useState('flashcard'); // 'flashcard' or 'nghia'
  const [filter, setFilter] = useState('all'); // 'all', 1, 2, 3
  
  // State for flashcard engine
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const fetchVocab = async () => {
      try {
        const dataModule = await import('../services/mockData/vocab.json');
        const data = dataModule.default || dataModule;
        
        setTimeout(() => {
          setVocabData(data.words || []);
          setLoading(false);
        }, 600); // 600ms delay to show skeleton
      } catch (error) {
        console.error("Failed to load vocabulary data", error);
        setLoading(false);
      }
    };
    fetchVocab();
  }, []);

  // Filtered list
  const filteredVocab = vocabData.filter(word => {
    if (filter === 'all') return true;
    return word.memoryLevel === parseInt(filter);
  });

  // Handle card flip
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Handle rating a card
  const handleRate = (level) => {
    // Reset flip state and move to next card
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex < filteredVocab.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setCurrentIndex(0);
      }
    }, 150);
  };

  const getMemoryLevelLabel = (level) => {
    switch(level) {
      case 1: return { text: 'Learning', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
      case 2: return { text: 'Need Review', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 3: return { text: 'Mastered', color: 'bg-green-100 text-green-700 border-green-200' };
      default: return { text: 'Unknown', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pb-12">
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10 h-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
            <a href="/reading" className="p-2 -ml-2 mr-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span className="font-semibold text-gray-900 text-lg">Flashcard</span>
              <span className="text-gray-400 text-lg">/</span>
              <span className="font-semibold text-gray-900 text-lg">Nghĩa</span>
            </div>
          </div>
        </header>
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center justify-center">
          <FlashcardSkeleton />
        </main>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#d9d9d9] flex flex-col pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Breadcrumb title */}
          <div className="flex items-center">
            <button
              onClick={() => { setViewMode('list'); }}
              className={`text-xl font-bold transition-colors mr-2 ${
                viewMode === 'list' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              Dictation
            </button>
            <span className="text-gray-300 text-xl font-light mx-2">|</span>
            <button
              onClick={() => { setCardMode('flashcard'); setViewMode('flashcard'); setIsFlipped(false); setCurrentIndex(0); }}
              className={`text-xl font-bold transition-colors ${
                viewMode === 'flashcard' && cardMode === 'flashcard' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              Flashcard
            </button>
            <span className="text-gray-300 text-xl font-light mx-2">/</span>
            <button
              onClick={() => { setCardMode('nghia'); setViewMode('flashcard'); setIsFlipped(false); setCurrentIndex(0); }}
              className={`text-xl font-bold transition-colors ${
                viewMode === 'flashcard' && cardMode === 'nghia' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              Nghĩa
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm font-medium">
            <span className="text-gray-600">👤 User Profile</span>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        
        {viewMode === 'flashcard' ? (
          
          /* FLASHCARD ENGINE */
          <div className="flex-1 flex flex-col items-center justify-center w-full bg-white p-8 rounded-lg shadow-sm">
            
            {/* Flashcard Container */}
            <div 
              className="relative w-full max-w-2xl h-[400px] cursor-pointer group rounded-xl"
              onClick={handleFlip}
              style={{ backgroundColor: '#e6c8b3' }} // Match the pale tan color from mockup
            >
              <div className="w-full h-full flex flex-col items-center justify-center p-10 text-center">
                {cardMode === 'flashcard' ? (
                  isFlipped ? (
                    // Back (Meaning)
                    <h2 className="text-3xl font-medium text-gray-900 mb-2">
                      {filteredVocab[currentIndex]?.meaning}
                    </h2>
                  ) : (
                    // Front (English word)
                    <>
                      <h2 className="text-4xl font-semibold text-gray-900 mb-2">
                        {filteredVocab[currentIndex]?.word} <span className="font-normal">/{filteredVocab[currentIndex]?.pronunciation}/</span>
                      </h2>
                      <p className="text-gray-700 text-xl font-medium">
                        ({filteredVocab[currentIndex]?.type})
                      </p>
                    </>
                  )
                ) : (
                  isFlipped ? (
                    // Back (English word)
                    <>
                      <h2 className="text-4xl font-semibold text-gray-900 mb-2">
                        {filteredVocab[currentIndex]?.word} <span className="font-normal">/{filteredVocab[currentIndex]?.pronunciation}/</span>
                      </h2>
                      <p className="text-gray-700 text-xl font-medium">
                        ({filteredVocab[currentIndex]?.type})
                      </p>
                    </>
                  ) : (
                    // Front (Meaning)
                    <h2 className="text-3xl font-medium text-gray-900 mb-2">
                      {filteredVocab[currentIndex]?.meaning}
                    </h2>
                  )
                )}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-center gap-8 mt-8 text-gray-500">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-blue-500">Auto play</span>
                <div className="w-8 h-4 bg-red-500 rounded-full flex items-center p-0.5 cursor-pointer">
                  <div className="w-3 h-3 bg-white rounded-full translate-x-4"></div>
                </div>
              </div>
              <button className="text-red-500 hover:text-red-600"><RefreshCw className="w-5 h-5" /></button>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev > 0 ? prev - 1 : filteredVocab.length - 1); setIsFlipped(false); }}
                  className="font-bold hover:text-gray-800"
                >
                  {'<'}
                </button>
                <span className="font-medium text-sm text-gray-700">{currentIndex + 1} / {filteredVocab.length}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev < filteredVocab.length - 1 ? prev + 1 : 0); setIsFlipped(false); }}
                  className="font-bold hover:text-gray-800"
                >
                  {'>'}
                </button>
              </div>

              <button className="hover:text-gray-800"><RefreshCw className="w-5 h-5" /></button>
              <button className="hover:text-gray-800"><LayoutGrid className="w-5 h-5" /></button>
            </div>
            
          </div>
          
        ) : (
          
          /* LIST VIEW (DICTATION / NOTEBOOK) */
          <div className="w-full flex gap-8">
            {/* Left Column: Word List */}
            <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">My Vocabulary's Notebook</h2>
                <div className="relative">
                  <input type="text" placeholder="Search..." className="border border-gray-200 rounded-md py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <span className="absolute right-2 top-2 text-gray-400">🔍</span>
                </div>
              </div>

              <div className="flex gap-4 border-b border-gray-100 pb-2 mb-4">
                <button className="text-blue-500 font-medium text-sm border-b-2 border-blue-500 pb-2">All words</button>
                <button className="text-gray-500 hover:text-gray-700 text-sm pb-2">Your list</button>
              </div>

              <div className="space-y-4">
                {filteredVocab.map((word, index) => (
                  <div key={word.id} className="flex justify-between items-start py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-lg font-semibold text-gray-900">{word.word}</span>
                        <span className="text-gray-500 font-medium text-sm">/{word.pronunciation}/</span>
                      </div>
                      <div className="text-gray-400 text-sm mb-1">({word.type})</div>
                      <div className="text-red-400 text-sm">{word.meaning}</div>
                    </div>
                    <button className="text-red-400 hover:text-red-500 p-1">
                      <span className="text-xl">♡</span>
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center items-center mt-6 gap-2 text-gray-500">
                <button className="p-1 hover:text-gray-800 font-bold">{'<'}</button>
                <button className="w-6 h-6 rounded bg-gray-200 text-gray-800 text-sm font-medium flex items-center justify-center">1</button>
                <button className="w-6 h-6 rounded hover:bg-gray-100 text-sm font-medium flex items-center justify-center">2</button>
                <button className="w-6 h-6 rounded hover:bg-gray-100 text-sm font-medium flex items-center justify-center">3</button>
                <button className="w-6 h-6 rounded hover:bg-gray-100 text-sm font-medium flex items-center justify-center">4</button>
                <button className="p-1 hover:text-gray-800 font-bold">{'>'}</button>
              </div>
            </div>

            {/* Right Column: Notebook Tools */}
            <div className="w-[300px] shrink-0">
              <div className="bg-red-50/50 rounded-lg p-6 border border-red-100">
                <h3 className="font-bold text-gray-800 mb-6">Notebook tools</h3>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">View mode</span>
                    <button className="text-gray-400 bg-white border border-gray-200 px-2 py-1 rounded w-24 text-left flex justify-between items-center">
                      List view <span className="text-xs">▼</span>
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Audio accent</span>
                    <button className="text-gray-400 bg-white border border-gray-200 px-2 py-1 rounded w-24 text-left flex justify-between items-center">
                      UK <span className="text-xs">▼</span>
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Translation mode</span>
                    <button className="text-gray-400 bg-white border border-gray-200 px-2 py-1 rounded w-24 text-left flex justify-between items-center">
                      Auto <span className="text-xs">▼</span>
                    </button>
                  </div>
                </div>

                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-md transition-colors text-sm">
                  Review & practice
                </button>
              </div>
            </div>
          </div>
          
        )}

      </main>
    </div>
  );
};

export default FlashcardPage;
