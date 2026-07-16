import React, { useState, useEffect } from 'react';
import TestFilterBar from '../components/test-selection/TestFilterBar';
import TestCard from '../components/test-selection/TestCard';
import { TestCardSkeleton } from '../../../components/common/SkeletonLoaders';

// Dummy Discussions component for the UI mockup
const Discussions = () => {
  return (
    <div className="mt-12 max-w-4xl mx-auto md:mx-0">
      <h3 className="text-red-600 font-bold mb-6 text-lg">Discussions (6)</h3>
      
      <div className="flex gap-4 mb-8">
        <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
        <div className="flex-1 border border-gray-200 rounded-lg p-3 flex flex-col items-end">
          <textarea 
            className="w-full text-sm outline-none resize-none text-gray-700 placeholder-gray-400" 
            placeholder="Write a comment..."
            rows={2}
          ></textarea>
          <button className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded mt-2">Post</button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Comment 1 */}
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm text-gray-900">StudentBoy</span>
              <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200">Student</span>
              <span className="text-xs text-gray-400">10 min ago</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              The reading passage here is quite challenging, especially the Text Cohesion part. The vocabulary is also heavily domain-specific!
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500 font-medium mb-3">
              <button className="flex items-center hover:text-gray-900">👍 Reply</button>
            </div>
            
            <div className="pl-4 border-l-2 border-gray-100 space-y-4">
              <button className="text-blue-600 text-xs hover:underline flex items-center mb-2">▼ 2 replies</button>
              
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-gray-900">EduMate</span>
                    <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-yellow-200">Teacher</span>
                    <span className="text-xs text-gray-400">5 min ago</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    I agree! That's what makes the test advanced for these specific subject areas.
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                    <button className="flex items-center hover:text-gray-900">👍 Reply</button>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
                <div className="flex-1 border border-gray-200 rounded-lg p-2 flex flex-col items-end">
                  <input type="text" className="w-full text-sm outline-none text-gray-700" placeholder="Write a comment..." />
                  <button className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded mt-2">Post</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comment 2 */}
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm text-gray-900">StudentBoy</span>
              <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200">Student</span>
              <span className="text-xs text-gray-400">15 min ago</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              Can someone explain the matching procedure in this reading test?
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500 font-medium mb-3">
              <button className="flex items-center hover:text-gray-900">👍 Reply</button>
            </div>
            <button className="text-blue-600 text-xs hover:underline flex items-center pl-4 border-l-2 border-gray-100">▼ 1 replies</button>
          </div>
        </div>
        
        {/* Comment 3 */}
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm text-gray-900">StudentBoy</span>
              <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200">Student</span>
              <span className="text-xs text-gray-400">30 min ago</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              Wow, this reading test was quite productive! The topics were engaging, and the vocabulary list genuinely helped me prepare for the real exam. One of the best mocks I've done so far.
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500 font-medium mb-3">
              <button className="flex items-center hover:text-gray-900">👍 Reply</button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex justify-center">
         <button className="text-red-600 border border-red-200 hover:bg-red-50 text-xs font-bold py-1.5 px-6 rounded-full">See more</button>
      </div>
    </div>
  );
};

const ReadingChooseTestPage = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tab can be: 'part1', 'part2', 'part3', 'part4', 'full'
  const [currentTab, setCurrentTab] = useState('part1'); 
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch mock data
    const fetchTests = async () => {
      setLoading(true);
      try {
        const data = await import('../services/mockData/testList.json');
        setTimeout(() => {
          setTests(data.tests || []);
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error("Failed to load tests", error);
        setLoading(false);
      }
    };
    
    fetchTests();
  }, []);

  const tabs = [
    { id: 'part1', label: 'Part 1' },
    { id: 'part2', label: 'Part 2' },
    { id: 'part3', label: 'Part 3' },
    { id: 'part4', label: 'Part 4' },
    { id: 'full', label: 'Full Reading test' },
  ];

  return (
    <div className="py-8 px-4 md:px-8 max-w-6xl mx-auto min-h-[calc(100vh-80px)]">
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-red-600 uppercase">READING TEST</h1>
      </div>

      {/* Choose passage tab bar */}
      <div className="bg-[#E7C69F] rounded p-4 mb-8 flex items-center gap-4 overflow-x-auto">
        <span className="text-gray-800 font-semibold whitespace-nowrap">Choose passage {'>>'}</span>
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`px-6 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors border shadow-sm ${
                currentTab === tab.id 
                  ? 'bg-red-600 text-white border-red-600' 
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2 mb-8 max-w-lg">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">🔍</span>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-red-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
            placeholder="Search by test name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="bg-white border border-red-500 text-red-600 px-6 py-2 rounded text-sm font-bold hover:bg-red-50 transition-colors">
          Search
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => <TestCardSkeleton key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {tests.map((test, idx) => (
              <TestCard key={test.id} test={test} layoutMode={currentTab === 'full' ? 'full' : 'part'} index={idx} />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-1 mb-16">
            <button className="p-1 text-gray-500 hover:text-gray-900">{'<'}</button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-blue-600 text-white text-sm font-bold">1</button>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 text-sm font-medium">2</button>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 text-sm font-medium">3</button>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 text-sm font-medium">4</button>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 text-sm font-medium">5</button>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 text-sm font-medium">6</button>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 text-sm font-medium">7</button>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 text-sm font-medium">8</button>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 text-sm font-medium">9</button>
            <button className="p-1 text-gray-500 hover:text-gray-900">{'>'}</button>
          </div>

          <Discussions />
        </>
      )}
      
    </div>
  );
};

export default ReadingChooseTestPage;
