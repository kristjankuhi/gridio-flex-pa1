import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="bg-amber-950/30 border-b border-amber-800/30 text-center py-1 text-xs text-amber-400/80 tracking-wide select-none">
        Prototype — all data is simulated · Not for operational use
      </div>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
