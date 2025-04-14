import React, { useState, useEffect } from 'react';

interface AdvicePopupProps {
  advice: string;
  onClose: () => void;
  autoCloseTime?: number;
}

const AdvicePopup: React.FC<AdvicePopupProps> = ({ advice, onClose, autoCloseTime = 20 }) => {
  const [timeLeft, setTimeLeft] = useState(autoCloseTime);

  useEffect(() => {
    // Set up countdown timer
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Clean up timer on unmount
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#1e1e1e',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            color: '#aaa',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
        <h3 style={{ 
          color: '#fff', 
          marginTop: '0', 
          marginBottom: '15px',
          borderBottom: '1px solid #444',
          paddingBottom: '10px'
        }}>
          Strategic Advice
        </h3>
        <div style={{ 
          color: '#ddd', 
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap'
        }}>
          {advice}
        </div>
        <div style={{
          marginTop: '15px',
          color: '#aaa',
          fontSize: '14px',
          textAlign: 'center',
          borderTop: '1px solid #444',
          paddingTop: '10px'
        }}>
          Will disappear in {timeLeft} seconds
        </div>
      </div>
    </div>
  );
};

export default AdvicePopup; 