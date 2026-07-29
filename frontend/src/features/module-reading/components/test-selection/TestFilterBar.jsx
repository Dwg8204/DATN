import { Search } from 'lucide-react';
import AnswerSelect from '../../../../components/common/AnswerSelect';

const tabs = [
  { id: 'all', label: 'All tests' },
  { id: 'dễ lẻ', label: 'Single part' },
  { id: 'full', label: 'Full Test' },
];

const TestFilterBar = ({
  currentTab,
  setCurrentTab,
  searchQuery,
  setSearchQuery,
  selectedLevel,
  setSelectedLevel,
}) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
    <div className="flex space-x-2 w-full md:w-auto bg-gray-100 p-1 rounded-lg">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setCurrentTab(tab.id)}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-all flex-1 md:flex-none ${
            currentTab === tab.id
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>

    <div className="flex w-full md:w-auto space-x-3">
      <div className="relative min-w-[150px]">
        <AnswerSelect
          value={selectedLevel}
          onChange={(event) => setSelectedLevel(event.target.value)}
          options={[
            { value: 'all', label: 'All levels' },
            'A2',
            'B1',
            'B2',
            'C1',
          ]}
          ariaLabel="Filter by level"
        />
      </div>

      <div className="relative flex-1 md:w-64">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
          placeholder="Search tests..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>
    </div>
  </div>
);

export default TestFilterBar;
