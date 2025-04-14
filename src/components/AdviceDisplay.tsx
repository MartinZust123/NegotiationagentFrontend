import React from 'react';

interface AdviceDisplayProps {
  advice: string | null;
}

const AdviceDisplay: React.FC<AdviceDisplayProps> = ({ advice }) => {
  if (!advice) {
    return <div style={{ color: 'white', textAlign: 'center' }}>Generating advice...</div>;
  }

  return (
    <div style={{ 
      backgroundColor: '#2b2b2b', 
      borderRadius: '8px', 
      padding: '15px',
      color: 'white',
      marginTop: '15px'
    }}>
      <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '8px' }}>Strategic Advice</h3>
      <div style={{ 
        whiteSpace: 'pre-line',
        lineHeight: '1.6',
        padding: '10px 0'
      }}>
        {advice}
      </div>
    </div>
  );
};

export default AdviceDisplay; 