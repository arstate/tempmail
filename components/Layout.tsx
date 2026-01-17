
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, sidebar }) => {
  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-900">
      {/* Sidebar */}
      <aside className="w-full md:w-80 flex-shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col h-1/3 md:h-full">
        {sidebar}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-2/3 md:h-full overflow-hidden">
        {children}
      </main>
    </div>
  );
};
