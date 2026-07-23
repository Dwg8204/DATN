import React from 'react';
import { useNavigate } from 'react-router-dom';
import ReadingPopularSection from '../components/overview/ReadingPopularSection';

const ReadingOverviewPage = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white">
      {/* Breadcrumbs - matching the outer background color in the layout if needed, but the image shows it inside or at the top of the white container. Actually, looking at the image, the breadcrumbs are in the gray background area above the white main card. Wait, the main menu header is white, then a gray background section with breadcrumbs, then the white container. */}
      {/* Let's wrap breadcrumbs outside a white container, or just make the page background gray and put a white box inside. */}
      {/* Our App.jsx sets a gray background for main. We will use a standard container. */}
      
      {/* Breadcrumb row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <span className="font-semibold text-gray-900 text-lg">Reading Page</span>
          <span className="text-gray-400 text-lg">/</span>
          <span className="font-semibold text-gray-900 text-lg">Overview</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white p-8 md:p-10 rounded-none md:rounded-xl shadow-sm border border-gray-100">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-red-600 uppercase tracking-wide">
              READING OVERVIEW
            </h1>
            <button
              onClick={() => navigate('/reading/choose')}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-8 rounded-full transition-colors whitespace-nowrap"
            >
              Start test
            </button>
          </div>

          <div className="text-gray-900 text-[15px] leading-relaxed space-y-6 max-w-none">
            <p>
              APTIS Reading is one of the four components of the APTIS test, developed by the British Council, which is designed to assess a test taker's proficiency in the English language. The APTIS Reading test evaluates your ability to understand and interpret written texts in English across a range of contexts and complexity levels.
            </p>

            <div>
              <h2 className="font-bold mb-2">Test Format:</h2>
              <p className="mb-2">The APTIS Reading test is divided into four sections, and the tasks become progressively more difficult as the test advances. Unlike a single fixed format, the time allowed varies depending on the version of the test:</p>
              <ul className="list-none space-y-1">
                <li>+) Aptis General – 35 minutes</li>
                <li>+) Aptis Advanced – 60 minutes</li>
                <li>+) Aptis for Teens – 30 minutes</li>
                <li>+) Aptis for Teachers – 30 minutes</li>
              </ul>
            </div>

            <div>
              <h2 className="font-bold mb-2">Question Types:</h2>
              <div className="space-y-4">
                <div>
                  <p className="font-medium">Part 1 – Sentence Comprehension</p>
                  <p>You will read a short text in the form of a note or an email. For five sentences in the text, you must choose a word to complete each sentence. This part tests your ability to read and understand simple sentences. Read each sentence and all possible answer choices carefully before selecting your answer.</p>
                </div>
                <div>
                  <p className="font-medium">Part 2 – Text Cohesion</p>
                  <p>This section contains two separate texts. Each text consists of six sentences, but only the first sentence is placed correctly. Your task is to arrange the remaining five sentences in the correct order to form a complete, coherent text. There is only one correct arrangement for each text.</p>
                </div>
                <div>
                  <p className="font-medium">Part 3 – Opinion Matching</p>
                  <p>You will read a text made up of four paragraphs on a common topic, each paragraph representing a different person's opinions or preferences. You will then match seven given statements to the correct person. This section assesses your ability to identify specific viewpoints within a text.</p>
                </div>
                <div>
                  <p className="font-medium">Part 4 – Long Text Comprehension</p>
                  <p>In the final section, you will read a longer text of approximately 750 words, consisting of eight paragraphs. You are given eight headings and must match seven of them to seven of the paragraphs. This part tests your ability to understand and summarize the main idea of each section of a longer text.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-bold mb-2">Top tips for the reading test:</h2>
              <ul className="list-none space-y-2">
                <li>Read all the sentences carefully first, then decide on the correct order. You need to look for words that show how the sentences link with each other.</li>
                <li>To perform well in section two, first read each paragraph so you understand each person's point of view. Then read the statements and decide which person's opinion it best represents.</li>
                <li>In section three it is necessary to scroll the reading text to see all of it. Select the appropriate heading from the drop-down list on the left-hand side. There is always an extra heading that does not fit with any paragraph.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-bold mb-2">Skills Assessed:</h2>
              <p className="mb-2">The APTIS Reading test evaluates a range of reading skills, including:</p>
              <ul className="list-none space-y-1">
                <li>+) Understanding simple sentences and everyday language</li>
                <li>+) Recognizing how texts are structured and how ideas connect</li>
                <li>+) Identifying individual opinions and matching them to statements</li>
                <li>+) Comprehending extended texts and identifying the main idea of each section</li>
              </ul>
            </div>

            <p className="italic text-sm mt-4">*Cre: British Council – Aptis Reading Component</p>
          </div>

          <div className="mt-12 mb-10">
            <h2 className="text-xl md:text-2xl font-bold text-red-600 uppercase mb-5 tracking-wide">READING DOCUMENTS</h2>
            <ul className="space-y-4">
              <li><a href="#" className="text-gray-900 font-medium hover:text-red-600 italic underline decoration-gray-400 underline-offset-4">Some tips for taking the APTIS Reading test</a></li>
              <li><a href="#" className="text-gray-900 font-medium hover:text-red-600 italic underline decoration-gray-400 underline-offset-4">APTIS Reading practice test</a></li>
              <li><a href="#" className="text-gray-900 font-medium hover:text-red-600 italic underline decoration-gray-400 underline-offset-4">Question types in the APTIS Reading test</a></li>
              <li><a href="#" className="text-gray-900 font-medium hover:text-red-600 italic underline decoration-gray-400 underline-offset-4">APTIS Reading band scores</a></li>
            </ul>
          </div>

          <ReadingPopularSection />
        </div>
      </div>
    </div>
  );
};

export default ReadingOverviewPage;
