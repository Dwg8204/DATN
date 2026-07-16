import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Bell, Droplet } from 'lucide-react';
import AptiMateLogo from '../common/AptiMateLogo';

const Header = () => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { label: 'LISTENING', href: '#', dropdown: [
      { label: 'Overview', href: '#' },
      { label: 'Practice Tests', href: '#' }
    ] },
    {
      label: 'READING',
      href: '/reading',
      active: true,
      dropdown: [
        { label: 'Overview', href: '/reading' },
        { label: 'Practice Tests', href: '/reading/choose' },
        { label: 'My Vocabulary', href: '/reading/vocab' },
      ]
    },
    { label: 'WRITING', href: '#', dropdown: [
      { label: 'Overview', href: '#' },
      { label: 'Practice Tests', href: '#' }
    ] },
    { label: 'SPEAKING', href: '#', dropdown: [
      { label: 'Overview', href: '#' },
      { label: 'Practice Tests', href: '#' }
    ] },
    {
      label: 'GRAMMAR & VOCABULARY',
      href: '#',
      dropdown: [
        { label: 'Grammar Exercises', href: '#' },
        { label: 'Vocabulary Flashcards', href: '/reading/vocab' },
        { label: 'Word List', href: '#' },
      ]
    },
    { label: 'DICTATION', href: '/reading/vocab', dropdown: null },
    { label: 'BLOG', href: '#', dropdown: null },
  ];

  return (
    <header className="bg-[#FAF8F5] border-b border-[#E5E2D9] relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between" ref={dropdownRef}>
        
        {/* Logo */}
        <div className="flex items-center cursor-pointer" onClick={() => window.location.href = '/'}>
          <AptiMateLogo height="h-9" />
        </div>

        {/* Navigation Menu */}
        <nav className="hidden md:flex items-center space-x-2">
          {navItems.map((item) => (
            <div key={item.label} className="relative">
              {item.dropdown ? (
                <button
                  onClick={() => setActiveDropdown(activeDropdown === item.label ? null : item.label)}
                  className={`flex items-center gap-0.5 px-3 py-2 text-xs font-black tracking-wider transition-colors ${
                    item.active
                      ? 'text-[#C82323]'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    activeDropdown === item.label ? 'rotate-180' : ''
                  } ${item.active ? 'text-[#C82323]' : 'text-gray-400'}`} />
                </button>
              ) : (
                <a
                  href={item.href}
                  className="flex items-center px-3 py-2 text-xs font-black tracking-wider text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {item.label}
                </a>
              )}

              {/* Dropdown Menu */}
              {item.dropdown && activeDropdown === item.label && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {item.dropdown.map((sub) => (
                    <a
                      key={sub.label}
                      href={sub.href}
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 font-medium transition-colors"
                      onClick={() => setActiveDropdown(null)}
                    >
                      {sub.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Right Side Icons */}
        <div className="flex items-center gap-4">
          {/* Notification bell with red dot */}
          <button className="relative p-1.5 text-gray-500 hover:text-gray-800 transition-colors rounded-full hover:bg-gray-100/50">
            <Bell className="w-5 h-5 text-gray-700" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#C82323] rounded-full"></span>
          </button>

          {/* Droplet with points */}
          <div className="flex items-center gap-1 bg-[#E0F2FE]/55 px-2.5 py-1 rounded-full border border-blue-100">
            <Droplet className="w-4 h-4 text-sky-500 fill-sky-500" />
            <span className="text-xs font-black text-gray-700">10</span>
          </div>

          {/* Profile Avatar */}
          <div className="flex items-center gap-1 cursor-pointer hover:opacity-85 transition-opacity">
            <img 
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" 
              alt="Profile" 
              className="w-8 h-8 rounded-full border border-gray-200 object-cover"
            />
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

      </div>
    </header>
  );
};

export default Header;
