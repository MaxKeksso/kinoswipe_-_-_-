import React from 'react';
import { Premiere } from '../api/api';
import './PremiereSidebar.css';

interface PremiereSidebarProps {
  premieres: Premiere[];
  position: 'left' | 'right';
}

export const PremiereSidebar: React.FC<PremiereSidebarProps> = ({ premieres, position }) => {
  const list = Array.isArray(premieres) ? premieres : [];
  const filteredPremieres = list.filter(p => p.position === position && p.is_active);

  if (filteredPremieres.length === 0) {
    return null;
  }

  return (
    <div className={`premiere-sidebar premiere-sidebar-${position}`}>
      <h3 className="premiere-sidebar-title">🎬 Новые премьеры</h3>
      <div className="premiere-list">
        {filteredPremieres.map((premiere) => (
          <div key={premiere.id} className="premiere-card">
            {premiere.poster_url && (
              <img
                src={premiere.poster_url}
                alt={premiere.title}
                className="premiere-poster"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            )}
            <div className="premiere-info">
              <h4 className="premiere-title">{premiere.title}</h4>
              {premiere.description && (
                <p className="premiere-description">{premiere.description}</p>
              )}
              {premiere.release_date && (
                <span className="premiere-date">
                  📅 {new Date(premiere.release_date).toLocaleDateString('ru-RU')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
