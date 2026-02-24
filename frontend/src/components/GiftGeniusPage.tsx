import React, { useState } from 'react';
import './GiftGeniusPage.css';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  birthday: string;
  interests: string[];
  budget: number;
}

interface GiftIdea {
  id: string;
  name: string;
  emoji: string;
  price: number;
  shop: string;
  shopIcon: string;
  category: string;
  score: number;
  reason: string;
  antiGift?: boolean;
}

const AVATARS = ['🧑', '👩', '👨', '👧', '🧒', '👱', '🧔', '👩‍🦰'];

const INTEREST_OPTIONS = [
  { id: 'gaming', label: 'Геймер', emoji: '🎮' },
  { id: 'music', label: 'Музыка', emoji: '🎵' },
  { id: 'sport', label: 'Спорт', emoji: '⚽' },
  { id: 'cooking', label: 'Кулинария', emoji: '🍳' },
  { id: 'travel', label: 'Путешествия', emoji: '✈️' },
  { id: 'books', label: 'Книги', emoji: '📚' },
  { id: 'art', label: 'Рисование/Арт', emoji: '🎨' },
  { id: 'tech', label: 'Технологии', emoji: '💻' },
  { id: 'fashion', label: 'Мода', emoji: '👗' },
  { id: 'cinema', label: 'Кино', emoji: '🎬' },
  { id: 'nature', label: 'Природа', emoji: '🌿' },
  { id: 'cats', label: 'Животные', emoji: '🐱' },
];

