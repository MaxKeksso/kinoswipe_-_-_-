import React, { useState, useEffect, useRef } from 'react';
import { SwipeCard } from './components/SwipeCard';
import { AuthForm } from './components/AuthForm';
import { PremiereSidebar } from './components/PremiereSidebar';
import { MatchLinksPage } from './components/MatchLinksPage';
import { AdminPanel } from './components/AdminPanel';
import { GenreQuestionnaire } from './components/GenreQuestionnaire';
import { RecommendationPage } from './components/RecommendationPage';
import { Profile } from './components/Profile';
import { MovieLibrary } from './components/MovieLibrary';
import { FootballPage } from './components/FootballPage';
import SplitSubscribePage from './components/SplitSubscribePage';
import OutfitMathPage from './components/OutfitMathPage';
import { apiService, authStorage, setApiErrorHandler, User, Room, Movie, Match, Premiere } from './api/api';
import { getMovieDisplayTitle } from './utils/movieRussian';
import { useWebSocket } from './hooks/useWebSocket';
import './App.css';

const TIMEWEB_WIDGET_SRC =
  process.env.REACT_APP_TIMEWEB_WIDGET_SRC ||
  'https://timeweb.cloud/api/v1/cloud-ai/agents/993cc710-5b8f-457d-b57d-94f9d3eeaaf2/embed.js?collapsed=false';

type AppState = 'auth' | 'genre-questionnaire' | 'room-selection' | 'room-waiting' | 'swiping' | 'match' | 'admin' | 'match-links' | 'football' | 'split-subscribe' | 'outfit-math';

