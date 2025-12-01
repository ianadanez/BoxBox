
import React from 'react';

// Placeholder data - we will fetch this from Firestore later
const winners = [
  { name: 'Player 1', score: 1234, avatar: 'https://i.pravatar.cc/150?u=player1' },
  { name: 'Player 2', score: 1198, avatar: 'https://i.pravatar.cc/150?u=player2' },
  { name: 'Player 3', score: 1150, avatar: 'https://i.pravatar.cc/150?u=player3' },
];

const OffSeasonPage: React.FC = () => {
  return (
    <div style={{ textAlign: 'center', padding: '50px', color: 'white', backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
      <h1>The 2025 Season has Concluded!</h1>
      <h2 style={{ color: '#ccc' }}>Congratulations to the Champions!</h2>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '20px', marginTop: '50px', flexWrap: 'wrap' }}>
        {/* 2nd Place */}
        <div style={{ order: 2, textAlign: 'center' }}>
          <div style={{ backgroundColor: '#333', border: '2px solid #c0c0c0', padding: '20px', borderRadius: '10px', minWidth: '150px' }}>
            <h2 style={{ color: '#c0c0c0', margin: 0 }}>2nd</h2>
            <img src={winners[1].avatar} alt={winners[1].name} style={{ width: '100px', height: '100px', borderRadius: '50%', border: '3px solid #c0c0c0', marginTop: '10px' }} />
            <h3 style={{ margin: '10px 0 5px 0' }}>{winners[1].name}</h3>
            <p style={{ margin: 0, color: '#c0c0c0' }}>{winners[1].score} pts</p>
          </div>
        </div>

        {/* 1st Place */}
        <div style={{ order: 1, textAlign: 'center' }}>
          <div style={{ backgroundColor: '#333', border: '2px solid #ffd700', padding: '30px', borderRadius: '10px', minWidth: '170px' }}>
            <h2 style={{ color: '#ffd700', margin: 0 }}>1st</h2>
            <img src={winners[0].avatar} alt={winners[0].name} style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid #ffd700', marginTop: '10px' }} />
            <h3 style={{ margin: '10px 0 5px 0' }}>{winners[0].name}</h3>
            <p style={{ margin: 0, color: '#ffd700' }}>{winners[0].score} pts</p>
          </div>
        </div>

        {/* 3rd Place */}
        <div style={{ order: 3, textAlign: 'center' }}>
          <div style={{ backgroundColor: '#333', border: '2px solid #cd7f32', padding: '15px', borderRadius: '10px', minWidth: '140px' }}>
            <h2 style={{ color: '#cd7f32', margin: 0 }}>3rd</h2>
            <img src={winners[2].avatar} alt={winners[2].name} style={{ width: '90px', height: '90px', borderRadius: '50%', border: '3px solid #cd7f32', marginTop: '10px' }} />
            <h3 style={{ margin: '10px 0 5px 0' }}>{winners[2].name}</h3>
            <p style={{ margin: 0, color: '#cd7f32' }}>{winners[2].score} pts</p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '60px' }}>
        <p>Thank you for playing! The 2026 season is just around the corner.</p>
        <p>Get ready for new predictions!</p>
      </div>
    </div>
  );
};

export default OffSeasonPage;
