import { ReactNode } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import AIAssistant from '../components/AIAssistant';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AppLayout({ children, title = 'Студенческий портал' }: AppLayoutProps) {
  return (
    <div className="flex bg-[#F8FAFC] font-sans text-slate-900 h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 relative">
        <Header title={title} />
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
      <AIAssistant />
    </div>
  );
}
