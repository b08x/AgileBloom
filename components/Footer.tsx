
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800/30 backdrop-blur-sm p-3 text-center text-xs text-gray-400 border-t border-gray-700/50">
      AgileBloom AI &copy; {new Date().getFullYear()}. For demonstration purposes.
    </footer>
  );
};