const GIFT_DATABASE: Record<string, GiftIdea[]> = {
  gaming: [
    { id: 'g1', name: 'Игровая мышь SteelSeries Rival 3', emoji: '🖱️', price: 2490, shop: 'Ozon', shopIcon: '🔵', category: 'Гаджеты', score: 95, reason: 'Топ выбор для геймеров, отличная точность' },
    { id: 'g2', name: 'Подарочная карта Steam 500₽', emoji: '🎮', price: 500, shop: 'Wildberries', shopIcon: '🟣', category: 'Игры', score: 98, reason: 'Он сам выберет то, что хочет' },
    { id: 'g3', name: 'Игровая гарнитура Logitech G432', emoji: '🎧', price: 3200, shop: 'Ozon', shopIcon: '🔵', category: 'Гаджеты', score: 88, reason: 'Объёмный звук для иммерсивного геймплея' },
  ],
  music: [
    { id: 'm1', name: 'Подписка Яндекс Плюс на 3 мес', emoji: '🎵', price: 399, shop: 'Яндекс', shopIcon: '🟡', category: 'Подписки', score: 97, reason: 'Миллионы треков в кармане' },
    { id: 'm2', name: 'Bluetooth колонка JBL GO 3', emoji: '🔊', price: 2800, shop: 'Ozon', shopIcon: '🔵', category: 'Гаджеты', score: 92, reason: 'Компактная, водонепроницаемая, громкая' },
    { id: 'm3', name: 'Виниловая пластинка (любимый исполнитель)', emoji: '💿', price: 1800, shop: 'Wildberries', shopIcon: '🟣', category: 'Музыка', score: 85, reason: 'Аутентичный подарок для ценителей' },
  ],
  sport: [
    { id: 's1', name: 'Спортивная бутылка Hydra Flask', emoji: '🚰', price: 1200, shop: 'Wildberries', shopIcon: '🟣', category: 'Спорт', score: 90, reason: 'Держит температуру 24ч, не разольётся' },
    { id: 's2', name: 'Фитнес-браслет Xiaomi Band 8', emoji: '⌚', price: 3500, shop: 'Ozon', shopIcon: '🔵', category: 'Гаджеты', score: 94, reason: 'Пульс, шаги, сон — всё в одном' },
    { id: 's3', name: 'Абонемент в спортзал на 1 мес', emoji: '🏋️', price: 2500, shop: 'Напрямую', shopIcon: '🏪', category: 'Спорт', score: 88, reason: 'Мотивация для старта' },
  ],
  cooking: [
    { id: 'c1', name: 'Набор специй "Мира вкусов"', emoji: '🌶️', price: 890, shop: 'Wildberries', shopIcon: '🟣', category: 'Кулинария', score: 91, reason: '20 специй со всего мира для экспериментов' },
    { id: 'c2', name: 'Книга "Соль, жир, кислота, жар"', emoji: '📖', price: 1400, shop: 'Ozon', shopIcon: '🔵', category: 'Книги', score: 89, reason: 'Бестселлер для тех кто хочет готовить по-настоящему' },
    { id: 'c3', name: 'Мастер-класс по итальянской кухне', emoji: '🍝', price: 3500, shop: 'Znamus', shopIcon: '🟢', category: 'Опыт', score: 96, reason: 'Незабываемый опыт, можно пойти вместе' },
  ],
  travel: [
    { id: 't1', name: 'Компактный дорожный адаптер', emoji: '🔌', price: 650, shop: 'Wildberries', shopIcon: '🟣', category: 'Путешествия', score: 87, reason: 'Работает в 150+ странах, всегда нужен' },
    { id: 't2', name: 'Шейный кошелёк антивор', emoji: '👜', price: 1100, shop: 'Ozon', shopIcon: '🔵', category: 'Путешествия', score: 93, reason: 'RFID-защита, для документов и карт' },
    { id: 't3', name: 'Аромадиффузор "Дорога" (набор)', emoji: '✈️', price: 1800, shop: 'Wildberries', shopIcon: '🟣', category: 'Атмосфера', score: 82, reason: 'Запах дороги дома — для мечтателей' },
  ],
  books: [
    { id: 'b1', name: 'Электронная книга PocketBook 617', emoji: '📖', price: 8900, shop: 'Ozon', shopIcon: '🔵', category: 'Гаджеты', score: 96, reason: 'Библиотека в кармане, глаза не устают' },
    { id: 'b2', name: 'Подписка Bookmate на 3 мес', emoji: '📚', price: 459, shop: 'Bookmate', shopIcon: '🟤', category: 'Подписки', score: 91, reason: '1 млн+ книг, слушай и читай' },
    { id: 'b3', name: 'Подарочный набор закладок + кофе', emoji: '☕', price: 780, shop: 'Wildberries', shopIcon: '🟣', category: 'Уют', score: 84, reason: 'Маленький, но тёплый подарок' },
  ],
  tech: [
    { id: 'tech1', name: 'Беспроводная зарядка Belkin 15W', emoji: '⚡', price: 2100, shop: 'Ozon', shopIcon: '🔵', category: 'Гаджеты', score: 94, reason: 'Быстрая зарядка без проводов' },
    { id: 'tech2', name: 'USB-хаб на 7 портов', emoji: '🔌', price: 1350, shop: 'Wildberries', shopIcon: '🟣', category: 'Гаджеты', score: 89, reason: 'Никогда не хватает портов — факт' },
    { id: 'tech3', name: 'Курс Яндекс Практикум (1 мес)', emoji: '💡', price: 4900, shop: 'Яндекс', shopIcon: '🟡', category: 'Обучение', score: 92, reason: 'Инвестиция в навыки' },
  ],
  cinema: [
    { id: 'cin1', name: 'Подписка Кинопоиск на 3 мес', emoji: '🎬', price: 399, shop: 'Яндекс', shopIcon: '🟡', category: 'Подписки', score: 97, reason: 'Тысячи фильмов и сериалов' },
    { id: 'cin2', name: 'Визит в кино на 2 (сертификат)', emoji: '🎟️', price: 1200, shop: 'Синема Парк', shopIcon: '🎪', category: 'Опыт', score: 95, reason: 'Пойдите вместе — это и есть подарок' },
    { id: 'cin3', name: 'Набор попкорна "Кинотеатр дома"', emoji: '🍿', price: 650, shop: 'Wildberries', shopIcon: '🟣', category: 'Уют', score: 83, reason: 'Карамельный, соленый, острый — всё' },
  ],
};

const ANTI_GIFT_DB: Record<string, string> = {
  gaming: 'Не дари случайные игры без знания его библиотеки Steam — скорее всего, они уже есть',
  music: 'Не дари дешёвые Bluetooth-колонки с AliExpress — лучше меньше, но качественнее',
  sport: 'Не дари спортивную одежду без размера — гарантированный возврат',
  cooking: 'Не дари обычную кухонную утварь (ложки, доски) — уже есть у всех',
  travel: 'Не дари туристические сувениры "оттуда" — избегай штампованных вещей',
  books: 'Не дари книгу, которую он "должен прочитать" — дари то, что ему интересно',
  tech: 'Не дари гаджеты без знания его устройств (Android vs iPhone несовместимы)',
  cinema: 'Не дари диски Blu-ray — у него нет проигрывателя',
};

