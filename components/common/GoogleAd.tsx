import React, { useEffect } from 'react';

// Extend the Window interface to include the adsbygoogle property
declare global {
  interface Window {
    adsbygoogle?: {
      push: (params: {}) => void;
    };
  }
}

interface GoogleAdProps {
  slot: string;
  className?: string;
}

const GoogleAd: React.FC<GoogleAdProps> = ({ slot, className }) => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div className={`google-ad-container ${className} bg-[var(--background-light)] min-h-[250px] flex items-center justify-center text-center text-[var(--text-secondary)] rounded-lg`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-8633324524816017" // Your publisher ID
        data-ad-slot={slot} // The ad slot ID
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

export default GoogleAd;
