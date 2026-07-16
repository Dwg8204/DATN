import React from 'react';

export const TestCardSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm animate-pulse">
      {/* Thumbnail Skeleton */}
      <div className="h-48 bg-gray-200 w-full"></div>
      
      {/* Content Skeleton */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-6 bg-gray-200 rounded w-12"></div>
        </div>
        
        {/* Badges */}
        <div className="flex gap-2 mb-6">
          <div className="h-6 bg-gray-200 rounded w-16"></div>
          <div className="h-6 bg-gray-200 rounded w-24"></div>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-6 mb-6">
          <div className="h-4 bg-gray-200 rounded w-16"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
        
        {/* Action Button */}
        <div className="h-10 bg-gray-200 rounded-xl w-full"></div>
      </div>
    </div>
  );
};

export const TestEngineSkeleton = () => {
  return (
    <div className="w-full flex flex-col md:flex-row h-[500px] bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 animate-pulse gap-8">
      {/* Left Skeleton */}
      <div className="w-full md:w-1/2 flex flex-col gap-4 border-r border-gray-100 pr-4">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-4/5 mt-4"></div>
      </div>
      
      {/* Right Skeleton */}
      <div className="w-full md:w-1/2 flex flex-col gap-6">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-16 bg-gray-200 rounded-xl w-full"></div>
        <div className="h-16 bg-gray-200 rounded-xl w-full"></div>
        <div className="h-16 bg-gray-200 rounded-xl w-full"></div>
      </div>
    </div>
  );
};

export const FlashcardSkeleton = () => {
  return (
    <div className="w-full h-[380px] bg-white rounded-3xl shadow-xl border border-gray-100 animate-pulse flex flex-col items-center justify-center p-10">
      <div className="absolute top-6 left-6 h-4 bg-gray-200 rounded w-16"></div>
      <div className="absolute top-6 right-6 h-6 bg-gray-200 rounded-full w-20"></div>
      
      <div className="h-12 bg-gray-200 rounded w-3/4 mb-4 mt-8"></div>
      <div className="h-4 bg-gray-200 rounded w-1/3 mt-8"></div>
    </div>
  );
};

export const PageHeaderSkeleton = () => {
  return (
    <div className="animate-pulse mb-8">
      <div className="h-10 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
};
