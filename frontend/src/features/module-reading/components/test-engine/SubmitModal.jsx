import React from 'react';

const SubmitModal = ({ onConfirm, onCancel, answers = {} }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden p-8 flex flex-col items-center animate-in fade-in zoom-in duration-200">
        
        <p className="text-gray-900 font-bold text-lg mb-4 text-center">Are you sure you want to submit your test?</p>
        
        <p className="text-gray-700 text-sm mb-1 text-center font-medium">If you select 'Yes' the test will be submitted.</p>
        <p className="text-gray-700 text-sm mb-8 text-center font-medium">If you select 'No' you will return to the test.</p>
        
        <div className="flex gap-4 w-full">
          <button 
            onClick={onConfirm}
            className="flex-1 py-2.5 font-bold text-white bg-gray-900 rounded-md hover:bg-black transition-colors"
          >
            Yes
          </button>
          <button 
            onClick={onCancel}
            className="flex-1 py-2.5 font-bold text-white bg-gray-900 rounded-md hover:bg-black transition-colors"
          >
            No
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default SubmitModal;
