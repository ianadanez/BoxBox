
import React, { useState } from 'react';
import { APP_NAME } from '../constants';

const Footer: React.FC = () => {
    const [modalContent, setModalContent] = useState<'privacy' | 'terms' | null>(null);

    const Modal: React.FC<{ title: string; children: React.ReactNode; onClose: () => void }> = ({ title, children, onClose }) => (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[var(--background-medium)] p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold f1-red-text">{title}</h2>
                    <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white text-2xl">&times;</button>
                </div>
                <div className="text-[var(--text-secondary)] space-y-4 text-sm leading-relaxed">
                    {children}
                </div>
            </div>
        </div>
    );

    return (
        <footer className="bg-[var(--background-medium)] border-t border-[var(--border-color)] py-8 mt-12">
            <div className="container mx-auto px-4 text-center">
                <p className="text-[var(--text-primary)] font-bold mb-4">&copy; {new Date().getFullYear()} {APP_NAME}.</p>
                
                <div className="flex flex-wrap justify-center gap-6 text-sm text-[var(--text-secondary)]">
                    <button onClick={() => setModalContent('privacy')} className="hover:text-[var(--accent-red)] transition-colors">Política de Privacidad</button>
                    <button onClick={() => setModalContent('terms')} className="hover:text-[var(--accent-red)] transition-colors">Términos y Condiciones</button>
                </div>
                
                <p className="text-xs text-[var(--text-secondary)] mt-6 max-w-2xl mx-auto opacity-60">
                    BoxBox no está asociado oficialmente con la Fórmula 1, FIA o ninguna escudería. Todas las marcas registradas pertenecen a sus respectivos dueños. Este es un juego de fans para fans.
                </p>
            </div>

            {modalContent === 'privacy' && (
                <Modal title="Política de Privacidad" onClose={() => setModalContent(null)}>
                    <p>En BoxBox, respetamos tu privacidad. Esta política describe cómo manejamos tu información:</p>
                    <ul className="list-disc pl-5">
                        <li><strong>Datos que recopilamos:</strong> Tu correo electrónico (solo para autenticación), nombre de usuario, y tus predicciones.</li>
                        <li><strong>Uso de datos:</strong> Solo usamos tu información para gestionar el juego, calcular puntuaciones y mostrar la tabla de posiciones.</li>
                        <li><strong>Publicidad:</strong> Utilizamos Google AdSense para mostrar anuncios. Google puede utilizar cookies para servir anuncios basados en tus visitas anteriores a este u otros sitios web.</li>
                        <li><strong>Terceros:</strong> No vendemos ni compartimos tus datos personales con terceros no relacionados con el funcionamiento técnico de la app.</li>
                    </ul>
                </Modal>
            )}

            {modalContent === 'terms' && (
                <Modal title="Términos y Condiciones" onClose={() => setModalContent(null)}>
                    <p>Al usar BoxBox, aceptas lo siguiente:</p>
                    <ul className="list-disc pl-5">
                        <li><strong>Uso Justo:</strong> Está prohibido intentar manipular los resultados, hackear la plataforma o acosar a otros usuarios.</li>
                        <li><strong>Contenido:</strong> Eres responsable de tu nombre de usuario. Nombres ofensivos serán eliminados.</li>
                        <li><strong>Sin Garantías:</strong> El servicio se ofrece "tal cual". No garantizamos disponibilidad continua ni ausencia de errores.</li>
                        <li><strong>Modificaciones:</strong> Nos reservamos el derecho de modificar las reglas de puntuación o estos términos en cualquier momento.</li>
                    </ul>
                </Modal>
            )}
        </footer>
    );
};

export default Footer;
