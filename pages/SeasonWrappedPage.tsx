
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/db';
import { SeasonWrappedData } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Componente de bloque de estadística individual
const StatBlock: React.FC<{ title: string; value: string | number; description: string; color: string; }> = ({ title, value, description, color }) => (
  <div style={{...styles.statBlock, borderLeft: `4px solid ${color}`}}>
    <h3 style={styles.statBlockTitle}>{title}</h3>
    <p style={styles.statBlockValue}>{value}</p>
    <p style={styles.statBlockDescription}>{description}</p>
  </div>
);

const SeasonWrappedPage: React.FC = () => {
  const { user } = useAuth();
  const [wrappedData, setWrappedData] = useState<SeasonWrappedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await db.generateUserWrappedData(user.id);
        setWrappedData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load season summary.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={{ color: 'red', textAlign: 'center', padding: '50px' }}>Error: {error}</div>;
  
  if (!user) {
    return (
      <div style={styles.container}>
        <h1 style={styles.mainTitle}>Resumen de la Temporada 2025</h1>
        <p style={styles.subtitle}>Inicia sesión para ver tu resumen personalizado.</p>
      </div>
    );
  }

  if (!wrappedData) return <div style={{ textAlign: 'center', padding: '50px' }}>No hay datos de resumen disponibles para tu usuario.</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.mainTitle}>Mi Resumen del 2025</h1>
      <p style={styles.subtitle}>Un vistazo a tu increíble temporada en BoxBox.</p>

      <div style={styles.statsGrid}>
        <StatBlock title={wrappedData.totalPoints.label} value={wrappedData.totalPoints.value} description={wrappedData.totalPoints.description} color="#ffd700"/>
        <StatBlock title={wrappedData.bestGp.label} value={wrappedData.bestGp.value.gpName} description={`Obtuviste ${wrappedData.bestGp.value.points} puntos. ¡Tu mejor actuación!`} color="#c0c0c0"/>
        <StatBlock title={wrappedData.favoriteDriver.label} value={wrappedData.favoriteDriver.value} description={wrappedData.favoriteDriver.description} color="#cd7f32"/>
        <StatBlock title={wrappedData.nemesisDriver.label} value={wrappedData.nemesisDriver.value} description={wrappedData.nemesisDriver.description} color="#ff4136"/>
        <StatBlock title={wrappedData.polePositionHits.label} value={wrappedData.polePositionHits.value} description={wrappedData.polePositionHits.description} color="#6a0dad"/>
        <StatBlock title={wrappedData.podiumHits.label} value={wrappedData.podiumHits.value} description={wrappedData.podiumHits.description} color="#00bfff"/>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    textAlign: 'center',
    padding: '20px',
    color: 'white',
    maxWidth: '900px',
    margin: 'auto',
    paddingBottom: '60px',
  },
  mainTitle: {
    fontSize: 'clamp(2.5rem, 8vw, 4rem)',
    color: '#ffd700',
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: 'clamp(1rem, 4vw, 1.25rem)',
    color: '#ccc',
    marginBottom: '40px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '50px',
  },
  statBlock: {
    backgroundColor: '#1e1e1e',
    padding: '25px',
    borderRadius: '8px',
    textAlign: 'left',
    borderLeftWidth: '4px',
    borderLeftStyle: 'solid',
  },
  statBlockTitle: {
    fontSize: '1rem',
    color: '#aaa',
    textTransform: 'uppercase',
    marginBottom: '15px',
    fontWeight: '600',
  },
  statBlockValue: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '10px',
    lineHeight: 1.1,
  },
  statBlockDescription: {
    fontSize: '0.9rem',
    color: '#bbb',
    lineHeight: 1.5,
  },
};

export default SeasonWrappedPage;
