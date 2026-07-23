import React from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';

const ReadingBlogSection = () => {
  const blogs = [
    {
      id: 1,
      title: 'How to skim and scan effectively',
      date: 'May 12, 2026',
      readTime: '5 min read'
    },
    {
      id: 2,
      title: 'Common vocabulary in APTIS Reading',
      date: 'June 01, 2026',
      readTime: '8 min read'
    },
    {
      id: 3,
      title: 'Tips for matching headings in Part 4',
      date: 'June 15, 2026',
      readTime: '6 min read'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center mb-6">
        <BookOpen className="text-red-600 w-6 h-6 mr-3" />
        <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">Reading Basics</h2>
      </div>
      
      <div className="space-y-4">
        {blogs.map(blog => (
          <div key={blog.id} className="group cursor-pointer">
            <h4 className="text-base font-semibold text-gray-800 group-hover:text-red-600 transition-colors mb-1 line-clamp-2">
              {blog.title}
            </h4>
            <div className="flex items-center text-sm text-gray-500">
              <span>{blog.date}</span>
              <span className="mx-2">•</span>
              <span>{blog.readTime}</span>
            </div>
            <div className="mt-3 border-b border-gray-100 last:border-0 pb-1 group-last:pb-0 group-last:border-0"></div>
          </div>
        ))}
      </div>
      
      <button className="mt-6 w-full flex items-center justify-center py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors">
        View All Articles
        <ArrowRight className="ml-2 w-4 h-4" />
      </button>
    </div>
  );
};

export default ReadingBlogSection;
