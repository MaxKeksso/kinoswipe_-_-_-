import React, { useState } from 'react';
import './AuthForm.css';

interface AuthFormProps {
  onLogin: (username: string) => void;
  onUserLogin: (email: string, password: string) => void;
  onRegister: (username: string, email: string, password: string, phone?: string) => void;
  onAdminLogin: (email: string, password: string) => void;
  loading: boolean;
  error: string;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  onLogin,
  onUserLogin,
  onRegister,
  onAdminLogin,
  loading,
  error,
}) => {
  const [mode, setMode] = useState<'quick' | 'login' | 'register' | 'admin'>('quick');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  const handleQuickLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username.trim());
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && email.trim() && password.trim()) {
      onRegister(username.trim(), email.trim(), password, phone.trim() || undefined);
    }
  };

  const handleUserLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && password.trim()) {
      onUserLogin(email.trim(), password);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && password.trim()) {
      onAdminLogin(email.trim(), password);
    }
  };

  return (
    <div className="auth-form-container">
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
        <button
          className={`auth-tab ${mode === 'admin' ? 'active' : ''}`}
          onClick={() => setMode('admin')}
        >
          Админ
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {mode === 'quick' && (
        <form onSubmit={handleQuickLogin} className="auth-form">
          <input
            type="text"
            placeholder="Твоё имя"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            className="input-field"
            required
          />
          <button type="submit" disabled={loading || !username.trim()} className="primary-button">
            {loading ? 'Загрузка...' : 'Войти'}
          </button>
        </form>
      )}

      {mode === 'login' && (
        <form onSubmit={handleUserLogin} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="input-field"
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="input-field"
            required
          />
          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="primary-button"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
          <p className="auth-hint">
            Нет аккаунта? <button type="button" onClick={() => setMode('register')} className="link-button">Зарегистрируйтесь</button>
          </p>
        </form>
      )}

      {mode === 'register' && (
        <form onSubmit={handleRegister} className="auth-form">
          <input
            type="text"
            placeholder="Имя пользователя"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            className="input-field"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="input-field"
            required
          />
          <input
            type="password"
            placeholder="Пароль (минимум 6 символов)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="input-field"
            required
            minLength={6}
          />
          <input
            type="tel"
            placeholder="Телефон (необязательно)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
            className="input-field"
          />
          <button
            type="submit"
            disabled={loading || !username.trim() || !email.trim() || !password.trim()}
            className="primary-button"
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
          <p className="auth-hint">
            Уже есть аккаунт? <button type="button" onClick={() => setMode('login')} className="link-button">Войдите</button>
          </p>
        </form>
      )}

      {mode === 'admin' && (
        <form onSubmit={handleAdminLogin} className="auth-form">
          <input
            type="email"
            placeholder="Email админа"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="input-field"
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="input-field"
            required
          />
          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="primary-button admin-button"
          >
            {loading ? 'Вход...' : 'Войти как админ'}
          </button>
        </form>
      )}
    </div>
  );
};
