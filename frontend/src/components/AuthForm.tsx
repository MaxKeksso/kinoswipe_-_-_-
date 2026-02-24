import React, { useState } from 'react';
import './AuthForm.css';

interface AuthFormProps {
  onLogin: (username: string) => void;
  onUserLogin: (email: string, password: string) => void;
  onRegister: (username: string, email: string, password: string, phone?: string) => void;
  loading: boolean;
  error: string;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  onLogin,
  onUserLogin,
  onRegister,
  loading,
  error,
}) => {
  const [mode, setMode] = useState<'quick' | 'login' | 'register'>('quick');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  const handleQuickLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) onLogin(username.trim());
  };

  const handleUserLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && password.trim()) onUserLogin(email.trim(), password);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && email.trim() && password.trim())
      onRegister(username.trim(), email.trim(), password, phone.trim() || undefined);
  };

  return (
    <div className="auth-form-container">
      {/* Mode tabs */}
      <div className="auth-tabs">
        <button
          className={`auth-tab ${mode === 'quick' ? 'active' : ''}`}
          onClick={() => setMode('quick')}
        >
          Быстрый вход
        </button>
        <button
          className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
          onClick={() => setMode('login')}
        >
          Вход
        </button>
        <button
          className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
          onClick={() => setMode('register')}
        >
          Регистрация
        </button>
      </div>

      {/* Error */}
      {error && <div className="auth-error">{error}</div>}

      {/* Quick login */}
      {mode === 'quick' && (
        <form onSubmit={handleQuickLogin} className="auth-form">
          <div className="auth-field">
            <label className="auth-field-label">Имя</label>
            <input
              type="text"
              placeholder="Как тебя зовут?"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="auth-submit"
            disabled={loading || !username.trim()}
          >
            {loading ? 'Загрузка...' : 'Войти без регистрации →'}
          </button>
          <p className="auth-quick-info">
            Без пароля и email — просто введи имя. Прогресс сохранится в браузере.
          </p>
        </form>
      )}

      {/* Email login */}
      {mode === 'login' && (
        <form onSubmit={handleUserLogin} className="auth-form">
          <div className="auth-field">
            <label className="auth-field-label">Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              autoFocus
            />
          </div>
          <div className="auth-field">
            <label className="auth-field-label">Пароль</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <button
            type="submit"
            className="auth-submit"
            disabled={loading || !email.trim() || !password.trim()}
          >
            {loading ? 'Вход...' : 'Войти →'}
          </button>
          <p className="auth-hint">
            Нет аккаунта?
            <button type="button" onClick={() => setMode('register')} className="link-button">
              Зарегистрируйтесь
            </button>
          </p>
        </form>
      )}

      {/* Register */}
      {mode === 'register' && (
        <form onSubmit={handleRegister} className="auth-form">
          <div className="auth-field">
            <label className="auth-field-label">Имя пользователя</label>
            <input
              type="text"
              placeholder="kinolover42"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
              autoFocus
            />
          </div>
          <div className="auth-field">
            <label className="auth-field-label">Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="auth-field">
            <label className="auth-field-label">Пароль</label>
            <input
              type="password"
              placeholder="Минимум 6 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              minLength={6}
            />
          </div>
          <div className="auth-field">
            <label className="auth-field-label">Телефон (необязательно)</label>
            <input
              type="tel"
              placeholder="+7 (999) 123-45-67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className="auth-submit"
            disabled={loading || !username.trim() || !email.trim() || !password.trim()}
          >
            {loading ? 'Регистрация...' : 'Создать аккаунт →'}
          </button>
          <p className="auth-hint">
            Уже есть аккаунт?
            <button type="button" onClick={() => setMode('login')} className="link-button">
              Войдите
            </button>
          </p>
        </form>
      )}
    </div>
  );
};
