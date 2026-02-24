import React, { useState } from 'react';
import './Sidebar.css';
import { User } from '../api/api';

type AppState =
  | 'auth' | 'genre-questionnaire' | 'room-selection' | 'room-waiting'
  | 'swiping' | 'match' | 'admin' | 'match-links' | 'football'
  | 'split-subscribe' | 'outfit-math' | 'gift-genius' | 'ai-mediator'
  | 'vibe' | 'movie-roulette' | 'evening-recipe';

interface SidebarProps {
  currentState: AppState;
  onNavigate: (state: AppState) => void;
  onLogout: () => void;
  onLibrary: () => void;
  onProfile: () => void;
  user: User | null;
}

interface NavItem {
  state: AppState;
  label: string;
  icon: string;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Фильмы',
    items: [
      { state: 'room-selection',  label: 'Главная',        icon: '🏠' },
      { state: 'vibe',            label: 'По вайбу',       icon: '✨' },
      { state: 'movie-roulette',  label: 'Рулетка',        icon: '🎲' },
      { state: 'evening-recipe',  label: 'Рецепт вечера',  icon: '🌙' },
    ],
  },
  {
    title: 'Спорт',
    items: [
      { state: 'football', label: 'Футбол', icon: '⚽' },
    ],
  },
  {
    title: 'Инструменты',
    items: [
      { state: 'split-subscribe', label: 'Split & Subscribe', icon: '💳' },
      { state: 'outfit-math',     label: 'OutfitMath',        icon: '👗' },
      { state: 'gift-genius',     label: 'GiftGenius',        icon: '🎁' },
      { state: 'ai-mediator',     label: 'AI-Медиатор',       icon: '🤝' },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentState,
  onNavigate,
  onLogout,
  onLibrary,
  onProfile,
  user,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const inRoom = ['room-waiting', 'swiping', 'match-links'].includes(currentState);

  const handleNav = (state: AppState) => {
    onNavigate(state);
    setMobileOpen(false);
  };

  const avatarLetter = user?.username?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <>
      {/* Mobile top bar */}
      <header className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Открыть меню"
        >
          ☰
        </button>
        <span className="mobile-topbar-logo">🎬 KinoSwipe</span>
        <div className="mobile-topbar-avatar" onClick={user?.email ? onProfile : undefined}>
          {avatarLetter}
        </div>
      </header>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo" onClick={() => handleNav('room-selection')}>
          <span className="sidebar-logo-icon">🎬</span>
          <span className="sidebar-logo-text">KinoSwipe</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="sidebar-group">
              <span className="sidebar-group-title">{group.title}</span>
              {group.items.map((item) => (
                <button
                  key={item.state}
                  className={`sidebar-nav-item ${currentState === item.state ? 'active' : ''}`}
                  onClick={() => handleNav(item.state)}
                >
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  <span className="sidebar-nav-label">{item.label}</span>
                  {currentState === item.state && (
                    <span className="sidebar-nav-indicator" />
                  )}
                </button>
              ))}
            </div>
          ))}

          {/* Library */}
          <div className="sidebar-group">
            <span className="sidebar-group-title">Библиотека</span>
            <button className="sidebar-nav-item" onClick={() => { onLibrary(); setMobileOpen(false); }}>
              <span className="sidebar-nav-icon">📚</span>
              <span className="sidebar-nav-label">Все фильмы</span>
            </button>
          </div>

          {/* Admin */}
          {user?.user_type === 'admin' && (
            <div className="sidebar-group">
              <button
                className={`sidebar-nav-item sidebar-nav-item--admin ${currentState === 'admin' ? 'active' : ''}`}
                onClick={() => handleNav('admin')}
              >
                <span className="sidebar-nav-icon">🔐</span>
                <span className="sidebar-nav-label">Админ-панель</span>
              </button>
            </div>
          )}
        </nav>

        {/* Footer: user + logout */}
        <div className="sidebar-footer">
          {user && (
            <button
              className="sidebar-user"
              onClick={user.email ? () => { onProfile(); setMobileOpen(false); } : undefined}
              style={{ cursor: user.email ? 'pointer' : 'default' }}
            >
              <div className="sidebar-user-avatar">{avatarLetter}</div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user.username}</span>
                <span className="sidebar-user-role">
                  {user.user_type === 'admin' ? 'Администратор' : 'Пользователь'}
                </span>
              </div>
            </button>
          )}
          <button className="sidebar-logout" onClick={onLogout}>
            <span>🚪</span>
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-nav-item ${currentState === 'room-selection' ? 'active' : ''}`}
          onClick={() => onNavigate('room-selection')}
        >
          <span>🏠</span>
          <span>Главная</span>
        </button>
        <button
          className={`mobile-nav-item ${currentState === 'vibe' ? 'active' : ''}`}
          onClick={() => onNavigate('vibe')}
        >
          <span>✨</span>
          <span>По вайбу</span>
        </button>
        <button
          className={`mobile-nav-item ${currentState === 'football' ? 'active' : ''}`}
          onClick={() => onNavigate('football')}
        >
          <span>⚽</span>
          <span>Футбол</span>
        </button>
        <button className="mobile-nav-item" onClick={() => setMobileOpen(true)}>
          <span>☰</span>
          <span>Ещё</span>
        </button>
      </nav>
    </>
  );
};
