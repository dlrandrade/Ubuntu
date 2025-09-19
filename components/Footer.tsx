// FIX: Implemented the missing Footer component.
import React from 'react';
import { ContentConfig } from '../types';

interface FooterProps {
  content: ContentConfig;
}

const Footer: React.FC<FooterProps> = ({ content }) => {
  return (
    <footer className="w-full text-center p-4 mt-auto">
      <div className="flex flex-col items-center gap-4">
        <img
          src="https://i.imgur.com/76OXrzA.png"
          alt="Profile"
          className="w-[50px] h-[50px] rounded-full object-cover border-2 border-[var(--accent-color)]"
        />
        <p className="opacity-70 text-sm">{content.footerContent}</p>
      </div>
    </footer>
  );
};

export default Footer;