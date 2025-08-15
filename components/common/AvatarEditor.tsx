
import React from 'react';
import { Avatar as AvatarType } from '../../types';
import Avatar from './Avatar';

interface AvatarEditorProps {
    avatar: AvatarType;
    onAvatarChange: (newAvatar: AvatarType) => void;
}

const AvatarEditor: React.FC<AvatarEditorProps> = ({ avatar, onAvatarChange }) => {
    
    const setAvatar = (updater: (prev: AvatarType) => AvatarType) => {
        onAvatarChange(updater(avatar));
    };
    
    const OptionButton: React.FC<{
        label: string; onClick: () => void; isActive: boolean;
    }> = ({ label, onClick, isActive }) => (
        <button type="button" onClick={onClick} className={`px-3 py-1.5 text-sm rounded-full transition-colors capitalize whitespace-nowrap ${isActive ? 'bg-[var(--accent-red)] text-white font-semibold' : 'bg-[var(--background-light)] hover:bg-[var(--border-color)]'}`}>
            {label}
        </button>
    );

    return (
        <div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Diseña tu Casco de Piloto</h3>
            <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
                <Avatar avatar={avatar} className="w-40 h-40 flex-shrink-0" />
                <div className="space-y-6 w-full">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Colores</label>
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="text-center"><label className="block text-xs text-[var(--text-secondary)]">Piel</label><input type="color" value={avatar.skinColor} onChange={(e) => setAvatar(a => ({ ...a, skinColor: e.target.value }))} className="mt-1 w-16 h-8 bg-transparent border-none cursor-pointer p-0" /></div>
                            <div className="text-center"><label className="block text-xs text-[var(--text-secondary)]">Primario</label><input type="color" value={avatar.color} onChange={(e) => setAvatar(a => ({ ...a, color: e.target.value }))} className="mt-1 w-16 h-8 bg-transparent border-none cursor-pointer p-0" /></div>
                            <div className="text-center"><label className="block text-xs text-[var(--text-secondary)]">Acento</label><input type="color" value={avatar.secondaryColor} onChange={(e) => setAvatar(a => ({ ...a, secondaryColor: e.target.value }))} className="mt-1 w-16 h-8 bg-transparent border-none cursor-pointer p-0" /></div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Diseño del Casco</label>
                        <div className="flex flex-wrap gap-2">{(['none', 'stripes', 'halftone', 'checkers', 'flames', 'carbon'] as const).map(p => (<OptionButton key={p} label={p} onClick={() => setAvatar(a => ({ ...a, pattern: p }))} isActive={avatar.pattern === p} />))}</div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Ojos</label>
                        <div className="flex flex-wrap gap-2">{(['normal', 'wink', 'laser', 'chequered', 'drs', 'pitstop', 'determined', 'star', 'goggles'] as const).map(e => (<OptionButton key={e} label={e} onClick={() => setAvatar(a => ({ ...a, eyes: e }))} isActive={avatar.eyes === e} />))}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AvatarEditor;
