import React from 'react';

const AptiMateLogo = ({ height = "h-9", className = "" }) => {
  return (
    <div className={`flex items-center gap-1 select-none ${height} ${className}`}>
      <svg 
        className="h-full w-auto" 
        viewBox="0 0 250 80" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Stylized Red A with Graduation Cap */}
        <g fill="#C82323">
          {/* Cap Diamond / Mortarboard */}
          <path d="M41 11 L10 22 L41 33 L72 22 Z" />
          
          {/* Skull Cap inner band */}
          <path d="M22 26.5 C29 30.5 53 30.5 60 26.5 C59 29.5 54 32.5 41 32.5 C28 32.5 23 29.5 22 26.5 Z" />
          
          {/* Tassel */}
          <path d="M16.5 25 L15.5 38 C15.5 40 15 41 14 41 C13.5 41 13.5 39.5 13.5 38 Z" />
          <path d="M15.5 40 L12.5 47 H18.5 Z" />
          
          {/* Letter A with a punched hole above crossbar */}
          <path 
            d="M10 74 L32 39 C34 36 38 36 40 39 L62 74 H48.5 L44 64 H28 L23.5 74 H10 Z M41 45 L32 59 H50 Z" 
            fillRule="evenodd"
          />
        </g>
        
        {/* Text "ptiMate" */}
        <text 
          x="68" 
          y="74" 
          fill="#000000" 
          fontSize="38" 
          fontWeight="bold" 
          fontFamily="Inter, system-ui, -apple-system, sans-serif" 
          letterSpacing="-1"
        >
          ptiMate
        </text>
      </svg>
    </div>
  );
};

export default AptiMateLogo;
