import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="w-full py-6" style={{ background: 'var(--bg-gradient-top)' }}>
            <div className="container mx-auto px-4 text-center text-sm opacity-80">
                <p>Ubuntu: Consultoria em Diversidade e Inclusão com Dayse Rodrigues.</p>
                <div className="flex justify-center items-center gap-4 mt-2">
                    <a href="https://daysemrodrigues.com.br/" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{color: 'var(--accent-color)'}}>
                        Website
                    </a>
                    <span>|</span>
                    <a href="https://www.instagram.com/ubuntuconsultoria/" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{color: 'var(--accent-color)'}}>
                        Instagram
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
