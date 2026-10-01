import React from 'react';

export const TotalTestsIcon = ({ size = 24, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} className={className}>
    <path fill="currentColor" fillRule="evenodd" d="M5.25 6A2.756 2.756 0 0 1 8 3.25h4.5a.75.75 0 0 1 .53.22l5.5 5.5c.141.14.22.331.22.53V18A2.756 2.756 0 0 1 16 20.75H8A2.756 2.756 0 0 1 5.25 18zM8 4.75c-.686 0-1.25.564-1.25 1.25v12c0 .686.564 1.25 1.25 1.25h8c.686 0 1.25-.564 1.25-1.25v-7.75H12.5a.75.75 0 0 1-.75-.75V4.75zm5.25 1.06l2.94 2.94h-2.94zm2.03 7.22a.75.75 0 1 0-1.06-1.06l-3.47 3.47l-.97-.97a.75.75 0 0 0-1.06 1.06l1.5 1.5a.75.75 0 0 0 1.06 0z" clipRule="evenodd" />
  </svg>
);

export const AvgScoreIcon = ({ size = 24, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} className={className}>
    <path fill="currentColor" d="M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2q1.05 0 2.013.2t1.862.575q.375.15.488.55t-.088.75t-.575.488t-.775-.013q-.675-.275-1.412-.413T12 4Q8.65 4 6.325 6.325T4 12t2.325 5.675T12 20t5.675-2.325T20 12q0-.375-.038-.725t-.087-.7q-.075-.425.125-.787t.6-.488t.763.075t.437.6q.1.5.15 1T22 12q0 2.075-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-4q-2.5 0-4.25-1.75T6 12q0-1.25.475-2.35t1.275-1.9q.85-.85 1.925-1.287T11.9 6q.5 0 .763.3t.262.675t-.238.7T11.95 8q-.775 0-1.488.3t-1.287.875q-.55.55-.862 1.275T8 12q0 1.65 1.175 2.825T12 16q.8 0 1.538-.312t1.312-.888q.275-.275.488-.587t.362-.663q.175-.375.55-.537t.75.012t.538.55t-.013.75q-.225.525-.537 1.013t-.738.912q-.8.8-1.9 1.275T12 18m0-6.4l7.875-7.9q.3-.3.713-.3t.712.3t.3.712t-.3.713L12.7 13.7q-.3.3-.7.3t-.7-.3l-1.6-1.575q-.3-.3-.3-.712t.3-.713t.713-.3t.712.3z" />
  </svg>
);

export const AvgBandIcon = ({ size = 24, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} className={className}>
    <path fill="currentColor" d="M7 21v-2h4v-3.1q-1.225-.275-2.187-1.037T7.4 12.95q-1.875-.225-3.137-1.637T3 8V5h4V3h10v2h4v3q0 1.9-1.263 3.313T16.6 12.95q-.45 1.15-1.412 1.913T13 15.9V19h4v2zm0-10.2V7H5v1q0 .95.55 1.713T7 10.8m10 0q.9-.325 1.45-1.088T19 8V7h-2z" />
  </svg>
);

export const StreakIcon = ({ size = 24, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} className={className}>
    <path fill="currentColor" d="m16.35 19.175l4.25-4.25L22 16.35L16.375 22l-3.55-3.55l1.4-1.4zM4 13q0-3.225 2.163-6.125T12 2v3.3q0 .85.588 1.425t1.437.575q.45 0 .838-.187t.687-.563L16 6q1.8 1.025 2.863 2.813T20 12.7l-3.65 3.65l-2.125-2.125L10 18.45l2.525 2.525q-.125 0-.262.013T12 21q-3.35 0-5.675-2.325T4 13" />
  </svg>
);

export const BestSkillIcon = ({ size = 24, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} className={className}>
    <path fill="currentColor" d="M17.2 20.75a.73.73 0 0 1-.35-.09L12 18.11l-4.85 2.55a.75.75 0 0 1-.79-.05a.76.76 0 0 1-.3-.74l.94-5.4l-3.94-3.82a.75.75 0 0 1-.18-.77a.74.74 0 0 1 .6-.51l5.42-.79l2.43-4.91a.78.78 0 0 1 1.34 0l2.43 4.91l5.42.79a.74.74 0 0 1 .6.51a.75.75 0 0 1-.18.77L17 14.47l.93 5.4a.76.76 0 0 1-.3.74a.8.8 0 0 1-.43.14M12 16.52a.85.85 0 0 1 .35.08l3.85 2l-.73-4.29a.78.78 0 0 1 .21-.67l3.12-3l-4.31-.64a.76.76 0 0 1-.56-.41L12 5.69L10.07 9.6a.76.76 0 0 1-.56.41l-4.31.63l3.12 3a.78.78 0 0 1 .21.67l-.73 4.32l3.85-2a.85.85 0 0 1 .35-.11" />
  </svg>
);

export const WeakSkillIcon = ({ size = 24, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} className={className}>
    <path fill="currentColor" d="M1 21L12 2l11 19zm11.713-3.287Q13 17.425 13 17t-.288-.712T12 16t-.712.288T11 17t.288.713T12 18t.713-.288M11 15h2v-5h-2z" />
  </svg>
);
