import React from 'react';

export const ResponsiveLayout = ({ children, currentTab, setCurrentTab }) => {
  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-[var(--bg-main)] text-[var(--text-primary)] font-sans overflow-hidden">
      
      {/* Desktop Navigation (Removed) */}

      {/* Main Content Area */}
      <main className="flex-1 flex justify-center relative min-h-0 w-full overflow-y-auto overflow-x-hidden">
        {/* Constrain main content width on desktop for better readability, but allow full stretch on mobile */}
        <div className="w-full max-w-4xl h-full flex flex-col relative overflow-visible">
          {children}
        </div>
      </main>

      {/* Mobile Navigation (Removed) */}
      
    </div>
  );
};
