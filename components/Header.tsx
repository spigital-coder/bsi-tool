
import React from 'react';

interface HeaderProps {
  isAdmin: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
  onDashboardClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ isAdmin, onLoginClick, onLogout, onDashboardClick }) => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 md:h-24 flex items-center justify-between">
        <div className="flex items-center">
           <a href="https://www.bellows-systems.com/" className="flex items-center gap-2">
             <img 
               src="https://www.bellows-systems.com/wp-content/uploads/2024/05/BSI-black-Logo.webp" 
               alt="Bellows Systems" 
               className="h-10 md:h-12 w-auto object-contain"
             />
           </a>
        </div>
        
        <div className="flex items-center gap-2 md:gap-6">
             <div className="hidden md:flex items-center gap-6 mr-6 border-r border-gray-100 pr-6">
                <a href="https://www.bellows-systems.com/" className="text-sm font-medium text-[#414042] hover:text-[#C80A37] transition-colors">
                    Return to Website
                </a>
                {isAdmin ? (
                  <button 
                    onClick={onDashboardClick}
                    className="text-sm font-bold text-[#C80A37] hover:underline uppercase tracking-tight"
                  >
                    Cloud Inventory
                  </button>
                ) : (
                  <button 
                    onClick={onLoginClick}
                    className="text-sm font-medium text-gray-500 hover:text-[#C80A37] transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Admin Access
                  </button>
                )}
             </div>

             {isAdmin && (
               <button 
                 onClick={onLogout}
                 className="md:hidden p-2 text-gray-400 hover:text-red-600"
                 title="Logout"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
               </button>
             )}

             <button className="bg-[#C80A37] hover:bg-[#a0082c] text-white px-4 md:px-6 py-2 md:py-2.5 rounded text-xs md:text-sm font-bold transition-colors shadow-sm uppercase tracking-wide">
                Contact Sales
             </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
