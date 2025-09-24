'use client';
import { useState } from 'react';
import { User, ChevronDown, Settings, LogOut } from 'lucide-react';
import { useTopBar } from '@/src/contexts/TopBarContext';
import { useRouter } from 'next/navigation';

export function UserMenu() {
  const { isRTL } = useTopBar();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      localStorage.clear();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 p-2 hover:bg-white/10 rounded-md transition-colors"
        aria-label="User menu"
      >
        <User className="w-5 h-5" />
        <ChevronDown className="w-4 h-4" />
      </button>
      
      {open && (
        <div className={`absolute top-full mt-2 w-56 bg-white text-gray-800 rounded-lg shadow-lg p-1 z-50 ${isRTL ? 'left-0' : 'right-0'}`}>
          <a 
            href="/profile" 
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded text-sm"
            onClick={() => setOpen(false)}
          >
            <User className="w-4 h-4" />
            Profile
          </a>
          <a 
            href="/settings" 
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded text-sm"
            onClick={() => setOpen(false)}
          >
            <Settings className="w-4 h-4" />
            Settings
          </a>
          <div className="border-t my-1" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600 rounded text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}