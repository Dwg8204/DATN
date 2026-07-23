import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { calculateScore } from '../services/gradingService';

const ReadingResultPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const sessionDataString = localStorage.getItem(sessionId);
        if (!sessionDataString) {
          navigate('/reading/choose');
          return;
        }

        const sessionData = JSON.parse(sessionDataString);
        
        const testDataModule = await import('../services/mockData/testData.json');
        const testData = testDataModule.default || testDataModule;

        const gradedResults = calculateScore(sessionData.answers, testData, sessionData.mode || 'full');
        // Add timeSpent and original answers for display/referencing
        setResults({ 
          ...gradedResults, 
          timeSpent: sessionData.timeSpent,
          userAnswers: sessionData.answers
        });
      } catch (error) {
        console.error("Error loading results", error);
        navigate('/reading/choose');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C82323]"></div>
      </div>
    );
  }

  if (!results) return null;

  const percentage = Math.round((results.overall.score / results.overall.total) * 100);

  // Calculate correct, wrong, skipped
  let correctCount = results.overall.score;
  let skipCount = 0;
  
  // Count skipped answers
  const allDetails = [
    ...results.part1.details,
    ...results.part2.details,
    ...results.part3.details,
    ...results.part4.details
  ];
  allDetails.forEach(item => {
    if (item.userAnswer === '(No answer)' || !item.userAnswer || item.userAnswer === '') {
      skipCount++;
    }
  });
  
  let wrongCount = results.overall.total - correctCount - skipCount;
  if (wrongCount < 0) wrongCount = 0;

  // Format testing time (default to 00:32:15 if not recorded)
  const formatTestingTime = (seconds) => {
    if (seconds === undefined || seconds === null) return "00:32:15";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [
      h.toString().padStart(2, '0'),
      m.toString().padStart(2, '0'),
      s.toString().padStart(2, '0')
    ].join(':');
  };

  // Generate question numbering & answers
  let currentNum = 1;
  const part1Items = results.part1.details.map(d => ({ ...d, number: currentNum++ }));
  const part2Items = results.part2.details.map(d => ({ ...d, number: currentNum++ }));
  const part3Items = results.part3.details.map(d => ({ ...d, number: currentNum++ }));
  const part4Items = results.part4.details.map(d => ({ ...d, number: currentNum++ }));

  // Generate Dynamic Vietnamese Feedback
  const getFeedbackText = () => {
    const p1Pct = results.part1.total > 0 ? (results.part1.score / results.part1.total) : 0;
    const p2Pct = results.part2.total > 0 ? (results.part2.score / results.part2.total) : 0;
    const p3Pct = results.part3.total > 0 ? (results.part3.score / results.part3.total) : 0;
    const p4Pct = results.part4.total > 0 ? (results.part4.score / results.part4.total) : 0;
    
    let feedback = "Chúc mừng bạn đã hoàn thành bài thi! ";
    
    const parts = [
      { part: 1, name: "Hoàn thành câu (Part 1)", pct: p1Pct, scoreStr: `${results.part1.score}/${results.part1.total}` },
      { part: 2, name: "Mạch lạc văn bản (Part 2)", pct: p2Pct, scoreStr: `${results.part2.score}/${results.part2.total}` },
      { part: 3, name: "Ghép ý kiến (Part 3)", pct: p3Pct, scoreStr: `${results.part3.score}/${results.part3.total}` },
      { part: 4, name: "Ghép tiêu đề (Part 4)", pct: p4Pct, scoreStr: `${results.part4.score}/${results.part4.total}` }
    ];
    
    parts.sort((a, b) => b.pct - a.pct);
    const best = parts[0];
    const worst = parts[parts.length - 1];
    
    if (best.pct >= 0.7) {
      feedback += `Bạn có kỹ năng ${best.name.replace(/\s*\(Part\s*\d+\)/, '')} rất xuất sắc. `;
    } else {
      feedback += "Bạn đã hoàn thành tốt các câu hỏi trong bài làm của mình. ";
    }
    
    if (worst.pct < 0.6) {
      feedback += `Tuy nhiên, tỷ lệ đúng ở phần ${worst.name.replace(/\s*\(Part\s*\d+\)/, '')} (${worst.name.split(' ').pop()}) đang khá thấp (${worst.scoreStr}). Điều này cho thấy bạn cần ôn tập thêm về `;
      if (worst.part === 1) {
        feedback += "ngữ pháp cơ bản, từ vựng theo ngữ cảnh và các cấu trúc liên kết câu đơn giản.";
      } else if (worst.part === 2) {
        feedback += "cách sử dụng các từ nối (linking words), đại từ thay thế và rèn luyện tư duy logic để sắp xếp các câu thành một đoạn văn hoàn chỉnh.";
      } else if (worst.part === 3) {
        feedback += "kỹ năng đọc lướt (scanning) để định vị nhanh thông tin chi tiết và nhận diện các từ đồng nghĩa (synonyms) của người nói.";
      } else {
        feedback += "cách nắm bắt ý chính (topic sentence) của từng đoạn văn dài và phân tích các phương án gây nhiễu.";
      }
    } else {
      feedback += "Các kỹ năng của bạn khá đồng đều. Hãy tiếp tục luyện tập để đạt kết quả cao hơn nữa!";
    }
    
    return feedback;
  };

  // Helper to render static/SVG circular progress bar
  const renderCircle = (score, total, size = 110, strokeWidth = 8) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const scorePct = total > 0 ? (score / total) : 0;
    const strokeDashoffset = circumference - (scorePct * circumference);
    
    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-gray-100"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-[#16A34A] transition-all duration-500 ease-out"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-sm font-black text-gray-800">
          {score}/{total}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col font-sans">
      
      {/* Main Body */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
        
        {/* Top Section: CEFR Level & Result Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* CEFR Level Card */}
          <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 flex flex-col justify-center items-center h-48 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#C82323] mb-1">CEFR Level</h3>
            <span className="text-5xl font-black text-[#C82323] my-1 tracking-tight">
              {results.overall.cefr}
            </span>
            <span className="text-xs font-bold text-gray-700 mt-2">
              Score: {results.overall.score}/{results.overall.total}
            </span>
          </div>

          {/* Result Chart Card */}
          <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-8 h-auto sm:h-48 shadow-sm">
            
            {/* Left: SVG Percentage Ring */}
            <div className="flex flex-col items-start h-full justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#C82323] mb-2 sm:mb-0">Result</h3>
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="transform -rotate-90" width="112" height="112">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    className="stroke-gray-100"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    className="stroke-[#16A34A] transition-all duration-500"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={48 * 2 * Math.PI}
                    strokeDashoffset={48 * 2 * Math.PI - (percentage / 100) * (48 * 2 * Math.PI)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-xl font-black text-gray-800">{percentage}%</span>
              </div>
            </div>

            {/* Right: Key-Value Summary List */}
            <div className="flex-1 w-full flex flex-col justify-center space-y-2 text-sm pl-0 sm:pl-6">
              <div className="flex justify-between items-center py-0.5">
                <span className="font-bold text-gray-500">Testing time</span>
                <span className="font-black text-gray-800">{formatTestingTime(results.timeSpent)}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="font-bold text-[#16A34A]">Correct</span>
                <span className="font-black text-gray-800">{correctCount} sections</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="font-bold text-[#C82323]">Wrong</span>
                <span className="font-black text-gray-800">{wrongCount} section</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="font-bold text-gray-400">Skip</span>
                <span className="font-black text-gray-800">{skipCount} section</span>
              </div>
            </div>

          </div>
        </div>

        {/* Answer Breakdown Details Grid */}
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-wider text-[#C82323] mb-4">Result</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 pt-2">
            
            {/* Part 1 */}
            <div className="flex flex-col space-y-2">
              <h4 className="font-black text-[#C82323] text-xs border-b border-gray-100 pb-1 uppercase tracking-wider">Part 1</h4>
              <div className="flex flex-col space-y-2">
                {part1Items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <span className="font-bold text-gray-400 w-4">{item.number}</span>
                      <span className="text-gray-700 truncate font-semibold max-w-[100px]" title={item.userAnswer}>
                        {item.userAnswer}
                      </span>
                    </div>
                    {item.isCorrect ? (
                      <span className="text-[#16A34A] font-bold text-sm">✓</span>
                    ) : (
                      <span className="text-[#C82323] font-bold text-sm">✕</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Part 2 Column 1 */}
            <div className="flex flex-col space-y-2">
              <h4 className="font-black text-[#C82323] text-xs border-b border-gray-100 pb-1 uppercase tracking-wider">Part 2</h4>
              <div className="flex flex-col space-y-2">
                {part2Items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <span className="font-bold text-gray-400 w-4">{item.number}</span>
                      <span className="text-gray-700 truncate font-semibold max-w-[100px]" title={item.userAnswer}>
                        {item.userAnswer}
                      </span>
                    </div>
                    {item.isCorrect ? (
                      <span className="text-[#16A34A] font-bold text-sm">✓</span>
                    ) : (
                      <span className="text-[#C82323] font-bold text-sm">✕</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Part 3 */}
            <div className="flex flex-col space-y-2">
              <h4 className="font-black text-[#C82323] text-xs border-b border-gray-100 pb-1 uppercase tracking-wider">Part 3</h4>
              <div className="flex flex-col space-y-2">
                {part3Items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <span className="font-bold text-gray-400 w-4">{item.number}</span>
                      <span className="text-gray-700 truncate font-semibold max-w-[100px]" title={item.userAnswer}>
                        {item.userAnswer}
                      </span>
                    </div>
                    {item.isCorrect ? (
                      <span className="text-[#16A34A] font-bold text-sm">✓</span>
                    ) : (
                      <span className="text-[#C82323] font-bold text-sm">✕</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Part 4 */}
            <div className="flex flex-col space-y-2 col-span-1 md:col-span-2">
              <h4 className="font-black text-[#C82323] text-xs border-b border-gray-100 pb-1 uppercase tracking-wider">Part 4</h4>
              <div className="flex flex-col space-y-2">
                {part4Items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <span className="font-bold text-gray-400 w-4">{item.number}</span>
                      <span className="text-gray-700 truncate font-semibold max-w-[200px]" title={item.userAnswer}>
                        {item.userAnswer}
                      </span>
                    </div>
                    {item.isCorrect ? (
                      <span className="text-[#16A34A] font-bold text-sm">✓</span>
                    ) : (
                      <span className="text-[#C82323] font-bold text-sm">✕</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* AI Feedback Section */}
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#C82323]">Feedback</h3>
            <button 
              onClick={() => navigate(`/reading/review/${sessionId}`)}
              className="bg-[#C82323] hover:bg-[#A81E1E] text-white text-xs font-black tracking-wide py-1.5 px-4 rounded-lg transition-colors cursor-pointer"
            >
              View Feedback
            </button>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
            {getFeedbackText()}
          </p>
        </div>

        {/* Statistics Section with 4 Animated Circular Charts */}
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-wider text-[#C82323] mb-6">Statistics</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            
            <div className="flex flex-col items-center text-center">
              {renderCircle(results.part1.score, results.part1.total)}
              <span className="text-[11px] font-black text-gray-700 mt-3 tracking-wide">Sentence Comprehension</span>
            </div>

            <div className="flex flex-col items-center text-center">
              {renderCircle(results.part2.score, results.part2.total)}
              <span className="text-[11px] font-black text-gray-700 mt-3 tracking-wide">Text Cohesion</span>
            </div>

            <div className="flex flex-col items-center text-center">
              {renderCircle(results.part3.score, results.part3.total)}
              <span className="text-[11px] font-black text-gray-700 mt-3 tracking-wide">Opinion Matching</span>
            </div>

            <div className="flex flex-col items-center text-center">
              {renderCircle(results.part4.score, results.part4.total)}
              <span className="text-[11px] font-black text-gray-700 mt-3 tracking-wide">Long Text Comprehension</span>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <button
            onClick={() => navigate(`/reading/review/${sessionId}`)}
            className="w-full sm:w-auto bg-[#C82323] hover:bg-[#A81E1E] text-white font-black text-xs tracking-wider py-3 px-8 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            View detail result
          </button>
          
          <button
            onClick={() => navigate('/reading/choose')}
            className="w-full sm:w-auto bg-white hover:bg-gray-50 border-2 border-[#C82323] text-[#C82323] font-black text-xs tracking-wider py-3 px-8 rounded-lg transition-colors cursor-pointer"
          >
            Take another test
          </button>
        </div>

      </main>

      {/* AptiMate Custom Footer */}
      <footer className="bg-[#FAF8F5] border-t border-[#E5E2D9] py-12 mt-16 text-gray-600 font-sans">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row justify-between gap-10">
          
          {/* Logo & Legal Links Column */}
          <div className="flex flex-col space-y-4">
            <span className="text-2xl font-black tracking-tight flex items-baseline">
              <span className="text-[#C82323] text-3xl font-serif">A</span>
              <span className="text-gray-800 -ml-0.5 text-lg font-bold font-sans">ptiMate</span>
            </span>
            <div className="flex flex-col space-y-1.5 text-xs font-bold text-gray-500">
              <a href="#" className="hover:text-gray-900 transition-colors">About us</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Terms of use</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Disclaimer</a>
            </div>
          </div>

          {/* Contact Column */}
          <div className="flex flex-col space-y-3">
            <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">CONTACT</h4>
            <div className="flex flex-col space-y-1.5 text-xs font-bold text-gray-500">
              <span className="hover:text-gray-900 transition-colors cursor-pointer">Hotline</span>
              <span className="hover:text-gray-900 transition-colors cursor-pointer">Email</span>
              <span className="hover:text-gray-900 transition-colors cursor-pointer">Facebook</span>
              <span className="hover:text-gray-900 transition-colors cursor-pointer">Location</span>
            </div>
          </div>

          {/* Feedback & Copyright Column */}
          <div className="flex flex-col items-start md:items-end justify-between space-y-6 md:space-y-0">
            <button className="bg-[#C82323] hover:bg-[#A81E1E] text-white text-xs font-black tracking-wider py-2.5 px-6 rounded-full transition-all shadow-sm cursor-pointer">
              Leave us feedback
            </button>
            <div className="text-[10px] font-bold text-gray-400 text-left md:text-right mt-auto">
              Copyright ©2026 APTIS test, Inc. All rights reserved.
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default ReadingResultPage;
