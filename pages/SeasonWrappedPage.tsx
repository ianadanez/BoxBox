import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/db';
import { SeasonWrappedData } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Avatar from '../components/common/Avatar';

const StatBlock: React.FC<{ title: string; value: string | number; description: string; color: string; }> = ({ title, value, description, color }) => (
  <div style={{ ...styles.statBlock, borderLeft: `4px solid ${color}` }}>
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
  const cardRef = useRef<HTMLDivElement | null>(null);

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

  // Export functions desactivados temporalmente
  const handleDownload = () => setError('Exportar imagen está deshabilitado por ahora.');
  const handleCopyImage = () => setError('Copiar imagen está deshabilitado por ahora.');
  const handleShare = () => setError('Compartir está deshabilitado por ahora.');

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={{ color: 'red', textAlign: 'center', padding: '50px' }}>Error: {error}</div>;

  if (!user) {
    return (
      <div style={styles.container}>
        <h1 style={styles.mainTitle}>Resumen de la temporada</h1>
        <p style={styles.subtitle}>Inicia sesión para ver tu resumen personalizado.</p>
      </div>
    );
  }

  if (!wrappedData) return <div style={{ textAlign: 'center', padding: '50px' }}>No hay datos de resumen disponibles para tu usuario.</div>;

  return (
    <div style={styles.container}>
      <div ref={cardRef} style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoRow}>
            <img src="https://i.imgur.com/VfzbTsC.png" alt="BoxBox Logo" style={styles.logo} />
            <span style={styles.badge}>WRAPPED</span>
          </div>
          <div style={styles.titleRow}>
            <div style={styles.avatarWrapper}>
              <Avatar avatar={user.avatar} className="w-16 h-16 sm:w-20 sm:h-20" />
            </div>
            <div>
              <p style={styles.kicker}>Mi resumen BoxBox</p>
              <h1 style={styles.mainTitle}>{user.username}</h1>
              <p style={styles.subtitle}>Tu temporada, en una sola imagen lista para compartir.</p>
            </div>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <StatBlock title={wrappedData.totalPoints.label} value={wrappedData.totalPoints.value} description={wrappedData.totalPoints.description} color="#ffd700" />
          <StatBlock title={wrappedData.bestGp.label} value={wrappedData.bestGp.value.gpName} description={`Obtuviste ${wrappedData.bestGp.value.points} puntos. ¡Tu mejor actuación!`} color="#c0c0c0" />
          <StatBlock title={wrappedData.favoriteDriver.label} value={wrappedData.favoriteDriver.value} description={wrappedData.favoriteDriver.description} color="#cd7f32" />
          <StatBlock title={wrappedData.nemesisDriver.label} value={wrappedData.nemesisDriver.value} description={wrappedData.nemesisDriver.description} color="#ff4136" />
          <StatBlock title={wrappedData.polePositionHits.label} value={wrappedData.polePositionHits.value} description={wrappedData.polePositionHits.description} color="#6a0dad" />
          <StatBlock title={wrappedData.podiumHits.label} value={wrappedData.podiumHits.value} description={wrappedData.podiumHits.description} color="#00bfff" />
        </div>
      </div>

      <div style={styles.actions}>
        <div style={styles.actionsRow}>
          <button onClick={handleDownload} disabled style={{ ...styles.actionButton, opacity: 0.6, cursor: 'not-allowed' }}>
            Exportar imagen (deshabilitado)
          </button>
          <button onClick={handleCopyImage} disabled style={{ ...styles.secondaryButton, opacity: 0.6, cursor: 'not-allowed' }}>
            Copiar imagen (deshabilitado)
          </button>
          <button onClick={handleShare} disabled style={{ ...styles.secondaryButton, opacity: 0.6, cursor: 'not-allowed' }}>
            Compartir (deshabilitado)
          </button>
        </div>
        <p style={styles.helperText}>Exportar/compartir está desactivado temporalmente.</p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    textAlign: 'center',
    padding: '20px',
    color: 'white',
    maxWidth: '1000px',
    margin: 'auto',
    paddingBottom: '60px',
  },
  card: {
    background: 'linear-gradient(135deg, #0f0f1f 0%, #12122a 40%, #0d0d16 100%)',
    borderRadius: '18px',
    padding: '28px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
    border: '1px solid rgba(255,255,255,0.08)',
    width: '100%',
    maxWidth: '1080px',
    minHeight: '1400px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
    textAlign: 'left',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    height: '40px',
  },
  badge: {
    fontSize: '0.85rem',
    letterSpacing: '2px',
    color: '#ffcb52',
    background: 'rgba(255,203,82,0.12)',
    padding: '6px 12px',
    borderRadius: '999px',
    border: '1px solid rgba(255,203,82,0.3)',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  avatarWrapper: {
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '8px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  kicker: {
    textTransform: 'uppercase',
    letterSpacing: '2px',
    color: '#8fd6ff',
    fontSize: '0.85rem',
    margin: 0,
  },
  mainTitle: {
    fontSize: 'clamp(2.4rem, 6vw, 3.6rem)',
    color: '#ffd700',
    margin: '2px 0',
  },
  subtitle: {
    fontSize: 'clamp(1rem, 3vw, 1.2rem)',
    color: '#d0d0e0',
    margin: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '0px',
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
  actions: {
    marginTop: '18px',
  },
  actionsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    justifyContent: 'center',
  },
  actionButton: {
    background: 'linear-gradient(135deg, #ff2d55, #ff6a00)',
    border: 'none',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 12px 30px rgba(255,106,0,0.25)',
  },
  secondaryButton: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  helperText: {
    marginTop: '8px',
    color: '#bbb',
    fontSize: '0.9rem',
  },
};

export default SeasonWrappedPage;