function generateGiftIdeas(friend: Friend): { good: GiftIdea[]; anti: string[] } {
  const ideas: GiftIdea[] = [];
  const antis: string[] = [];

  friend.interests.forEach(interest => {
    const gifts = GIFT_DATABASE[interest] || [];
    gifts.forEach(g => {
      if (g.price <= friend.budget * 1.2) {
        ideas.push(g);
      }
    });
    if (ANTI_GIFT_DB[interest]) {
      antis.push(ANTI_GIFT_DB[interest]);
    }
  });

  // Сортируем по score
  const sorted = ideas.sort((a, b) => b.score - a.score).slice(0, 5);
  return { good: sorted, anti: antis.slice(0, 3) };
}

function daysUntilBirthday(dateStr: string): number {
  if (!dateStr) return 999;
  const today = new Date();
  const bd = new Date(dateStr);
  const next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const GiftGeniusPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [friends, setFriends] = useState<Friend[]>([
    { id: '1', name: 'Андрей', avatar: '🧑', birthday: '2026-03-15', interests: ['gaming', 'tech'], budget: 3000 },
    { id: '2', name: 'Маша', avatar: '👩', birthday: '2026-04-02', interests: ['cooking', 'travel'], budget: 2000 },
    { id: '3', name: 'Лёша', avatar: '👨', birthday: '2026-06-20', interests: ['music', 'cinema'], budget: 1500 },
  ]);
  const [tab, setTab] = useState<'friends' | 'ideas' | 'calendar'>('friends');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [giftResult, setGiftResult] = useState<{ good: GiftIdea[]; anti: string[] } | null>(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [notification, setNotification] = useState('');
  const [newFriend, setNewFriend] = useState({
    name: '', birthday: '', interests: [] as string[], budget: 2000, avatar: AVATARS[0]
  });

  const pushNotif = (text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleAnalyze = (friend: Friend) => {
    setSelectedFriend(friend);
    setIsAnalyzing(true);
    setGiftResult(null);
    setTab('ideas');
    setTimeout(() => {
      const result = generateGiftIdeas(friend);
      setGiftResult(result);
      setIsAnalyzing(false);
    }, 1800);
  };

  const handleAddFriend = () => {
    if (!newFriend.name.trim()) return;
    const friend: Friend = {
      id: Date.now().toString(),
      name: newFriend.name.trim(),
      avatar: newFriend.avatar,
      birthday: newFriend.birthday,
      interests: newFriend.interests,
      budget: newFriend.budget,
    };
    setFriends([...friends, friend]);
    setShowAddFriend(false);
    setNewFriend({ name: '', birthday: '', interests: [], budget: 2000, avatar: AVATARS[0] });
    pushNotif(`${friend.name} добавлен! Напомним о дне рождения.`);
  };

  const toggleInterest = (id: string) => {
    setNewFriend(f => ({
      ...f,
      interests: f.interests.includes(id)
        ? f.interests.filter(i => i !== id)
        : [...f.interests, id]
    }));
  };

  const sortedFriends = [...friends].sort((a, b) => daysUntilBirthday(a.birthday) - daysUntilBirthday(b.birthday));

  return (
    <div className="gift-page">
      {notification && <div className="gift-notification">🎁 {notification}</div>}

      {/* Шапка */}
      <div className="gift-header">
        <button className="gift-back-btn" onClick={onBack}>← Назад</button>
        <div className="gift-header-title">
          <h1>🎁 GiftGenius</h1>
          <p>AI-подбор подарков по интересам</p>
        </div>
        <div className="gift-header-badge">
          <span className="gift-ai-badge">✨ AI</span>
        </div>
      </div>

      {/* Табы */}
      <div className="gift-tabs">
        <button className={`gift-tab ${tab === 'friends' ? 'active' : ''}`} onClick={() => setTab('friends')}>
          👥 Друзья
        </button>
        <button className={`gift-tab ${tab === 'ideas' ? 'active' : ''}`} onClick={() => setTab('ideas')}>
          💡 Идеи подарков
        </button>
        <button className={`gift-tab ${tab === 'calendar' ? 'active' : ''}`} onClick={() => setTab('calendar')}>
          📅 Календарь
        </button>
      </div>

      {/* ДРУЗЬЯ */}
      {tab === 'friends' && (
        <div className="gift-content">
          <div className="gift-section-header">
            <h2>Мои друзья ({friends.length})</h2>
            <button className="gift-add-btn" onClick={() => setShowAddFriend(true)}>+ Добавить</button>
          </div>

          {showAddFriend && (
            <div className="gift-add-card">
              <h3>Новый друг</h3>
              <div className="gift-avatar-picker">
                {AVATARS.map(a => (
                  <button
                    key={a}
                    className={`gift-avatar-btn ${newFriend.avatar === a ? 'selected' : ''}`}
                    onClick={() => setNewFriend(f => ({ ...f, avatar: a }))}
                  >{a}</button>
                ))}
              </div>
              <input
                className="gift-input"
                placeholder="Имя"
                value={newFriend.name}
                onChange={e => setNewFriend(f => ({ ...f, name: e.target.value }))}
              />
              <label className="gift-label">День рождения</label>
              <input
                className="gift-input"
                type="date"
                value={newFriend.birthday}
                onChange={e => setNewFriend(f => ({ ...f, birthday: e.target.value }))}
              />
              <label className="gift-label">Бюджет подарка (₽)</label>
              <div className="gift-budget-row">
                {[500, 1000, 2000, 3000, 5000, 10000].map(b => (
                  <button
                    key={b}
                    className={`gift-budget-btn ${newFriend.budget === b ? 'selected' : ''}`}
                    onClick={() => setNewFriend(f => ({ ...f, budget: b }))}
                  >₽{b.toLocaleString()}</button>
                ))}
              </div>
              <label className="gift-label">Интересы (выберите несколько)</label>
              <div className="gift-interests-grid">
                {INTEREST_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    className={`gift-interest-btn ${newFriend.interests.includes(opt.id) ? 'selected' : ''}`}
                    onClick={() => toggleInterest(opt.id)}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
              <div className="gift-form-actions">
                <button className="gift-btn-primary" onClick={handleAddFriend}>Добавить друга</button>
                <button className="gift-btn-ghost" onClick={() => setShowAddFriend(false)}>Отмена</button>
              </div>
            </div>
          )}

          <div className="gift-friends-list">
            {friends.map(friend => {
              const days = daysUntilBirthday(friend.birthday);
              const isUrgent = days <= 14;
              const isSoon = days <= 30;
              return (
                <div key={friend.id} className={`gift-friend-card ${isUrgent ? 'urgent' : isSoon ? 'soon' : ''}`}>
                  <div className="gift-friend-avatar">{friend.avatar}</div>
                  <div className="gift-friend-info">
                    <strong className="gift-friend-name">{friend.name}</strong>
                    <div className="gift-friend-interests">
                      {friend.interests.slice(0, 3).map(i => {
                        const opt = INTEREST_OPTIONS.find(o => o.id === i);
                        return opt ? <span key={i} className="gift-interest-chip">{opt.emoji}</span> : null;
                      })}
                    </div>
                    <div className="gift-friend-meta">
                      {friend.birthday && (
                        <span className={`gift-birthday-badge ${isUrgent ? 'urgent' : isSoon ? 'soon' : ''}`}>
                          {isUrgent ? '🔥' : isSoon ? '⏰' : '🎂'} {days} дн.
                        </span>
                      )}
                      <span className="gift-budget-badge">₽{friend.budget.toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    className="gift-analyze-btn"
                    onClick={() => handleAnalyze(friend)}
                  >
                    ✨ Подобрать
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ИДЕИ ПОДАРКОВ */}
      {tab === 'ideas' && (
        <div className="gift-content">
          {!selectedFriend && !isAnalyzing && !giftResult && (
            <div className="gift-empty-state">
              <div className="gift-empty-icon">🤔</div>
              <h2>Выберите друга</h2>
              <p>Перейдите на вкладку «Друзья» и нажмите «Подобрать»</p>
              <button className="gift-btn-primary" onClick={() => setTab('friends')}>
                👥 К списку друзей
              </button>
            </div>
          )}

          {isAnalyzing && (
            <div className="gift-analyzing">
              <div className="gift-analyzing-icon">🤖</div>
              <h2>AI анализирует интересы...</h2>
              <p>Подбираем лучшие подарки для {selectedFriend?.name}</p>
              <div className="gift-progress-bar">
                <div className="gift-progress-fill" />
              </div>
              <div className="gift-analyzing-steps">
                <span>✅ Анализируем профиль</span>
                <span>🔄 Подбираем варианты</span>
                <span>⏳ Оцениваем по бюджету</span>
              </div>
            </div>
          )}

          {giftResult && selectedFriend && !isAnalyzing && (
            <div className="gift-results">
              <div className="gift-results-header">
                <h2>Подарки для {selectedFriend.avatar} {selectedFriend.name}</h2>
                <p>Бюджет: до ₽{selectedFriend.budget.toLocaleString()} · AI подобрал {giftResult.good.length} идей</p>
              </div>

              {/* Топ идеи */}
              <div className="gift-ideas-list">
                {giftResult.good.map((idea, i) => (
                  <div key={idea.id} className={`gift-idea-card ${i === 0 ? 'top-pick' : ''}`}>
                    {i === 0 && <div className="gift-top-badge">🏆 Лучший выбор</div>}
                    <div className="gift-idea-main">
                      <span className="gift-idea-emoji">{idea.emoji}</span>
                      <div className="gift-idea-info">
                        <strong>{idea.name}</strong>
                        <p className="gift-idea-reason">{idea.reason}</p>
                        <div className="gift-idea-tags">
                          <span className="gift-tag-shop">{idea.shopIcon} {idea.shop}</span>
                          <span className="gift-tag-category">{idea.category}</span>
                        </div>
                      </div>
                      <div className="gift-idea-right">
                        <span className="gift-idea-price">₽{idea.price.toLocaleString()}</span>
                        <div className="gift-score-bar">
                          <div className="gift-score-fill" style={{ width: `${idea.score}%` }} />
                        </div>
                        <span className="gift-score-text">{idea.score}% совпадение</span>
                      </div>
                    </div>
                    <button
                      className="gift-buy-btn"
                      onClick={() => pushNotif(`Открываем ${idea.shop} для "${idea.name}"`)}
                    >
                      Купить на {idea.shop} →
                    </button>
                  </div>
                ))}
              </div>

              {/* Анти-подарки */}
              {giftResult.anti.length > 0 && (
                <div className="gift-anti-section">
                  <h3>🚫 Анти-подарки — что точно не дарить</h3>
                  <div className="gift-anti-list">
                    {giftResult.anti.map((anti, i) => (
                      <div key={i} className="gift-anti-card">
                        <span className="gift-anti-icon">⛔</span>
                        <p>{anti}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className="gift-btn-ghost" onClick={() => setTab('friends')}>
                ← Другой друг
              </button>
            </div>
          )}
        </div>
      )}

      {/* КАЛЕНДАРЬ */}
      {tab === 'calendar' && (
        <div className="gift-content">
          <h2 className="gift-section-title">📅 Ближайшие дни рождения</h2>
          <p className="gift-section-sub">Напоминания за 14 дней до события</p>

          <div className="gift-calendar-list">
            {sortedFriends.map(friend => {
              const days = daysUntilBirthday(friend.birthday);
              const isUrgent = days <= 7;
              const isSoon = days <= 30;
              const bd = friend.birthday ? new Date(friend.birthday) : null;

              return (
                <div key={friend.id} className={`gift-cal-card ${isUrgent ? 'urgent' : isSoon ? 'soon' : ''}`}>
                  <div className="gift-cal-avatar">{friend.avatar}</div>
                  <div className="gift-cal-info">
                    <strong>{friend.name}</strong>
                    {bd && (
                      <p>{bd.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>
                    )}
                  </div>
                  <div className="gift-cal-days">
                    {isUrgent ? (
                      <span className="gift-cal-badge urgent">🔥 Скоро!</span>
                    ) : isSoon ? (
                      <span className="gift-cal-badge soon">⏰ {days} дн.</span>
                    ) : (
                      <span className="gift-cal-badge">{days} дн.</span>
                    )}
                  </div>
                  <button className="gift-cal-btn" onClick={() => { handleAnalyze(friend); setTab('ideas'); }}>
                    🎁 Подобрать
                  </button>
                </div>
              );
            })}
          </div>

          <div className="gift-reminder-tip">
            <h3>💡 Советы</h3>
            <ul>
              <li>Покупай подарок минимум за 3-5 дней до события — доставка может задержаться</li>
              <li>Лучшие подарки — опыт и впечатления, а не вещи</li>
              <li>Если не знаешь что подарить — подарочная карта лучше случайной вещи</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftGeniusPage;
