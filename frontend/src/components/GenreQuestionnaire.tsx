import React, { useState } from 'react';
import './GenreQuestionnaire.css';

interface GenreQuestionnaireProps {
  onComplete: (selectedGenres: string[]) => void;
}

const AVAILABLE_GENRES = [
  { id: 'action', name: 'Боевик', icon: '💥' },
  { id: 'comedy', name: 'Комедия', icon: '😂' },
  { id: 'drama', name: 'Драма', icon: '🎭' },
  { id: 'horror', name: 'Ужасы', icon: '👻' },
  { id: 'thriller', name: 'Триллер', icon: '🔪' },
  { id: 'romance', name: 'Романтика', icon: '💕' },
  { id: 'sci-fi', name: 'Фантастика', icon: '🚀' },
  { id: 'fantasy', name: 'Фэнтези', icon: '🧙' },
  { id: 'adventure', name: 'Приключения', icon: '🗺️' },
  { id: 'crime', name: 'Криминал', icon: '🔫' },
  { id: 'mystery', name: 'Детектив', icon: '🔍' },
  { id: 'animation', name: 'Анимация', icon: '🎨' },
  { id: 'documentary', name: 'Документалистика', icon: '📹' },
  { id: 'family', name: 'Семейное', icon: '👨‍👩‍👧‍👦' },
  { id: 'war', name: 'Военное', icon: '⚔️' },
];

export const GenreQuestionnaire: React.FC<GenreQuestionnaireProps> = ({ onComplete }) => {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [step, setStep] = useState(1);

  const handleGenreToggle = (genreId: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genreId)) {
        return prev.filter(id => id !== genreId);
      } else {
        return [...prev, genreId];
      }
    });
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      onComplete(selectedGenres);
    }
  };

  const handleSkip = () => {
    onComplete([]);
  };

  const genresPerPage = 8;
  const startIndex = (step - 1) * genresPerPage;
  const endIndex = startIndex + genresPerPage;
  const currentGenres = AVAILABLE_GENRES.slice(startIndex, endIndex);

  return (
    <div className="genre-questionnaire">
      <div className="questionnaire-content">
        <div className="questionnaire-header">
          <h1>🎬 Выберите любимые жанры</h1>
          <p>Это поможет нам подобрать фильмы, которые вам точно понравятся</p>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
          <span className="progress-text">Шаг {step} из 2</span>
        </div>

        <div className="genres-grid">
          {currentGenres.map((genre) => {
            const isSelected = selectedGenres.includes(genre.id);
            return (
              <button
                key={genre.id}
                className={`genre-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleGenreToggle(genre.id)}
              >
                <span className="genre-icon">{genre.icon}</span>
                <span className="genre-name">{genre.name}</span>
                {isSelected && <span className="check-mark">✓</span>}
              </button>
            );
          })}
        </div>

        <div className="questionnaire-footer">
          <button onClick={handleSkip} className="skip-button">
            Пропустить
          </button>
          <button 
            onClick={handleNext} 
            className="next-button"
            disabled={selectedGenres.length === 0 && step === 2}
          >
            {step < 2 ? 'Далее' : 'Готово'}
          </button>
        </div>

        {selectedGenres.length > 0 && (
          <div className="selected-count">
            Выбрано: {selectedGenres.length} жанр{selectedGenres.length > 1 ? 'ов' : ''}
          </div>
        )}
      </div>
    </div>
  );
};