const App: React.FC = () => {
  
  const [state, setState] = useState<AppState>('auth');
  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [lastMatch, setLastMatch] = useState<Match | null>(null);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [premieres, setPremieres] = useState<Premiere[]>([]);
  const [showMatchLinks, setShowMatchLinks] = useState(false);
  const [, setIsAdmin] = useState(false);
  const [userGenres, setUserGenres] = useState<string[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMovieLibrary, setShowMovieLibrary] = useState(false);
  const [roomMembers, setRoomMembers] = useState<User[]>([]);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);
  const [inviteIP, setInviteIP] = useState('');
  const loadRoomMembersRef = useRef<(() => Promise<void>) | null>(null);
  const [newMemberAlert, setNewMemberAlert] = useState(false);
  const prevMemberCountRef = useRef(0);

  // Формы
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Подключение виджета ИИ-чата Timeweb Cloud (загружается при открытии приложения)
  useEffect(() => {
    const scriptId = 'timeweb-cloud-ai-chat';
    if (document.getElementById(scriptId)) return;
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = TIMEWEB_WIDGET_SRC;
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.body.appendChild(script);
  }, []);

  // Читаем код комнаты из URL (?code=XXX) для ссылки-приглашения
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('code')?.trim().toUpperCase();
    if (codeFromUrl && codeFromUrl.length <= 6) {
      setRoomCode(codeFromUrl.replace(/[^A-Z0-9]/g, '').slice(0, 6));
    }
  }, []);

  // Глобальный обработчик ошибок API (показ пользователю)
  useEffect(() => {
    setApiErrorHandler((message, status) => {
      setError(message);
      if (status === 401) {
        authStorage.clear();
        setUser(null);
        setState('auth');
      }
    });
  }, []);

  // Загрузка пользователя из localStorage / authStorage при старте
  useEffect(() => {
    const savedUserId = authStorage.getUserId() || localStorage.getItem('userId');
    const savedUser = authStorage.getUser();
    const savedUsername = savedUser?.username ?? localStorage.getItem('username');

    const savedGenres = localStorage.getItem('userGenres');
    if (savedGenres) {
      try {
        const parsed = JSON.parse(savedGenres);
        setUserGenres(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error('Error parsing saved genres:', e);
      }
    }

    if (savedUserId && (savedUsername || savedUser)) {
      const userData = savedUser || { id: savedUserId, username: savedUsername || 'User', user_type: localStorage.getItem('userType') || 'regular' } as User;
      setUser(userData);
      const userType = localStorage.getItem('userType') || userData.user_type;
      setIsAdmin(userType === 'admin');
      if (userType === 'admin') {
        setState('admin');
      } else {
        const userGenresKey = `userGenres_${userData.id}`;
        const userSavedGenres = localStorage.getItem(userGenresKey) || savedGenres;
        if (userSavedGenres) {
          try {
            const parsed = JSON.parse(userSavedGenres);
            setUserGenres(Array.isArray(parsed) ? parsed : []);
            setState('room-selection');
          } catch {
            setState('genre-questionnaire');
          }
        } else {
          setState('genre-questionnaire');
        }
      }
      if (!savedUser && savedUserId) {
        apiService.getUser(savedUserId)
          .then((fetched) => {
            setUser(fetched);
            authStorage.setUser(fetched);
          })
          .catch(() => {
            authStorage.clear();
            localStorage.removeItem('userId');
            localStorage.removeItem('username');
            localStorage.removeItem('userType');
            setUser(null);
          });
      }
    }
  }, []);

  // WebSocket подключение для получения матчей (только если есть комната и пользователь)
  const shouldConnectWebSocket = !!(room?.id && user?.id);
  useWebSocket({
    roomId: room?.id || '',
    userId: user?.id || '',
      onMatch: (match: Match) => {
      if (!match || !(match as { id?: string }).id) return;
      console.log('Match received:', match);
      setLastMatch(match);
      setMatches((prev) => {
        const prevMatches = Array.isArray(prev) ? prev : [];
        return [match, ...prevMatches.filter((m): m is Match => !!m && !!(m as Match).id)];
      });
      // Автоматически показываем страницу со ссылками сразу после матча
      setTimeout(() => setShowMatchLinks(true), 500);
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
    enabled: shouldConnectWebSocket,
  });

  // Загрузка списка комнат при открытии страницы выбора комнаты
  useEffect(() => {
    if (state === 'room-selection') {
      loadAvailableRooms();
      loadPremieres();
    }
  }, [state]);

  // Загрузка премьер
  const loadPremieres = async () => {
    try {
      const allPremieres = await apiService.getPremieres();
      console.log('Loaded premieres:', allPremieres);
      setPremieres(allPremieres || []);
    } catch (err) {
      console.error('Error loading premieres:', err);
      setPremieres([]);
    }
  };

  // Обработка завершения опросника жанров
  const handleGenreQuestionnaireComplete = (selectedGenres: string[]) => {
    setUserGenres(selectedGenres);
    // Сохраняем жанры с привязкой к userId пользователя
    if (user?.id) {
      const userGenresKey = `userGenres_${user.id}`;
      localStorage.setItem(userGenresKey, JSON.stringify(selectedGenres));
    }
    // Также сохраняем в общий ключ для обратной совместимости
    localStorage.setItem('userGenres', JSON.stringify(selectedGenres));
    setState('room-selection');
  };

  // Загрузка жанров пользователя при старте
  useEffect(() => {
    const savedGenres = localStorage.getItem('userGenres');
    if (savedGenres) {
      try {
        setUserGenres(JSON.parse(savedGenres));
      } catch (e) {
        console.error('Error parsing user genres:', e);
      }
    }
  }, []);

  // Загрузка участников комнаты и проверка статуса комнаты
  useEffect(() => {
    if (state === 'room-waiting' && room?.id) {
      const loadMembers = async () => {
        try {
          const members = await apiService.getRoomMembers(room.id);
          let list = Array.isArray(members) ? members : [];
          if (list.length === 0 && user && room.host_id === user.id) {
            list = [user];
          }
          const prevCount = prevMemberCountRef.current;
          if (list.length > prevCount && prevCount > 0) {
            setNewMemberAlert(true);
            setTimeout(() => setNewMemberAlert(false), 4000);
          }
          prevMemberCountRef.current = list.length;
          setRoomMembers(list);
          const updatedRoom = await apiService.getRoomByCode(room.code);
          if (updatedRoom.status === 'active') {
            setRoom(updatedRoom);
            setState('swiping');
          }
        } catch (err) {
          console.error('Error loading room members:', err);
          if (user && room && room.host_id === user.id) {
            setRoomMembers([user]);
          } else {
            setRoomMembers([]);
          }
        }
      };

      loadRoomMembersRef.current = loadMembers;
      prevMemberCountRef.current = 0;
      loadMembers();
      const interval = setInterval(loadMembers, 800);
      return () => {
        loadRoomMembersRef.current = null;
        clearInterval(interval);
      };
    }
    if (state !== 'room-waiting') {
      setRoomMembers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- room/user целиком не нужны, отслеживаем только id/code/host_id
  }, [state, room?.id, room?.code, room?.host_id, user?.id]);

  // Загрузка фильмов при входе в комнату (только если комната активна)
  useEffect(() => {
    if (room && state === 'swiping' && room.status === 'active') {
      console.log('Room changed, loading movies and matches');
      // Сбрасываем индекс фильма при входе в новую комнату
      setCurrentMovieIndex(0);
      setShowRecommendations(false); // Убираем рекомендации при входе в комнату
      loadMovies();
      loadMatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, room?.status, state]); // Используем room?.id и room?.status для правильного отслеживания изменений

  // Когда все фильмы просмотрены — подгружаем актуальные матчи
  useEffect(() => {
    if (room && movies && movies.length > 0 && currentMovieIndex >= movies.length && !showMatchLinks) {
      loadMatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMovieIndex, movies?.length, room?.id, showMatchLinks]);

  const loadAvailableRooms = async () => {
    try {
      const rooms = await apiService.getAllRooms('waiting', 20);
      setAvailableRooms(Array.isArray(rooms) ? rooms : []);
    } catch (err) {
      console.error('Error loading rooms:', err);
      // Игнорируем ошибку, список комнат не критичен
      setAvailableRooms([]);
    }
  };

  const loadMovies = async () => {
    if (!room) return;
    
    try {
      setLoading(true);
      setError('');
      console.log('Loading movies for room:', room.id);
      const roomMovies = await apiService.getRoomMovies(room.id);
      console.log('Loaded movies:', roomMovies?.length || 0);
      
      if (roomMovies && Array.isArray(roomMovies) && roomMovies.length > 0) {
        setMovies(roomMovies);
        setCurrentMovieIndex(0);
      } else {
        // Если фильмов нет, пробуем создать тестовые
        console.log('No movies found, creating test movies');
        const testMovies = await createTestMovies();
        if (testMovies && Array.isArray(testMovies) && testMovies.length > 0) {
          setMovies(testMovies);
          setCurrentMovieIndex(0);
        } else {
          setError('Фильмы не найдены. Попробуйте позже.');
          setMovies([]);
        }
      }
    } catch (err: any) {
      console.error('Error loading movies:', err);
      setError(err.response?.data?.error || 'Ошибка загрузки фильмов');
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  const createTestMovies = async (): Promise<Movie[]> => {
    const testMoviesData = [
      {
        title: 'Матрица',
        poster_url: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
        genre: JSON.stringify(['фантастика', 'боевик']),
        year: 1999,
        duration: 136,
        imdb_rating: 8.7,
        kp_rating: 8.7,
        description: 'Хакер Нео узнает, что его реальность - это иллюзия, созданная машинами.',
      },
      {
        title: 'Интерстеллар',
        poster_url: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
        genre: JSON.stringify(['фантастика', 'драма']),
        year: 2014,
        duration: 169,
        imdb_rating: 8.6,
        kp_rating: 8.6,
        description: 'Исследователи отправляются в космос, чтобы найти новый дом для человечества.',
      },
      {
        title: 'Начало',
        poster_url: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
        genre: JSON.stringify(['фантастика', 'триллер']),
        year: 2010,
        duration: 148,
        imdb_rating: 8.8,
        kp_rating: 8.7,
        description: 'Профессионал по проникновению в сны получает задание внедрить идею.',
      },
      {
        title: 'Криминальное чтиво',
        poster_url: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
        genre: JSON.stringify(['криминал', 'драма']),
        year: 1994,
        duration: 154,
        imdb_rating: 8.9,
        kp_rating: 8.6,
        description: 'Переплетенные истории криминального мира Лос-Анджелеса.',
      },
      {
        title: 'Побег из Шоушенка',
        poster_url: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
        genre: JSON.stringify(['драма']),
        year: 1994,
        duration: 142,
        imdb_rating: 9.3,
        kp_rating: 9.1,
        description: 'Банкир приговорен к пожизненному заключению за убийство жены.',
      },
      {
        title: 'Бегущий по лезвию 2049',
        poster_url: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWj5FlWHauUxPSX.jpg',
        genre: JSON.stringify(['фантастика', 'триллер']),
        year: 2017,
        duration: 164,
        imdb_rating: 8.0,
        kp_rating: 7.5,
        description: 'Молодой детектив раскрывает секрет, который может погубить общество.',
      },
      {
        title: 'Дюна',
        poster_url: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
        genre: JSON.stringify(['фантастика', 'драма']),
        year: 2021,
        duration: 155,
        imdb_rating: 8.0,
        kp_rating: 7.8,
        description: 'Сын знатного рода отправляется на опасную планету Арракис.',
      },
      {
        title: 'Темный рыцарь',
        poster_url: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
        genre: JSON.stringify(['боевик', 'криминал', 'драма']),
        year: 2008,
        duration: 152,
        imdb_rating: 9.0,
        kp_rating: 8.5,
        description: 'Бэтмен сталкивается с Джокером, хаотичным преступником.',
      },
      {
        title: 'Форрест Гамп',
        poster_url: 'https://image.tmdb.org/t/p/w500/arw2vcBvePOVz6xHX6yQ0sikV9Q.jpg',
        genre: JSON.stringify(['драма', 'романтика']),
        year: 1994,
        duration: 142,
        imdb_rating: 8.8,
        kp_rating: 8.9,
        description: 'История жизни простого человека, который стал свидетелем важных событий.',
      },
      {
        title: 'Бойцовский клуб',
        poster_url: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
        genre: JSON.stringify(['драма', 'триллер']),
        year: 1999,
        duration: 139,
        imdb_rating: 8.8,
        kp_rating: 8.6,
        description: 'Офисный работник встречает загадочного торговца мылом.',
      },
      {
        title: 'Крестный отец',
        poster_url: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
        genre: JSON.stringify(['криминал', 'драма']),
        year: 1972,
        duration: 175,
        imdb_rating: 9.2,
        kp_rating: 8.7,
        description: 'История могущественной семьи мафиози в Америке.',
      },
      {
        title: 'Зеленая миля',
        poster_url: 'https://image.tmdb.org/t/p/w500/velWPhVMQeQKcxggNEU8YmIo52R.jpg',
        genre: JSON.stringify(['драма', 'фантастика']),
        year: 1999,
        duration: 189,
        imdb_rating: 8.6,
        kp_rating: 8.9,
        description: 'Надзиратель тюрьмы знакомится с необычным заключенным.',
      },
      {
        title: 'Список Шиндлера',
        poster_url: 'https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg',
        genre: JSON.stringify(['драма', 'биография', 'история']),
        year: 1993,
        duration: 195,
        imdb_rating: 8.9,
        kp_rating: 8.8,
        description: 'Немецкий бизнесмен спасает жизни евреев во время Холокоста.',
      },
      {
        title: 'Властелин колец: Возвращение короля',
        poster_url: 'https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3O7bqj9hs1es.jpg',
        genre: JSON.stringify(['фэнтези', 'приключения', 'драма']),
        year: 2003,
        duration: 201,
        imdb_rating: 9.0,
        kp_rating: 8.6,
        description: 'Финальная битва за Средиземье начинается.',
      },
      {
        title: 'Криминальное чтиво',
        poster_url: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
        genre: JSON.stringify(['криминал', 'драма']),
        year: 1994,
        duration: 154,
        imdb_rating: 8.9,
        kp_rating: 8.6,
        description: 'Переплетенные истории криминального мира Лос-Анджелеса.',
      },
      {
        title: 'Иллюзионист',
        poster_url: 'https://image.tmdb.org/t/p/w500/5MXyQfz8xUP3dIFPTubhTsbFY6N.jpg',
        genre: JSON.stringify(['триллер', 'драма']),
        year: 2006,
        duration: 130,
        imdb_rating: 8.5,
        kp_rating: 8.4,
        description: 'Два иллюзиониста вступают в жестокое соперничество.',
      },
      {
        title: 'Исчезнувшая',
        poster_url: 'https://image.tmdb.org/t/p/w500/gdiLTof3rbPDAmPaCf4g6f46VJu.jpg',
        genre: JSON.stringify(['триллер', 'драма']),
        year: 2014,
        duration: 149,
        imdb_rating: 8.1,
        kp_rating: 7.9,
        description: 'Муж становится главным подозреваемым в исчезновении жены.',
      },
      {
        title: 'Джокер',
        poster_url: 'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDte09CU.jpg',
        genre: JSON.stringify(['криминал', 'драма', 'триллер']),
        year: 2019,
        duration: 122,
        imdb_rating: 8.4,
        kp_rating: 7.8,
        description: 'История превращения неудачливого комика в злодея.',
      },
      {
        title: 'Паразиты',
        poster_url: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
        genre: JSON.stringify(['комедия', 'драма', 'триллер']),
        year: 2019,
        duration: 132,
        imdb_rating: 8.5,
        kp_rating: 7.6,
        description: 'Бедная семья устраивается на работу к богатым.',
      },
      {
        title: '1917',
        poster_url: 'https://image.tmdb.org/t/p/w500/iZf0KyrE25z1sage4SYFLCCrMi9.jpg',
        genre: JSON.stringify(['военный', 'драма', 'триллер']),
        year: 2019,
        duration: 119,
        imdb_rating: 8.2,
        kp_rating: 7.8,
        description: 'Два солдата получают задание доставить важное сообщение.',
      },
    ];

    const createdMovies: Movie[] = [];
    for (const movieData of testMoviesData) {
      try {
        const movie = await apiService.createMovie(movieData);
        createdMovies.push(movie);
      } catch (err) {
        console.error('Error creating test movie:', err);
      }
    }

    return createdMovies;
  };

  const safeMatchList = (arr: unknown): Match[] => {
    if (!Array.isArray(arr)) return [];
    return arr.filter((m): m is Match => !!m && typeof m === 'object' && !!(m as Match).id);
  };

  const loadMatches = async () => {
    if (!room) return;
    try {
      const roomMatches = await apiService.getRoomMatches(room.id);
      setMatches(safeMatchList(roomMatches));
    } catch (err) {
      console.error('Error loading matches:', err);
      setMatches([]);
    }
  };

  // Быстрый вход (без регистрации)
  // Вход для зарегистрированных пользователей (JWT + refresh)
  const handleUserLogin = async (email: string, password: string) => {
    setLoading(true);
    setError('');

    try {
      const data = await apiService.login(email, password);
      const userData = data.user;
      authStorage.setTokens(data.access_token, data.refresh_token, data.expires_in);
      authStorage.setUser(userData);
      setUser(userData);
      setIsAdmin(userData.user_type === 'admin');
      localStorage.setItem('userId', userData.id);
      localStorage.setItem('username', userData.username);
      localStorage.setItem('userType', userData.user_type);

      if (userData.user_type === 'admin') {
        setState('admin');
      } else {
        const userGenresKey = `userGenres_${userData.id}`;
        const savedGenres = localStorage.getItem(userGenresKey);
        if (savedGenres) {
          try {
            const parsed = JSON.parse(savedGenres);
            setUserGenres(Array.isArray(parsed) ? parsed : []);
            setState('room-selection');
          } catch {
            setState('genre-questionnaire');
          }
        } else {
          setState('genre-questionnaire');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (usernameInput: string) => {
    setLoading(true);
    setError('');

    try {
      const newUser = await apiService.createUser(usernameInput);
      setUser(newUser);
      setIsAdmin(newUser.user_type === 'admin');
      localStorage.setItem('userId', newUser.id);
      localStorage.setItem('username', newUser.username);
      localStorage.setItem('userType', newUser.user_type);
      // Каждый новый пользователь всегда проходит опросник
      // Очищаем старые жанры из localStorage (они могут быть от другого пользователя)
      localStorage.removeItem('userGenres');
      setState('genre-questionnaire');
    } catch (err: any) {
      console.error('Error creating user:', err);
      console.error('Error response:', err.response);
      console.error('Error message:', err.message);
      console.error('Error code:', err.code);
      
      let errorMessage = 'Ошибка создания пользователя';
      
      if (err.response) {
        // Сервер ответил с ошибкой
        const serverError = err.response.data?.error || err.response.data?.message;
        if (serverError) {
          errorMessage = serverError;
        } else if (err.response.status === 400) {
          errorMessage = 'Неверные данные. Проверьте введенное имя.';
        } else if (err.response.status === 500) {
          errorMessage = 'Ошибка сервера. Попробуйте позже.';
        }
      } else if (err.request) {
        // Запрос был сделан, но ответа не получено
        if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
          errorMessage = 'Не удалось подключиться к серверу. Убедитесь, что сервер запущен.';
        } else {
          errorMessage = 'Нет ответа от сервера. Проверьте подключение к интернету.';
        }
      } else {
        // Ошибка при настройке запроса
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Регистрация
  const handleRegister = async (usernameInput: string, email: string, password: string, phone?: string) => {
    setLoading(true);
    setError('');

    try {
      const newUser = await apiService.register(usernameInput, email, password, phone);
      setUser(newUser);
      setIsAdmin(newUser.user_type === 'admin');
      localStorage.setItem('userId', newUser.id);
      localStorage.setItem('username', newUser.username);
      localStorage.setItem('userType', newUser.user_type);
      // Каждый новый пользователь всегда проходит опросник
      // Очищаем старые жанры из localStorage (они могут быть от другого пользователя)
      localStorage.removeItem('userGenres');
      const userGenresKey = `userGenres_${newUser.id}`;
      localStorage.removeItem(userGenresKey);
      setState('genre-questionnaire');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  // Создание комнаты
  const handleCreateRoom = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const newRoom = await apiService.createRoom();
      setRoom(newRoom);
      // Явно отключаем рекомендации при создании комнаты
      setShowRecommendations(false);
      setShowMatchLinks(false);
      setCurrentMovieIndex(0);
      // Комната создается в статусе waiting
      setState('room-waiting');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка создания комнаты');
    } finally {
      setLoading(false);
    }
  };

  // Присоединение к комнате
  const handleJoinRoom = async (roomCodeToJoin?: string) => {
    const codeToUse = roomCodeToJoin || roomCode;
    if (!codeToUse.trim()) {
      setError('Введите код комнаты');
      return;
    }

    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const data = await apiService.joinRoom(codeToUse.trim().toUpperCase());
      const joinedRoom = (data as { room?: Room }).room ?? (data as Room);
      const initialMembers = Array.isArray((data as { members?: User[] }).members) ? (data as { members: User[] }).members : [];
      setRoom(joinedRoom);
      setRoomMembers(initialMembers);
      setShowRecommendations(false);
      setShowMatchLinks(false);
      setCurrentMovieIndex(0);
      if (joinedRoom.status === 'waiting') {
        setState('room-waiting');
      } else {
        setState('swiping');
      }
      setRoomCode('');
      if (initialMembers.length === 0 && joinedRoom.id) {
        try {
          const list = await apiService.getRoomMembers(joinedRoom.id);
          setRoomMembers(Array.isArray(list) ? list : []);
        } catch (_) { /* ignore */ }
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Ошибка присоединения к комнате';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Обработка свайпа
  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!room || !movies || movies.length === 0 || !movies[currentMovieIndex]) return;

    const movie = movies[currentMovieIndex];
    setLoading(true);
    setError(''); // Очищаем предыдущие ошибки

    try {
      const result = await apiService.createSwipe(room.id, movie.id, direction);
      
      // Проверяем, есть ли матч в ответе (защита от неожиданного формата API)
      const rawMatch = typeof result === 'object' && result !== null && 'match' in result ? (result as { match?: Match }).match : null;
      if (rawMatch && typeof rawMatch === 'object' && rawMatch.id) {
        const matchData: Match = {
          id: rawMatch.id,
          room_id: rawMatch.room_id,
          movie_id: rawMatch.movie_id,
          created_at: rawMatch.created_at,
          movie: rawMatch.movie ?? undefined,
          users: Array.isArray(rawMatch.users) ? rawMatch.users : undefined,
        };
        setLastMatch(matchData);
        setMatches((prev) => [matchData, ...safeMatchList(prev)]);
        setTimeout(() => setShowMatchLinks(true), 500);
        return;
      }

      // Переходим к следующему фильму только если нет матча
      if (movies && currentMovieIndex < movies.length - 1) {
        setCurrentMovieIndex(currentMovieIndex + 1);
      } else {
        // Фильмы закончились - загружаем актуальные матчи и проверяем
        if (room) {
          try {
            const updatedMatches = await apiService.getRoomMatches(room.id);
            const matchList = safeMatchList(updatedMatches);
            if (matchList.length > 0) {
              setMatches(matchList);
              setTimeout(() => {
                setLastMatch(matchList[0]);
                setShowMatchLinks(true);
              }, 500);
            } else {
              const savedGenres = localStorage.getItem('userGenres');
              let genres: string[] = [];
              if (savedGenres) {
                try {
                  const parsed = JSON.parse(savedGenres);
                  genres = Array.isArray(parsed) ? parsed : [];
                } catch { /* ignore */ }
              }
              if (genres.length > 0 && room) {
                setTimeout(() => {
                  setUserGenres(genres);
                  setShowRecommendations(true);
                }, 1000);
              } else {
                setError('Все фильмы просмотрены!');
              }
            }
          } catch (err) {
            console.error('Error loading matches:', err);
            const fallback = safeMatchList(matches);
            if (fallback.length > 0) {
              setTimeout(() => {
                setLastMatch(fallback[0]);
                setShowMatchLinks(true);
              }, 500);
            } else {
              setError('Все фильмы просмотрены!');
            }
          }
        }
      }
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.error?.includes('Already swiped')) {
        if (movies && currentMovieIndex < movies.length - 1) {
          setCurrentMovieIndex(currentMovieIndex + 1);
        } else {
          if (room) {
            try {
              const updatedMatches = await apiService.getRoomMatches(room.id);
              const matchList = safeMatchList(updatedMatches);
              if (matchList.length > 0) {
                setMatches(matchList);
                setTimeout(() => {
                  setLastMatch(matchList[0]);
                  setShowMatchLinks(true);
                }, 500);
              } else {
                const savedGenres = localStorage.getItem('userGenres');
                let genres: string[] = [];
                if (savedGenres) {
                  try {
                    const parsed = JSON.parse(savedGenres);
                    genres = Array.isArray(parsed) ? parsed : [];
                  } catch { /* ignore */ }
                }
                if (genres.length > 0 && room) {
                  setUserGenres(genres);
                  setShowRecommendations(true);
                } else {
                  setError('Все фильмы просмотрены!');
                }
              }
            } catch (matchErr) {
              console.error('Error loading matches:', matchErr);
              const fallback = safeMatchList(matches);
              if (fallback.length > 0) {
                setTimeout(() => {
                  setLastMatch(fallback[0]);
                  setShowMatchLinks(true);
                }, 500);
              } else {
                setError('Все фильмы просмотрены!');
              }
            }
          }
        }
      } else {
        const errMsg = err?.response?.data?.error || err?.message || 'Ошибка свайпа';
        setError(typeof errMsg === 'string' ? errMsg : 'Ошибка свайпа');
      }
    } finally {
      setLoading(false);
    }
  };

  // Показ рекомендаций на основе жанров
  const showGenreRecommendations = async () => {
    if (!room) {
      setError('Комната не найдена');
      return;
    }
    const savedGenres = localStorage.getItem('userGenres');
    let genres: string[] = [];
    if (savedGenres) {
      try {
        const parsed = JSON.parse(savedGenres);
        genres = Array.isArray(parsed) ? parsed : [];
      } catch { /* ignore */ }
    }
    if (genres.length > 0) {
      setUserGenres(genres);
      setShowRecommendations(true);
    } else {
      setError('Сначала выберите любимые жанры в опроснике');
    }
  };

  const handleCardSwipe = (direction: string) => {
    if (direction === 'left') {
      handleSwipe('left');
    } else if (direction === 'right') {
      handleSwipe('right');
    }
  };

  // Выход (очистка JWT и localStorage)
  const handleLogout = () => {
    authStorage.clear();
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('userType');
    setUser(null);
    setRoom(null);
    setMovies([]);
    setMatches([]);
    setState('auth');
  };

  const handleLeaveRoom = () => {
    setRoom(null);
    setMovies([]);
    setCurrentMovieIndex(0);
    setMatches([]);
    setState('room-selection');
  };

  // Рендер админ-панели
  if (state === 'admin') {
    return (
      <div className="App">
        <AdminPanel
          onLogout={() => {
            handleLogout();
            setState('auth');
          }}
        />
      </div>
    );
  }

  // Рендер футбольной страницы
  if (state === 'football') {
    return (
      <div className="App">
        <FootballPage />
        <div className="football-back-button">
          <button onClick={() => setState('room-selection')} className="primary-button">
            ← Назад к фильмам
          </button>
        </div>
      </div>
    );
  }

  // Рендер Split & Subscribe
  if (state === 'split-subscribe') {
    return (
      <div className="App">
        <SplitSubscribePage onBack={() => setState('room-selection')} />
      </div>
    );
  }

  // Рендер OutfitMath
  if (state === 'outfit-math') {
    return (
      <div className="App">
        <OutfitMathPage onBack={() => setState('room-selection')} />
      </div>
    );
  }

  // Рендер экрана авторизации
  if (state === 'auth') {
    return (
      <div className="App">
        <div className="auth-container">
          <h1>🎬 KinoSwipe</h1>
          <p>Выбери фильмы вместе с друзьями!</p>
          <AuthForm
            onLogin={handleQuickLogin}
            onUserLogin={handleUserLogin}
            onRegister={handleRegister}
            loading={loading}
            error={error}
          />
        </div>
      </div>
    );
  }

  // Рендер опросника жанров (должен быть после auth, но перед room-selection)
  if (state === 'genre-questionnaire') {
    return (
      <GenreQuestionnaire onComplete={handleGenreQuestionnaireComplete} />
    );
  }

  // Рендер экрана выбора комнаты
  if (state === 'room-selection') {
    const premieresList = Array.isArray(premieres) ? premieres : [];
    const activePremieres = premieresList.filter(p => p.is_active);
    const leftPremieres = premieresList.filter(p => p.position === 'left' && p.is_active);
    const rightPremieres = premieresList.filter(p => p.position === 'right' && p.is_active);
    
    // Отладка: выводим информацию о премьерах
    console.log('Premieres loaded:', premieresList.length, 'Active:', activePremieres.length);
    // Получаем жанры пользователя (JSON.parse может вернуть null — всегда приводим к массиву)
    let genres: string[] = [];
    const safeParseGenres = (raw: string | null): string[] => {
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };
    if (user?.id) {
      const userGenresKey = `userGenres_${user.id}`;
      genres = safeParseGenres(localStorage.getItem(userGenresKey));
      if (genres.length === 0) genres = safeParseGenres(localStorage.getItem('userGenres'));
    } else {
      genres = safeParseGenres(localStorage.getItem('userGenres'));
    }
    genres = Array.isArray(genres) ? genres : [];

    return (
      <div className="App">
        {leftPremieres.length > 0 && <PremiereSidebar premieres={premieresList} position="left" />}
        {rightPremieres.length > 0 && <PremiereSidebar premieres={premieresList} position="right" />}
        <div className={`room-selection-container ${leftPremieres.length > 0 ? 'with-left-sidebar' : ''} ${rightPremieres.length > 0 ? 'with-right-sidebar' : ''}`}>
          <div className="header">
            <div>
              <h1>🎬 Привет, {user?.username}! 👋</h1>
              <p className="welcome-message">Выбери фильмы вместе с друзьями! Создай комнату или присоединись к существующей.</p>
              {(genres || []).length > 0 && (
                <div className="user-preferences">
                  <span className="preferences-label">Ваши предпочтения:</span>
                  <div className="preferences-tags">
                    {(genres || []).slice(0, 5).map((genre: string) => (
                      <span key={genre} className="preference-tag">
                        {genre === 'action' ? '💥 Боевик' :
                         genre === 'comedy' ? '😂 Комедия' :
                         genre === 'drama' ? '🎭 Драма' :
                         genre === 'horror' ? '👻 Ужасы' :
                         genre === 'thriller' ? '🔪 Триллер' :
                         genre === 'romance' ? '💕 Романтика' :
                         genre === 'sci-fi' ? '🚀 Фантастика' :
                         genre === 'fantasy' ? '🧙 Фэнтези' :
                         genre === 'adventure' ? '🗺️ Приключения' :
                         genre === 'crime' ? '🔫 Криминал' :
                         genre === 'mystery' ? '🔍 Детектив' :
                         genre === 'animation' ? '🎨 Анимация' :
                         genre === 'documentary' ? '📹 Документалистика' :
                         genre === 'family' ? '👨‍👩‍👧‍👦 Семейное' :
                         genre === 'war' ? '⚔️ Военное' : genre}
                      </span>
                    ))}
                    {(genres || []).length > 5 && <span className="preference-tag">+{(genres || []).length - 5}</span>}
                  </div>
                </div>
              )}
            </div>
            <div className="header-actions">
              <button onClick={() => setState('football')} className="secondary-button football-button">
                ⚽ Футбол
              </button>
              <button onClick={() => setState('split-subscribe')} className="secondary-button">
                💳 Split & Subscribe
              </button>
              <button onClick={() => setState('outfit-math')} className="secondary-button">
                👗 OutfitMath
              </button>
              {user && user.user_type === 'admin' && (
                <button onClick={() => setState('admin')} className="secondary-button admin-button">
                  🔐 Админ-панель
                </button>
              )}
              {user && user.email && (
                <button onClick={() => setShowProfile(true)} className="secondary-button">
                  👤 Профиль
                </button>
              )}
              <button onClick={() => setShowMovieLibrary(true)} className="secondary-button">
                🎬 Библиотека фильмов
              </button>
              <button onClick={handleLogout} className="secondary-button">Выйти</button>
            </div>
          </div>

          <div className="room-actions-section">
            <div className="create-room-card">
              <h2>🆕 Создать новую комнату</h2>
              <p>Создай комнату и пригласи друзей по коду</p>
              <button onClick={handleCreateRoom} disabled={loading} className="primary-button large">
                {loading ? 'Создание...' : '➕ Создать комнату'}
              </button>
            </div>

            <div className="join-room-card">
              <h2>🔑 Присоединиться по коду</h2>
              <p>{roomCode ? 'Код из ссылки — нажмите «Присоединиться»' : 'Введи код комнаты от друга'}</p>
              <div className="join-room-form">
                <input
                  type="text"
                  placeholder="XXXXXX"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                  disabled={loading}
                  className="input-field code-input"
                  maxLength={6}
                />
                <button onClick={() => handleJoinRoom()} disabled={loading || !roomCode.trim()} className="primary-button">
                  Присоединиться
                </button>
              </div>
            </div>
          </div>

          {(availableRooms || []).length > 0 && (
            <div className="available-rooms-section">
              <h2>🌟 Активные комнаты</h2>
              <div className="rooms-grid">
                {(availableRooms || []).map((r) => (
                  <div key={r.id} className="room-card">
                    <div className="room-card-header">
                      <span className="room-code-badge">{r.code}</span>
                      <span className="room-status">{r.status === 'waiting' ? '⏳ Ожидание' : r.status === 'active' ? '🎬 Активна' : '✅ Завершена'}</span>
                    </div>
                    <div className="room-card-footer">
                      <button
                        onClick={() => {
                          setRoomCode(r.code);
                          handleJoinRoom(r.code);
                        }}
                        className="join-room-button"
                        disabled={loading}
                      >
                        Присоединиться
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="error-message">{error}</p>}

          {/* Премьеры (отображаются внизу страницы) */}
          {activePremieres.length > 0 && (
            <div className="premieres-mobile-section">
              <h2>🎬 Новые премьеры</h2>
              <div className="premieres-mobile-grid">
                {activePremieres.map((premiere) => (
                  <div key={premiere.id} className="premiere-mobile-card">
                    {premiere.poster_url && (
                      <img
                        src={premiere.poster_url}
                        alt={premiere.title}
                        className="premiere-mobile-poster"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="premiere-mobile-info">
                      <h4 className="premiere-mobile-title">{premiere.title}</h4>
                      {premiere.description && (
                        <p className="premiere-mobile-description">{premiere.description}</p>
                      )}
                      {premiere.release_date && (
                        <span className="premiere-mobile-date">
                          📅 {new Date(premiere.release_date).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Подвал */}
          <footer className="app-footer">
            <div className="footer-content">
              <div className="footer-section">
                <h3>📧 Контакты</h3>
                <p>Email: <a href="mailto:info@kinoswipe.ru">info@kinoswipe.ru</a></p>
                <p>Телефон: <a href="tel:+79991234567">+7 (999) 123-45-67</a></p>
              </div>
              <div className="footer-section">
                <h3>🔗 Сообщество</h3>
                <p>
                  <a href="https://t.me/kinoswipe" target="_blank" rel="noopener noreferrer">
                    Telegram канал KinoSwipe
                  </a>
                </p>
              </div>
              <div className="footer-section">
                <h3>🎬 О нас</h3>
                <p>Выбирайте фильмы вместе с друзьями!</p>
              </div>
            </div>
            <div className="footer-bottom">
              <p>&copy; 2026 KinoSwipe. Все права защищены.</p>
            </div>
          </footer>
        </div>

        {/* Профиль пользователя - показывается на странице выбора комнаты */}
        {showProfile && user && (
          <Profile
            user={user}
            onClose={() => setShowProfile(false)}
          />
        )}

        {/* Библиотека фильмов - показывается на странице выбора комнаты */}
        {showMovieLibrary && (
          <MovieLibrary
            onClose={() => setShowMovieLibrary(false)}
            isAdmin={user?.user_type === 'admin'}
          />
        )}
      </div>
    );
  }

  // Обработчик запуска комнаты
  const handleStartRoom = async () => {
    if (!room) return;
    setLoading(true);
    setError('');
    try {
      const updatedRoom = await apiService.startRoom(room.id);
      setRoom(updatedRoom);
      setState('swiping');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка запуска комнаты');
    } finally {
      setLoading(false);
    }
  };

  // Рендер экрана ожидания в комнате
  if (state === 'room-waiting' && room) {
    const isHost = user?.id === room.host_id;

    return (
      <div className="App">
        <div className="room-waiting-container">
          <div className="waiting-content">
            <h1>🎬 Комната: {room.code}</h1>
            <p className="waiting-message">Ожидание участников...</p>
            <div className="invite-section">
              <p className="invite-hint">Второй человек открывает приложение <strong>на другом устройстве</strong> и переходит по ссылке ниже (или вводит код комнаты).</p>
              <div className="invite-code-block">
                <span className="invite-code-label">Код комнаты:</span>
                <span className="invite-code-value">{room.code}</span>
                <button
                  type="button"
                  className="secondary-button copy-code-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(room.code).then(() => {
                      setRoomCodeCopied(true);
                      setTimeout(() => setRoomCodeCopied(false), 2500);
                    }).catch(() => setError('Не удалось скопировать'));
                  }}
                >
                  {roomCodeCopied ? '✓ Код скопирован' : '📋 Скопировать код'}
                </button>
              </div>
              {(() => {
                const isPublicSite = typeof window !== 'undefined' && window.location.origin && !/^https?:\/\/localhost(:\d+)?$/i.test(window.location.origin);
                const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname || ''}?code=${room.code}` : '';
                return (
                  <>
                    {isPublicSite && (
                      <div className="invite-public-block">
                        <p className="invite-public-hint">Приложение открыто по публичной ссылке — отправь эту ссылку другу. VPN и ngrok не нужны.</p>
                        <button
                          type="button"
                          className="primary-button copy-invite-btn"
                          onClick={() => {
                            navigator.clipboard.writeText(inviteUrl).then(() => {
                              setInviteLinkCopied(true);
                              setTimeout(() => setInviteLinkCopied(false), 2500);
                            }).catch(() => setError('Не удалось скопировать'));
                          }}
                        >
                          {inviteLinkCopied ? '✓ Ссылка скопирована' : '📋 Скопировать ссылку приглашения'}
                        </button>
                        <span className="invite-url-preview">{inviteUrl}</span>
                      </div>
                    )}
                    {!isPublicSite && (
                      <div className="invite-ip-block">
                        <p className="invite-ip-explanation">
                          <strong>Локальный запуск.</strong> Нужен IP этого ПК или ссылка ngrok, чтобы другой человек мог зайти.
                        </p>
                        <div className="invite-ip-row">
                          <label className="invite-ip-label">IP или ссылка (например https://xxx.ngrok.io):</label>
                          <input
                            type="text"
                            placeholder="192.168.1.5 или https://xxx.ngrok.io"
                            value={inviteIP}
                            onChange={(e) => setInviteIP(e.target.value.trim())}
                            className="input-field invite-ip-input"
                          />
                          <button
                            type="button"
                            className="primary-button copy-invite-btn"
                            disabled={!inviteIP}
                            onClick={() => {
                              const raw = inviteIP.trim();
                              let url: string;
                              if (/^https?:\/\//i.test(raw)) {
                                const base = raw.replace(/\?.*$/, '').replace(/:3000\/?$/, '').replace(/:3000$/, '');
                                url = base + (base.includes('?') ? '&' : '?') + `code=${room.code}`;
                              } else {
                                const host = raw.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
                                const isNgrok = /ngrok-free\.(dev|app)|\.ngrok\.io$/i.test(host);
                                url = isNgrok ? `https://${host}?code=${room.code}` : `http://${host}:3000?code=${room.code}`;
                              }
                              navigator.clipboard.writeText(url).then(() => {
                                setInviteLinkCopied(true);
                                setTimeout(() => setInviteLinkCopied(false), 2500);
                              }).catch(() => setError('Не удалось скопировать'));
                            }}
                          >
                            {inviteLinkCopied ? '✓ Ссылка скопирована' : '📋 Скопировать ссылку'}
                          </button>
                        </div>
                      </div>
                    )}
                    {!isPublicSite && (
                      <button
                        type="button"
                        className="secondary-button copy-invite-btn"
                        onClick={() => {
                          const url = `${window.location.origin}${window.location.pathname || ''}?code=${room.code}`;
                          navigator.clipboard.writeText(url).then(() => {
                            setInviteLinkCopied(true);
                            setTimeout(() => setInviteLinkCopied(false), 2500);
                          }).catch(() => setError('Не удалось скопировать'));
                        }}
                      >
                        📋 Ссылка для этого компьютера (localhost)
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="members-list">
              <div className="members-list-header">
                <h2>Участники ({(roomMembers || []).length})</h2>
                <button
                  type="button"
                  className="secondary-button refresh-members-btn"
                  onClick={() => loadRoomMembersRef.current?.()}
                >
                  🔄 Обновить список
                </button>
              </div>
              {newMemberAlert && (
                <div className="new-member-alert" role="alert">
                  👋 Кто-то подключился! Список обновлён.
                </div>
              )}
              {(roomMembers || []).length === 0 && (
                <p className="members-empty-hint">
                  Список пустой. Нажмите «Обновить список» ниже — вы должны увидеть себя и других участников.
                </p>
              )}
              <p className="members-updated-at">
                Список обновляется автоматически (каждую секунду)
              </p>
              <div className="members-grid">
                {(roomMembers || []).map((member) => (
                  <div key={member.id} className="member-card">
                    <div className="member-avatar">
                      {member.username ? member.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="member-info">
                      <h3>{member.username || 'Пользователь'}</h3>
                      {member.id === room.host_id && <span className="host-badge">👑 Хост</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isHost && (
              <div className="start-room-section">
                <p className="start-hint">
                  {(roomMembers || []).length < 2 
                    ? 'Пригласите еще участников, чтобы начать выбор фильмов'
                    : 'Все участники готовы! Нажмите кнопку, чтобы начать выбор фильмов'}
                </p>
                <button
                  onClick={handleStartRoom}
                  disabled={loading || (roomMembers || []).length < 2}
                  className="primary-button large start-button"
                >
                  {loading ? 'Запуск...' : '🎬 Начать выбор фильмов'}
                </button>
              </div>
            )}

            {!isHost && (
              <div className="waiting-for-host">
                <p>⏳ Ожидание, пока хост начнет выбор фильмов...</p>
              </div>
            )}

            <button onClick={handleLeaveRoom} className="secondary-button">
              Покинуть комнату
            </button>

            {error && <p className="error-message">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Рендер экрана свайпа
  const currentMovie = movies && movies.length > 0 && currentMovieIndex < movies.length 
    ? movies[currentMovieIndex] 
    : null;
  const remainingMovies = movies && movies.length > 0 
    ? Math.max(0, movies.length - currentMovieIndex) 
    : 0;

  return (
    <div className="App">
      <div className="swipe-container">
        <div className="swipe-header">
          <div>
            <h2>Комната: {room?.code}</h2>
            <p>Осталось фильмов: {remainingMovies}</p>
          </div>
          <div>
            {(matches || []).length > 0 && (
              <div className="matches-badge">
                🎉 Матчей: {(matches || []).length}
              </div>
            )}
            <button onClick={handleLeaveRoom} className="secondary-button">Выйти из комнаты</button>
          </div>
        </div>

        {loading && (!movies || movies.length === 0) && (
          <div className="loading">
            <p>Загрузка фильмов...</p>
          </div>
        )}

        {!loading && movies && movies.length === 0 && state === 'swiping' && (
          <div className="no-more-movies no-movies-empty">
            <div className="no-more-movies-header">
              <h2>🎬 Пока нет фильмов для свайпов</h2>
              <p className="no-more-movies-sub">Загрузите фильмы в базу: в терминале из корня проекта выполните <code>./импорт_csv.sh</code> — скрипт скачает IMDB Top 1000 и импортирует их. После этого обновите страницу или перезайдите в комнату.</p>
            </div>
            <button onClick={() => setShowMovieLibrary(true)} className="secondary-button">Открыть библиотеку</button>
          </div>
        )}

        {!loading && currentMovie && movies && movies.length > 0 && (
          <>
            <div className="cardContainer">
              {(movies || []).slice(currentMovieIndex, currentMovieIndex + 3).map((movie, index) => (
                <SwipeCard
                  key={movie.id}
                  onSwipe={handleCardSwipe}
                  preventSwipe={['up', 'down']}
                  className="swipe"
                >
                  <div className="card">
                    <img
                      src={movie.poster_url}
                      alt={getMovieDisplayTitle(movie)}
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://via.placeholder.com/300x450?text=${encodeURIComponent(getMovieDisplayTitle(movie))}`;
                      }}
                    />
                    <div className="card-info">
                      <h3>{getMovieDisplayTitle(movie)}</h3>
                      <div className="movie-details">
                        {movie.year && <span>📅 {movie.year} год</span>}
                        {movie.duration && <span>⏱ {movie.duration} мин</span>}
                        {movie.imdb_rating && <span>⭐ IMDb: {movie.imdb_rating}</span>}
                        {movie.kp_rating && <span>⭐ КП: {movie.kp_rating}</span>}
                      </div>
                      {movie.description && <p className="movie-description">{movie.description}</p>}
                    </div>
                  </div>
                </SwipeCard>
              ))}
            </div>

            <div className="swipe-actions">
              <button
                onClick={() => handleSwipe('left')}
                disabled={loading}
                className="swipe-button dislike-button"
              >
                👎 Не нравится
              </button>
              <button
                onClick={() => handleSwipe('right')}
                disabled={loading}
                className="swipe-button like-button"
              >
                👍 Нравится
              </button>
            </div>
          </>
        )}

        {!loading && movies && movies.length > 0 && (!movies[currentMovieIndex] || currentMovieIndex >= movies.length) && !showMatchLinks && !showRecommendations && (
          <div className="no-more-movies">
            <div className="no-more-movies-header">
              <h2>🎬 Все фильмы просмотрены!</h2>
              <p className="no-more-movies-sub">Свайпы закончились — смотрите матчи и ссылки на просмотр</p>
            </div>
            {(matches || []).length > 0 ? (
              <div className="no-more-movies-content">
                <h3 className="matches-section-title">🎉 Ваши матчи ({(matches || []).length})</h3>
                <p className="matches-section-hint">Нажмите «Где посмотреть» — откроются ссылки на Кинопоиск, Старт, Окко и другие</p>
                <div className="matches-grid">
                  {(matches || []).filter((m): m is Match => !!m && !!(m as Match).id).map((m) => (
                    <div key={m.id} className="match-card">
                      {m.movie && (
                        <>
                          <img
                            src={m.movie.poster_url}
                            alt={getMovieDisplayTitle(m.movie ?? {})}
                            className="match-card-poster"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://via.placeholder.com/200x300?text=${encodeURIComponent(getMovieDisplayTitle(m.movie ?? {}))}`;
                            }}
                          />
                          <div className="match-card-info">
                            <h4>{getMovieDisplayTitle(m.movie ?? {})}</h4>
                            {m.movie.year && <span className="match-card-year">{m.movie.year}</span>}
                            <button
                              type="button"
                              onClick={() => {
                                setLastMatch(m);
                                setShowMatchLinks(true);
                              }}
                              className="primary-button match-watch-button"
                            >
                              🎬 Где посмотреть
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={handleLeaveRoom} className="secondary-button no-more-back">
                  Вернуться в меню
                </button>
              </div>
            ) : (
              <div className="no-more-movies-empty">
                <p>Пока нет совпадений — лайкните одни и те же фильмы с другом.</p>
                {(userGenres || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => showGenreRecommendations()}
                    className="primary-button"
                  >
                    🎯 Рекомендации по жанрам
                  </button>
                )}
                <button onClick={handleLeaveRoom} className="secondary-button no-more-back">
                  Вернуться в меню
                </button>
              </div>
            )}
          </div>
        )}

        {error && <p className="error-message">{error}</p>}
      </div>

      {/* Подвал */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>📧 Контакты</h3>
            <p>Email: <a href="mailto:info@kinoswipe.ru">info@kinoswipe.ru</a></p>
            <p>Телефон: <a href="tel:+79991234567">+7 (999) 123-45-67</a></p>
          </div>
          <div className="footer-section">
            <h3>🔗 Сообщество</h3>
            <p>
              <a href="https://t.me/kinoswipe" target="_blank" rel="noopener noreferrer">
                Telegram канал KinoSwipe
              </a>
            </p>
          </div>
          <div className="footer-section">
            <h3>🎬 О нас</h3>
            <p>Выбирайте фильмы вместе с друзьями!</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 KinoSwipe. Все права защищены.</p>
        </div>
      </footer>

      {/* Профиль пользователя */}
      {showProfile && user && (
        <Profile
          user={user}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* Библиотека фильмов */}
      {showMovieLibrary && (
        <MovieLibrary
          onClose={() => setShowMovieLibrary(false)}
          isAdmin={user?.user_type === 'admin'}
        />
      )}

      {/* Страница рекомендаций */}
      {showRecommendations && room && user && (
        <RecommendationPage
          userGenres={userGenres}
          roomId={room.id}
          userId={user.id}
          onClose={() => {
            setShowRecommendations(false);
            handleLeaveRoom();
          }}
          onSelectMovie={(movie) => {
            // При выборе фильма создаем матч или показываем ссылки
            console.log('Selected movie:', movie);
            setShowRecommendations(false);
            // Можно добавить логику создания матча для выбранного фильма
          }}
        />
      )}

      {/* Страница со ссылками после матча - показывается автоматически при матче */}
      {showMatchLinks && lastMatch && (
        <MatchLinksPage
          match={lastMatch}
          onClose={() => {
            setShowMatchLinks(false);
            setLastMatch(null);
            // Продолжаем свайпить после закрытия страницы со ссылками
            if (movies && currentMovieIndex < movies.length - 1) {
              setCurrentMovieIndex(currentMovieIndex + 1);
            } else {
              // Фильмы закончились, но матч был - показываем сообщение
              setError('');
            }
          }}
        />
      )}

    </div>
  );
};

export default App;
