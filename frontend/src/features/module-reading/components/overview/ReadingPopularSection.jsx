import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Clock, FileText, Star } from 'lucide-react';

const ReadingPopularSection = () => {
  const navigate = useNavigate();
  const [popularTests, setPopularTests] = useState([]);

  useEffect(() => {
    // Giả lập fetch data
    import('../../services/mockData/testList.json')
      .then((data) => {
        // Lấy 3 đề nổi bật nhất (giả sử có rating cao)
        const sorted = data.tests.sort((a, b) => b.rating - a.rating).slice(0, 3);
        setPopularTests(sorted);
      })
      .catch(err => console.error("Failed to load tests", err));
  }, []);

  return (
    <div className="mt-12">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-red-600 uppercase tracking-wide">MOST POPULAR</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {popularTests.map((test) => (
          <div 
            key={test.id}
            className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col h-full"
            onClick={() => navigate(`/reading/intro/${test.id}`)}
          >
            {/* Thumbnail */}
            <div className="relative h-48 overflow-hidden bg-gray-200">
              <img 
                src={test.thumbnail} 
                alt={test.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm flex items-center">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 mr-1" />
                <span className="text-sm font-bold text-gray-800">{test.rating}</span>
              </div>
              
              <div className="absolute bottom-3 left-3 flex items-center space-x-2">
                 <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    test.level === 'C1' || test.level === 'C2' ? 'bg-purple-500 text-white' :
                    test.level === 'B2' ? 'bg-blue-500 text-white' :
                    test.level === 'B1' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                 }`}>
                   {test.level}
                 </span>
                 <span className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-2 py-0.5 rounded text-xs uppercase tracking-wide">
                   {test.type}
                 </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors line-clamp-2">
                {test.title}
              </h3>
              
              <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50 text-sm text-gray-500 font-medium">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1.5" />
                  {test.duration}m
                </div>
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-1.5" />
                  {test.totalQuestions} qs
                </div>
                <div className="flex items-center text-red-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                  Take test
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReadingPopularSection;
