import axios from 'axios';

// Используем относительный путь - nginx будет проксировать запросы
const API_URL = process.env.REACT_APP_API_URL || '/api/v1';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_ID_KEY = 'userId';
const USER_KEY = 'user';

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

let onApiError: ((message: string, status?: number) => void) | null = null;

/** Подписка на ошибки API для отображения пользователю */
export function setApiErrorHandler(handler: (message: string, status?: number) => void) {
  onApiError = handler;
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Запрос: Authorization Bearer и X-User-ID (совместимость)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const userId = localStorage.getItem(USER_ID_KEY);
  if (config.headers) {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (userId) {
      config.headers['X-User-ID'] = userId;
    }
  }
  return config;
});

// Ответ: при 401 пробуем refresh и повтор запроса
api.interceptors.response.use(
  (response) => response,
  async (err: unknown) => {
    const axiosErr = err as { response?: { status?: number; data?: { error?: string; message?: string } }; config?: Record<string, unknown> & { _retry?: boolean }; message?: string };
    const originalRequest = axiosErr.config as (Record<string, unknown> & { _retry?: boolean }) | undefined;

    if (axiosErr.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        originalRequest._retry = true;
        try {
          const { data } = await axios.post<AuthResponse>(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          if (data.access_token) {
            localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
            if (data.refresh_token) {
              localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
            }
            if (data.user?.id) {
              localStorage.setItem(USER_ID_KEY, data.user.id);
              localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            }
            const headers = originalRequest.headers as Record<string, string> | undefined;
            if (headers) {
              headers.Authorization = `Bearer ${data.access_token}`;
            }
            // Повтор запроса с обновлённым токеном; config приходит из axios и содержит url и т.д.
            return api(originalRequest as unknown as Parameters<typeof api>[0]);
          }
        } catch (_refreshErr) {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(USER_ID_KEY);
          localStorage.removeItem(USER_KEY);
        }
      }
    }

    const message =
      axiosErr.response?.data?.error ||
      axiosErr.response?.data?.message ||
      axiosErr.message ||
      'Ошибка запроса';
    const status = axiosErr.response?.status;
    if (onApiError) {
      onApiError(String(message), status);
    }
    return Promise.reject(err);
  }
);

export const authStorage = {
  setTokens: (access: string, refresh?: string, expiresIn?: number) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh != null) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  setUser: (user: User) => {
    if (user?.id) {
      localStorage.setItem(USER_ID_KEY, user.id);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  getUserId: () => localStorage.getItem(USER_ID_KEY),
  getUser: (): User | null => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

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
  comic_poster_url?: string;
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

export interface UserStatistics {
  total_swipes: number;
  liked_movies: number;
  disliked_movies: number;
  total_matches: number;
  rooms_created: number;
  rooms_joined: number;
  active_rooms: number;
  completed_rooms: number;
}

export interface FootballMatch {
  id: string;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  tournament: string;
  status: 'upcoming' | 'live' | 'finished';
  homeScore?: number;
  awayScore?: number;
}

export interface FootballMatchesResponse {
  rpl?: FootballMatch[];
  european?: FootballMatch[];
}

export interface ChampionsLeagueBracket {
  roundOf16: FootballMatch[];
  quarterFinals: FootballMatch[];
  semiFinals: FootballMatch[];
  final: FootballMatch[];
}

export interface FootballStanding {
  position: number;
  team: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  form?: string;
  zone: 'direct' | 'playoff' | 'eliminated' | 'europe' | 'relegation' | '';
}

export interface FootballStandingsResponse {
  cl?: FootballStanding[];
  rpl?: FootballStanding[];
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

  getUserStatistics: async (id: string): Promise<UserStatistics> => {
    const response = await api.get<UserStatistics>(`/users/${id}/statistics`);
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

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/refresh', { refresh_token: refreshToken });
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

  // Футбольные матчи
  getFootballMatches: async (league?: 'RPL' | 'CL' | 'EU'): Promise<FootballMatchesResponse> => {
    const params = league ? `?league=${league}` : '';
    const response = await api.get<FootballMatchesResponse>(`/football/matches${params}`);
    return response.data;
  },

  getFootballStandings: async (league?: 'CL' | 'RPL'): Promise<FootballStandingsResponse> => {
    const params = league ? `?league=${league}` : '';
    const response = await api.get<FootballStandingsResponse>(`/football/standings${params}`);
    return response.data;
  },

  getChampionsLeagueBracket: async (): Promise<ChampionsLeagueBracket> => {
    const response = await api.get<ChampionsLeagueBracket>('/football/cl/bracket');
    return response.data;
  },

  refreshFootballMatches: async (): Promise<{ status: string; message: string }> => {
    const response = await api.post<{ status: string; message: string }>('/football/refresh');
    return response.data;
  },
};

export default api;
