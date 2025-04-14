import React from 'react';

interface WorldModelProps {
  worldModel: {
    CHARACTER: {
      Agreeableness: string;
      Conscientiousness: string;
      Neuroticism: string;
      'Openness to Experience': string;
      Extraversion: string;
    };
    GOALS: string[];
    'BELIEFS & KNOWLEDGE': string[];
    'EMOTIONAL STATE': string;
  } | null;
}

const WorldModelDisplay: React.FC<WorldModelProps> = ({ worldModel }) => {
  if (!worldModel) {
    return <div style={{ color: 'white', textAlign: 'center' }}>Loading world model...</div>;
  }

  return (
    <div style={{ 
      backgroundColor: '#2b2b2b', 
      borderRadius: '8px', 
      padding: '15px',
      color: 'white',
      marginTop: '15px'
    }}>
      <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '8px' }}>Character Traits</h3>
      <table style={{ width: '100%', marginBottom: '20px' }}>
        <tbody>
          {Object.entries(worldModel.CHARACTER).map(([trait, value]) => (
            <tr key={trait}>
              <td style={{ padding: '8px 0', fontWeight: 'bold', width: '50%' }}>{trait}</td>
              <td style={{ padding: '8px 0' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '8px' }}>Goals</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        {worldModel.GOALS.map((goal, index) => (
          <li key={index} style={{ padding: '4px 0' }}>{goal}</li>
        ))}
      </ul>

      <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '8px' }}>Beliefs & Knowledge</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        {worldModel['BELIEFS & KNOWLEDGE'].map((belief, index) => (
          <li key={index} style={{ padding: '4px 0' }}>{belief}</li>
        ))}
      </ul>

      <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '8px' }}>Emotional State</h3>
      <p style={{ fontSize: '1.2em', padding: '8px 0' }}>{worldModel['EMOTIONAL STATE']}</p>
    </div>
  );
};

export default WorldModelDisplay; 