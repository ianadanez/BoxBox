
import React, { useId } from 'react';
import { Avatar as AvatarType } from '../../types';

interface AvatarProps {
  avatar: AvatarType;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ avatar, className = 'w-12 h-12' }) => {
  // Generate a unique ID for this avatar instance to avoid conflicts in SVG defs.
  const uniqueId = useId();

  // Fallback for older user objects that might not have the new properties
  const fullAvatar: AvatarType = {
    skinColor: '#C68642', // Default skin tone
    color: '#6CD3BF',
    pattern: 'none',
    secondaryColor: '#FFFFFF',
    eyes: 'normal',
    ...avatar
  };

  const { color, secondaryColor, skinColor, eyes, pattern } = fullAvatar;

  // Define colors directly to avoid issues with CSS variables on some platforms.
  const eyeColor = 'white';
  const accentRed = '#E10600';
  const accentBlue = '#00D2FF';
  const patternDark = '#18181B';
  const patternLight = '#F4F4F5';
  
  // Unique IDs for patterns and clip paths
  const p_halftone_id = `p_halftone_${uniqueId}`;
  const p_checkers_id = `p_checkers_${uniqueId}`;
  const p_flames_id = `p_flames_${uniqueId}`;
  const p_carbon_id = `p_carbon_${uniqueId}`;
  const p_chequered_eyes_id = `p_chequered_eyes_${uniqueId}`;
  const avatar_clip_id = `avatar_clip_${uniqueId}`;
  const helmet_only_clip_id = `helmet_only_clip_${uniqueId}`;
  
  const getPatternUrl = (p: AvatarType['pattern']) => {
    switch(p) {
        case 'halftone': return `url(#${p_halftone_id})`;
        case 'checkers': return `url(#${p_checkers_id})`;
        case 'flames': return `url(#${p_flames_id})`;
        case 'carbon': return `url(#${p_carbon_id})`;
        default: return '';
    }
  }

  const eyeSvg = {
    normal: <><circle cx="12" cy="14" r="1.5" fill={eyeColor} /><circle cx="20" cy="14" r="1.5" fill={eyeColor} /></>,
    wink: <><path d={`M11 14 Q13 12 15 14`} stroke={eyeColor} strokeWidth="1.5" fill="none" /><circle cx="20" cy="14" r="1.5" fill={eyeColor} /></>,
    laser: <><rect x="10" y="13" width="4" height="2" fill={accentRed} /><rect x="18" y="13" width="4" height="2" fill={accentRed} /></>,
    chequered: <>
      <circle cx="12" cy="14" r="2" fill={`url(#${p_chequered_eyes_id})`} stroke="black" strokeWidth="0.5" />
      <circle cx="20" cy="14" r="2" fill={`url(#${p_chequered_eyes_id})`} stroke="black" strokeWidth="0.5" />
    </>,
    drs: <><rect x="9" y="13.5" width="6" height="1.5" fill={accentBlue} /><rect x="17" y="13.5" width="6" height="1.5" fill={accentBlue} /></>,
    pitstop: <><circle cx="12" cy="14" r="2" fill={accentRed} /><circle cx="20" cy="14" r="2" fill="#52E252" /></>,
    determined: <><path d="M10 13.5 L14 12.5" stroke={eyeColor} strokeWidth="1.5" strokeLinecap="round" /><path d="M22 13.5 L18 12.5" stroke={eyeColor} strokeWidth="1.5" strokeLinecap="round" /><circle cx="12" cy="15" r="1" fill={eyeColor} /><circle cx="20" cy="15" r="1" fill={eyeColor} /></>,
    star: <><path d="M12,12.5 l1.18,2.39 -2.27,-1.48 h2.8 l-2.27,1.48 z" fill={accentBlue} /><path d="M20,12.5 l1.18,2.39 -2.27,-1.48 h2.8 l-2.27,1.48 z" fill={accentBlue} /></>,
    goggles: <><rect x="8" y="12" width="16" height="5" fill="#111" opacity="0.8" rx="2" /><path d="M9,14.5 h5" stroke={accentBlue} strokeWidth="2" strokeLinecap="round" opacity="0.6" /></>,
  };
  
  const helmetWithVisorHolePath = "M16,2 C7.16,2 2,7.16 2,16 L2,22 C2,26.42 5.58,30 10,30 L22,30 C26.42,30 30,26.42 30,22 L30,16 C30,7.16 24.84,2 16,2 Z M8,15 C8,13 24,13 24,15 L24,22 C24,24 8,24 8,22 Z";
  const helmetOuterPath = "M16,2 C7.16,2 2,7.16 2,16 L2,22 C2,26.42 5.58,30 10,30 L22,30 C26.42,30 30,26.42 30,22 L30,16 C30,7.16 24.84,2 16,2 Z";

  return (
    <div className={`relative rounded-full overflow-hidden ${className}`}>
      <svg viewBox="0 0 32 32" className="w-full h-full" aria-label={`Avatar de usuario`}>
        <defs>
            {/* Unique pattern for chequered eyes */}
            <pattern id={p_chequered_eyes_id} patternUnits="userSpaceOnUse" width="4" height="4">
                <rect width="2" height="2" fill={patternDark} />
                <rect x="2" y="2" width="2" height="2" fill={patternDark} />
                <rect y="2" width="2" height="2" fill={patternLight} />
                <rect x="2" width="2" height="2" fill={patternLight} />
            </pattern>
        
            {/* Helmet patterns with direct color injection and unique IDs */}
            <pattern id={p_halftone_id} patternUnits="userSpaceOnUse" width="6" height="6">
                <circle cx="3" cy="3" r="1.3" fill={secondaryColor} opacity="0.8"/>
            </pattern>
            <pattern id={p_checkers_id} patternUnits="userSpaceOnUse" width="10" height="10">
                <rect width="5" height="5" fill={secondaryColor} opacity="0.7" />
                <rect x="5" y="5" width="5" height="5" fill={secondaryColor} opacity="0.7" />
            </pattern>
            <pattern id={p_flames_id} patternUnits="userSpaceOnUse" width="32" height="20" >
                <path d="M-5 20 Q 5 10, 10 0 Q 15 10, 25 20" fill={secondaryColor} opacity="0.7"/>
                <path d="M15 20 Q 25 10, 30 0 Q 35 10, 45 20" fill={secondaryColor} opacity="0.7"/>
            </pattern>
            <pattern id={p_carbon_id} patternUnits="userSpaceOnUse" width="6" height="6">
                <path d="M 0 0 L 6 6 M -1.5 1.5 L 1.5 4.5 M 4.5 -1.5 L 7.5 1.5" stroke={secondaryColor} strokeWidth="1" opacity="0.4"/>
                <path d="M 6 0 L 0 6 M 4.5 7.5 L 7.5 4.5 M -1.5 4.5 L 1.5 7.5" stroke={secondaryColor} strokeWidth="1" opacity="0.4"/>
            </pattern>
            
            <clipPath id={avatar_clip_id}>
                <path d={helmetOuterPath} />
            </clipPath>
            <clipPath id={helmet_only_clip_id}>
                 <path d={helmetWithVisorHolePath} fillRule="evenodd" />
            </clipPath>
        </defs>

        <g clipPath={`url(#${avatar_clip_id})`}>
            <rect x="0" y="0" width="32" height="32" fill={skinColor} />
            
            <g transform="translate(0, 5)">
                {eyeSvg[eyes]}
            </g>
            
            <path
                fillRule="evenodd"
                d={helmetWithVisorHolePath}
                fill={color}
            />
            
            {pattern !== 'none' && (
              <g clipPath={`url(#${helmet_only_clip_id})`}>
                {pattern === 'stripes' ? (
                  <rect x="14" y="0" width="4" height="32" fill={secondaryColor} />
                ) : (
                  <rect x="0" y="0" width="32" height="32" fill={getPatternUrl(pattern)} />
                )}
              </g>
            )}
        </g>
      </svg>
    </div>
  );
};

export default Avatar;
