import axios from 'axios';

// Используем относительный путь - nginx будет проксировать запросы
const API_URL = process.env.REACT_APP_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавление заголовка X-User-ID к каждому запросу
api.interceptors.request.use((config) => {
  const userId = localStorage.getItem('userId');
  if (userId && config.headers) {
    config.headers['X-User-ID'] = userId;
  }
  return config;
});

// Типы данных
export interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  user_type: string;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  code: string;
  host_id: string;
  status: string;
  filter_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Movie {
  id: string;
  title: string;
  title_en?: string;
  poster_url: string;
  imdb_rating?: number;
  kp_rating?: number;
  genre: string;
  year: number;
  duration: number;
  description?: string;
  trailer_url?: string;
  streaming_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Swipe {
  id: string;
  user_id: string;
  room_id: string;
  movie_id: string;
  direction: 'left' | 'right';
  created_at: string;
}

export interface Match {
  id: string;
  room_id: string;
  movie_id: string;
  created_at: string;
  movie?: Movie;
  users?: User[];
}

export interface MatchNotification {
  type: string;
  match: Match & {
    movie: Movie;
    users: User[];
  };
  timestamp: string;
}

export interface Premiere {
  id: string;
  movie_id?: string;
  title: string;
  description?: string;
  poster_url: string;
  release_date?: string;
  is_active: boolean;
  position: 'left' | 'right';
  created_at: string;
  updated_at: string;
  movie?: Movie;
}

export interface MatchLink {
  id: string;
  match_id: string;
  platform: string;
  url: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// API методы
export const apiService = {
  // Пользователи
  createUser: async (username: string, email?: string, phone?: string): Promise<User> => {
    const response = await api.post<User>('/users', { username, email, phone });
    return response.data;
  },

  getUser: async (id: string): Promise<User> => {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  updateUser: async (id: string, data: { username?: string; avatar_url?: string }): Promise<User> => {
    const response = await api.put<User>(`/users/${id}`, data);
    return response.data;
  },

  // Комнаты
  createRoom: async (filterId?: string): Promise<Room> => {
    const response = await api.post<Room>('/rooms', { filter_id: filterId || null });
    return response.data;
  },

  getAllRooms: async (status?: string, limit?: number): Promise<Room[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());
    const response = await api.get<Room[]>(`/rooms?${params.toString()}`);
    return response.data;
  },

  getRoomByCode: async (code: string): Promise<Room> => {
    const response = await api.get<Room>(`/rooms/code/${code}`);
    return response.data;
  },

  joinRoom: async (code: string): Promise<{ room: Room; members: User[] } | Room> => {
    const response = await api.post<{ room: Room; members: User[] } | Room>(`/rooms/code/${encodeURIComponent(code)}/join`, { code });
    return response.data;
  },

  startRoom: async (roomId: string): Promise<Room> => {
    const response = await api.post<Room>(`/rooms/${roomId}/start`, {});
    return response.data;
  },

  getRoomMembers: async (roomId: string): Promise<User[]> => {
    const response = await api.get<User[]>(`/rooms/${roomId}/members`);
    return response.data;
  },

  // Фильмы
  getRoomMovies: async (roomId: string): Promise<Movie[]> => {
    const response = await api.get<Movie[]>(`/rooms/${roomId}/movies`);
    return response.data;
  },

  getMovie: async (id: string): Promise<Movie> => {
    const response = await api.get<Movie>(`/movies/${id}`);
    return response.data;
  },

  getAllMovies: async (): Promise<Movie[]> => {
    const response = await api.get<Movie[]>('/movies');
    return response.data;
  },

  createMovie: async (movie: Partial<Movie>): Promise<Movie> => {
    const response = await api.post<Movie>('/movies', movie);
    return response.data;
  },

  updateMovie: async (id: string, movie: Partial<Movie>): Promise<Movie> => {
    const response = await api.put<Movie>(`/movies/${id}`, movie);
    return response.data;
  },

  // Свайпы
  createSwipe: async (roomId: string, movieId: string, direction: 'left' | 'right'): Promise<Swipe | { swipe: Swipe; match?: Match }> => {
    const response = await api.post<Swipe | { swipe: Swipe; match?: Match }>(`/rooms/${roomId}/swipes`, {
      movie_id: movieId,
      direction,
    });
    return response.data;
  },

  undoSwipe: async (roomId: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/rooms/${roomId}/swipes/undo`, {
      room_id: roomId,
    });
    return response.data;
  },

  getUserSwipes: async (roomId: string): Promise<Swipe[]> => {
    const response = await api.get<Swipe[]>(`/rooms/${roomId}/swipes`);
    return response.data;
  },

  // Матчи
  getRoomMatches: async (roomId: string): Promise<Match[]> => {
    const response = await api.get<Match[]>(`/rooms/${roomId}/matches`);
    const data = response.data;
    return Array.isArray(data) ? data : [];
  },

  getMatch: async (id: string): Promise<Match> => {
    const response = await api.get<Match>(`/matches/${id}`);
    return response.data;
  },

  // Авторизация и регистрация
  register: async (username: string, email: string, password: string, phone?: string): Promise<User> => {
    const response = await api.post<User>('/auth/register', { username, email, password, phone });
    return response.data;
  },

  login: async (email: string, password: string): Promise<User> => {
    const response = await api.post<User>('/auth/login', { email, password });
    return response.data;
  },

  // Премьеры
  getPremieres: async (position?: 'left' | 'right'): Promise<Premiere[]> => {
    const params = position ? `?position=${position}` : '';
    const response = await api.get<Premiere[]>(`/premieres${params}`);
    return response.data;
  },

  createPremiere: async (premiere: Partial<Premiere>): Promise<Premiere> => {
    const response = await api.post<Premiere>('/premieres', premiere);
    return response.data;
  },

  updatePremiere: async (id: string, premiere: Partial<Premiere>): Promise<Premiere> => {
    const response = await api.put<Premiere>(`/premieres/${id}`, premiere);
    return response.data;
  },

  deletePremiere: async (id: string): Promise<void> => {
    await api.delete(`/premieres/${id}`);
  },

  // Ссылки для матчей
  getMatchLinks: async (matchId: string): Promise<MatchLink[]> => {
    const response = await api.get<MatchLink[]>(`/matches/${matchId}/links`);
    const data = response.data;
    return Array.isArray(data) ? data : [];
  },

  createMatchLink: async (matchId: string, link: Partial<MatchLink>): Promise<MatchLink> => {
    const response = await api.post<MatchLink>(`/matches/${matchId}/links`, link);
    return response.data;
  },
};

export default api;
