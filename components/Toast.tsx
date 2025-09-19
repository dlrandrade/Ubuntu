// FIX: Created the missing Toast component for user notifications.
import React from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className={`fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white ${bgColor} flex items-center z-50`}>
      <span className="flex-grow">{message}</span>
      <button onClick={onClose} className="ml-4 font-bold text-lg">&times;</button>
    </div>
  );
};

export default Toast;
