import React from 'react';
import { Search, Filter } from 'lucide-react';

const TestFilterBar = ({ 
  currentTab, 
  setCurrentTab, 
  searchQuery, 
  setSearchQuery,
  selectedLevel,
  setSelectedLevel 
}) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
      
      {/* Tabs */}
      <div className="flex space-x-2 w-full md:w-auto bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setCurrentTab('all')}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-all flex-1 md:flex-none ${
            currentTab === 'all' 
              ? 'bg-white text-red-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Tất cả
        </button>
        <button
          onClick={() => setCurrentTab('dễ lẻ')}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-all flex-1 md:flex-none ${
            currentTab === 'dễ lẻ' 
              ? 'bg-white text-red-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Đề lẻ
        </button>
        <button
          onClick={() => setCurrentTab('full')}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-all flex-1 md:flex-none ${
            currentTab === 'full' 
              ? 'bg-white text-red-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Full Test
        </button>
      </div>

      <div className="flex w-full md:w-auto space-x-3">
        {/* Level Dropdown */}
        <div className="relative">
          <select 
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-medium"
          >
            <option value="all">Mọi cấp độ</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
            <Filter className="w-4 h-4" />
          </div>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
            placeholder="Tìm kiếm đề thi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
    </div>
  );
};

export default TestFilterBar;
