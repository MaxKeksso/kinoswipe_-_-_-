import React, { useState, useEffect } from 'react';
import './OutfitMathPage.css';

interface ClothingItem {
  id: string;
  name: string;
  category: 'top' | 'bottom' | 'shoes' | 'outer' | 'accessory';
  emoji: string;
  color: string;
  price: number;
  wears: number;
  purchaseDate: string;
  tags: string[];
}

interface Outfit {
  top?: ClothingItem;
  bottom?: ClothingItem;
  shoes?: ClothingItem;
  outer?: ClothingItem;
}

const WEATHER_SCENARIOS = [
  { temp: 22, condition: 'sunny', icon: '☀️', desc: 'Солнечно', minTemp: 20, maxTemp: 25, rain: false },
  { temp: 15, condition: 'cloudy', icon: '⛅', desc: 'Облачно', minTemp: 12, maxTemp: 17, rain: false },
  { temp: 8, condition: 'rainy', icon: '🌧️', desc: 'Дождь', minTemp: 6, maxTemp: 10, rain: true },
  { temp: -3, condition: 'snowy', icon: '❄️', desc: 'Снег', minTemp: -5, maxTemp: 0, rain: false },
  { temp: 30, condition: 'hot', icon: '🌡️', desc: 'Жара', minTemp: 28, maxTemp: 33, rain: false },
];

const MOCK_WARDROBE: ClothingItem[] = [
  { id: '1', name: 'Белая футболка', category: 'top', emoji: '👕', color: '#fff', price: 1200, wears: 24, purchaseDate: '2023-03-15', tags: ['базовая', 'лето'] },
  { id: '2', name: 'Синяя джинсовка', category: 'outer', emoji: '🧥', color: '#4a7fbf', price: 4500, wears: 8, purchaseDate: '2023-09-10', tags: ['демисезон'] },
  { id: '3', name: 'Чёрные джинсы', category: 'bottom', emoji: '👖', color: '#1a1a1a', price: 3800, wears: 31, purchaseDate: '2022-11-01', tags: ['базовая'] },
  { id: '4', name: 'Белые кроссовки', category: 'shoes', emoji: '👟', color: '#f5f5f5', price: 8900, wears: 2, purchaseDate: '2024-01-20', tags: ['спорт'] },
  { id: '5', name: 'Полосатая рубашка', category: 'top', emoji: '👔', color: '#e8e8e8', price: 2500, wears: 5, purchaseDate: '2023-07-05', tags: ['офис'] },
  { id: '6', name: 'Бежевые брюки', category: 'bottom', emoji: '👖', color: '#d4c5a9', price: 3200, wears: 6, purchaseDate: '2023-06-20', tags: ['офис', 'базовая'] },
  { id: '7', name: 'Кожаные ботинки', category: 'shoes', emoji: '👞', color: '#4a3728', price: 12000, wears: 18, purchaseDate: '2022-09-01', tags: ['офис', 'зима'] },
  { id: '8', name: 'Пуховик', category: 'outer', emoji: '🧥', color: '#2d2d2d', price: 15000, wears: 22, purchaseDate: '2022-10-15', tags: ['зима'] },
];

const CATEGORY_LABELS = { top: 'Верх', bottom: 'Низ', shoes: 'Обувь', outer: 'Верхняя', accessory: 'Аксессуар' };

function getCPW(item: ClothingItem): number {
  return item.wears === 0 ? item.price : Math.round(item.price / item.wears);
}

function getCPWColor(cpw: number): string {
  if (cpw < 100) return '#1db954';
  if (cpw < 300) return '#f0a500';
  return '#ff4757';
}

function getCPWLabel(cpw: number): string {
  if (cpw < 100) return 'Отличная покупка';
  if (cpw < 300) return 'Норма';
  return 'Редко носишь!';
}

function generateOutfit(wardrobe: ClothingItem[], weather: typeof WEATHER_SCENARIOS[0]): Outfit {
  const outfit: Outfit = {};
  const tops = wardrobe.filter(i => i.category === 'top');
  const bottoms = wardrobe.filter(i => i.category === 'bottom');
  const shoes = wardrobe.filter(i => i.category === 'shoes');
  const outers = wardrobe.filter(i => i.category === 'outer');

  if (tops.length > 0) outfit.top = tops[Math.floor(Math.random() * tops.length)];
  if (bottoms.length > 0) outfit.bottom = bottoms[Math.floor(Math.random() * bottoms.length)];

  if (weather.temp < 15 && outers.length > 0) {
    outfit.outer = outers[Math.floor(Math.random() * outers.length)];
  }

  if (weather.rain && shoes.length > 0) {
    const boots = shoes.find(s => s.tags.includes('зима')) || shoes[0];
    outfit.shoes = boots;
  } else if (weather.temp > 20 && shoes.length > 0) {
    const sneakers = shoes.find(s => s.tags.includes('спорт')) || shoes[0];
    outfit.shoes = sneakers;
  } else if (shoes.length > 0) {
    outfit.shoes = shoes[Math.floor(Math.random() * shoes.length)];
  }

  return outfit;
}

const OutfitMathPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>(MOCK_WARDROBE);
  const [weather] = useState(WEATHER_SCENARIOS[Math.floor(Math.random() * WEATHER_SCENARIOS.length)]);
  const [currentOutfit, setCurrentOutfit] = useState<Outfit>({});
  const [tab, setTab] = useState<'outfit' | 'wardrobe' | 'stats'>('outfit');
  const [showAddItem, setShowAddItem] = useState(false);
  const [swipeCard, setSwipeCard] = useState<ClothingItem | null>(null);
  const [swipeQueue, setSwipeQueue] = useState<ClothingItem[]>([]);
  const [swipeHistory, setSwipeHistory] = useState<{ item: ClothingItem; liked: boolean }[]>([]);
  const [newItem, setNewItem] = useState({ name: '', category: 'top' as ClothingItem['category'], price: '', emoji: '👕' });
  const [outfitGenerated, setOutfitGenerated] = useState(false);
  const [notification, setNotification] = useState('');

  const CATEGORY_EMOJIS: Record<ClothingItem['category'], string> = {
    top: '👕', bottom: '👖', shoes: '👟', outer: '🧥', accessory: '💍'
  };

  useEffect(() => {
    setSwipeQueue([...wardrobe].sort(() => Math.random() - 0.5));
    if (swipeQueue.length > 0) setSwipeCard(swipeQueue[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (swipeQueue.length > 0) setSwipeCard(swipeQueue[0]);
    else setSwipeCard(null);
  }, [swipeQueue]);

  const pushNotif = (text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleGenerateOutfit = () => {
    const outfit = generateOutfit(wardrobe, weather);
    setCurrentOutfit(outfit);
    setOutfitGenerated(true);
    // Инкрементируем wears
    const updatedWardrobe = wardrobe.map(item => {
      const isInOutfit = Object.values(outfit).some(o => o?.id === item.id);
      return isInOutfit ? { ...item, wears: item.wears + 1 } : item;
    });
    setWardrobe(updatedWardrobe);
    pushNotif('Образ готов! Надевай и иди покорять мир 🚀');
  };

  const handleSwipe = (liked: boolean) => {
    if (!swipeCard) return;
    setSwipeHistory([...swipeHistory, { item: swipeCard, liked }]);
    const next = swipeQueue.slice(1);
    setSwipeQueue(next);
    if (!liked) {
      pushNotif(`${swipeCard.name} помечена как «редко ношу»`);
    }
  };

  const handleAddItem = () => {
    if (!newItem.name || !newItem.price) return;
    const item: ClothingItem = {
      id: Date.now().toString(),
      name: newItem.name,
      category: newItem.category,
      emoji: CATEGORY_EMOJIS[newItem.category],
      color: '#888',
      price: Number(newItem.price),
      wears: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      tags: [],
    };
    setWardrobe([...wardrobe, item]);
    setShowAddItem(false);
    setNewItem({ name: '', category: 'top', price: '', emoji: '👕' });
    pushNotif(`${item.name} добавлена в гардероб!`);
  };

  const totalItems = wardrobe.length;
  const totalSpent = wardrobe.reduce((s, i) => s + i.price, 0);
  const avgCPW = wardrobe.length > 0
    ? Math.round(wardrobe.reduce((s, i) => s + getCPW(i), 0) / wardrobe.length)
    : 0;
  const mostWorn = [...wardrobe].sort((a, b) => b.wears - a.wears)[0];
  const leastWorn = [...wardrobe].filter(i => i.wears < 3).sort((a, b) => a.wears - b.wears)[0];

  return (
    <div className="outfit-page">
      {notification && (
        <div className="outfit-notification">{notification}</div>
      )}

      {/* Шапка */}
      <div className="outfit-header">
        <button className="outfit-back-btn" onClick={onBack}>← Назад</button>
        <div className="outfit-header-title">
          <h1>👗 OutfitMath</h1>
          <p>Умный гардероб + Погода</p>
        </div>
        {/* Погода */}
        <div className="outfit-weather-chip">
          <span className="outfit-weather-icon">{weather.icon}</span>
          <div>
            <span className="outfit-weather-temp">{weather.temp}°C</span>
            <span className="outfit-weather-desc">{weather.desc}</span>
          </div>
        </div>
      </div>

      {/* Табы */}
      <div className="outfit-tabs">
        <button className={`outfit-tab ${tab === 'outfit' ? 'active' : ''}`} onClick={() => setTab('outfit')}>
          ✨ Образ дня
        </button>
        <button className={`outfit-tab ${tab === 'wardrobe' ? 'active' : ''}`} onClick={() => setTab('wardrobe')}>
          👗 Гардероб
        </button>
        <button className={`outfit-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>
          📊 Статистика
        </button>
      </div>

      {/* ОБРАЗ ДНЯ */}
      {tab === 'outfit' && (
        <div className="outfit-content">
          {/* Прогноз */}
          <div className="outfit-weather-card">
            <div className="outfit-weather-main">
              <span className="outfit-weather-big">{weather.icon}</span>
              <div>
                <h2>{weather.temp}°C — {weather.desc}</h2>
                <p>{weather.minTemp}° / {weather.maxTemp}° · {weather.rain ? '☔ Возьми зонт' : 'Зонт не нужен'}</p>
              </div>
            </div>
            <p className="outfit-weather-advice">
              {weather.temp > 20 ? 'Лёгкая одежда, солнцезащитный крем' :
               weather.temp > 10 ? 'Лёгкая куртка или джинсовка' :
               weather.temp > 0 ? 'Тёплая куртка, обязательно' :
               'Максимально тепло, несколько слоёв'}
            </p>
          </div>

          {/* Образ */}
          {outfitGenerated ? (
            <div className="outfit-result">
              <h2>Твой образ на сегодня</h2>
              <div className="outfit-items-grid">
                {Object.entries(currentOutfit).map(([slot, item]) => item && (
                  <div key={slot} className="outfit-item-card">
                    <span className="outfit-item-emoji">{item.emoji}</span>
                    <div className="outfit-item-info">
                      <strong>{item.name}</strong>
                      <span className="outfit-item-slot">{CATEGORY_LABELS[item.category as keyof typeof CATEGORY_LABELS]}</span>
                    </div>
                    <div className="outfit-item-cpw" style={{ color: getCPWColor(getCPW(item)) }}>
                      ₽{getCPW(item)}/надев.
                    </div>
                  </div>
                ))}
              </div>
              <div className="outfit-actions">
                <button className="outfit-btn-primary" onClick={handleGenerateOutfit}>
                  🔀 Другой вариант
                </button>
                <button
                  className="outfit-btn-ghost"
                  onClick={() => pushNotif('Образ сохранён в избранное!')}
                >
                  ❤️ Сохранить
                </button>
              </div>
            </div>
          ) : (
            <div className="outfit-generate-block">
              <div className="outfit-generate-icon">🎲</div>
              <h2>Готов к выбору образа?</h2>
              <p>Приложение учтёт погоду ({weather.temp}°C, {weather.desc}) и подберёт лучшее из твоего гардероба</p>
              <button className="outfit-btn-primary large" onClick={handleGenerateOutfit}>
                ✨ Подобрать образ
              </button>
            </div>
          )}

          {/* Tinder для одежды */}
          {swipeCard && (
            <div className="outfit-swipe-section">
              <h2>👗 Что из этого ты носишь?</h2>
              <p className="outfit-swipe-hint">Свайп влево — редко ношу, вправо — люблю</p>
              <div className="outfit-swipe-card">
                <div className="outfit-swipe-emoji">{swipeCard.emoji}</div>
                <h3>{swipeCard.name}</h3>
                <p className="outfit-swipe-meta">
                  {CATEGORY_LABELS[swipeCard.category]} · ₽{swipeCard.price} · надевал {swipeCard.wears} раз
                </p>
                <div className="outfit-swipe-cpw" style={{ color: getCPWColor(getCPW(swipeCard)) }}>
                  ₽{getCPW(swipeCard)} за надевание — {getCPWLabel(getCPW(swipeCard))}
                </div>
                <div className="outfit-swipe-btns">
                  <button className="outfit-swipe-no" onClick={() => handleSwipe(false)}>
                    👎 Редко
                  </button>
                  <button className="outfit-swipe-yes" onClick={() => handleSwipe(true)}>
                    👍 Ношу
                  </button>
                </div>
                <p className="outfit-swipe-counter">Осталось: {swipeQueue.length}</p>
              </div>
            </div>
          )}
          {!swipeCard && swipeHistory.length > 0 && (
            <div className="outfit-swipe-done">
              ✅ Ты оценил всю одежду! Статистика обновлена.
            </div>
          )}
        </div>
      )}

      {/* ГАРДЕРОБ */}
      {tab === 'wardrobe' && (
        <div className="outfit-content">
          <div className="outfit-section-header">
            <h2>Мой гардероб ({wardrobe.length} вещей)</h2>
            <button className="outfit-add-btn" onClick={() => setShowAddItem(true)}>+ Добавить</button>
          </div>

          {showAddItem && (
            <div className="outfit-add-form">
              <h3>Новая вещь</h3>
              <input
                className="outfit-input"
                placeholder="Название (напр. «Синее пальто»)"
                value={newItem.name}
                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
              />
              <select
                className="outfit-select"
                value={newItem.category}
                onChange={e => setNewItem({ ...newItem, category: e.target.value as ClothingItem['category'] })}
              >
                <option value="top">👕 Верх</option>
                <option value="bottom">👖 Низ</option>
                <option value="shoes">👟 Обувь</option>
                <option value="outer">🧥 Верхняя одежда</option>
                <option value="accessory">💍 Аксессуар</option>
              </select>
              <input
                className="outfit-input"
                type="number"
                placeholder="Стоимость (₽)"
                value={newItem.price}
                onChange={e => setNewItem({ ...newItem, price: e.target.value })}
              />
              <div className="outfit-form-actions">
                <button className="outfit-btn-primary" onClick={handleAddItem}>Добавить</button>
                <button className="outfit-btn-ghost" onClick={() => setShowAddItem(false)}>Отмена</button>
              </div>
            </div>
          )}

          <div className="outfit-wardrobe-grid">
            {wardrobe.map(item => {
              const cpw = getCPW(item);
              return (
                <div key={item.id} className="outfit-wardrobe-card">
                  <div className="outfit-wardrobe-emoji">{item.emoji}</div>
                  <div className="outfit-wardrobe-info">
                    <strong>{item.name}</strong>
                    <span className="outfit-wardrobe-cat">{CATEGORY_LABELS[item.category]}</span>
                  </div>
                  <div className="outfit-wardrobe-stats">
                    <span className="outfit-wears-badge">{item.wears}×</span>
                    <span className="outfit-cpw-badge" style={{ color: getCPWColor(cpw) }}>
                      ₽{cpw}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* СТАТИСТИКА */}
      {tab === 'stats' && (
        <div className="outfit-content">
          <h2>📊 Аналитика гардероба</h2>

          <div className="outfit-stats-grid">
            <div className="outfit-stat-card">
              <span className="outfit-stat-icon">👗</span>
              <span className="outfit-stat-value">{totalItems}</span>
              <span className="outfit-stat-label">Вещей всего</span>
            </div>
            <div className="outfit-stat-card">
              <span className="outfit-stat-icon">💰</span>
              <span className="outfit-stat-value">₽{totalSpent.toLocaleString()}</span>
              <span className="outfit-stat-label">Потрачено</span>
            </div>
            <div className="outfit-stat-card">
              <span className="outfit-stat-icon">📉</span>
              <span className="outfit-stat-value" style={{ color: getCPWColor(avgCPW) }}>₽{avgCPW}</span>
              <span className="outfit-stat-label">Средн. цена/надев.</span>
            </div>
          </div>

          {mostWorn && (
            <div className="outfit-insight-card green">
              <div className="outfit-insight-icon">🏆</div>
              <div>
                <h3>Любимчик гардероба</h3>
                <p>{mostWorn.emoji} {mostWorn.name} — надевал {mostWorn.wears} раз. Цена надевания: <strong style={{ color: '#1db954' }}>₽{getCPW(mostWorn)}</strong></p>
              </div>
            </div>
          )}

          {leastWorn && (
            <div className="outfit-insight-card red">
              <div className="outfit-insight-icon">⚠️</div>
              <div>
                <h3>Забытая вещь</h3>
                <p>
                  {leastWorn.emoji} {leastWorn.name} — куплена за ₽{leastWorn.price.toLocaleString()}, надета {leastWorn.wears} раз.
                  Цена надевания: <strong style={{ color: '#ff4757' }}>₽{getCPW(leastWorn)}</strong>
                </p>
                <p className="outfit-advice">💡 Не покупай похожее в будущем — ты не носишь такое.</p>
              </div>
            </div>
          )}

          {/* CPW таблица */}
          <div className="outfit-cpw-section">
            <h3>Cost Per Wear — все вещи</h3>
            <div className="outfit-cpw-list">
              {[...wardrobe].sort((a, b) => getCPW(a) - getCPW(b)).map(item => {
                const cpw = getCPW(item);
                const maxCPW = Math.max(...wardrobe.map(getCPW));
                const pct = maxCPW > 0 ? (cpw / maxCPW) * 100 : 0;
                return (
                  <div key={item.id} className="outfit-cpw-row">
                    <span className="outfit-cpw-emoji">{item.emoji}</span>
                    <span className="outfit-cpw-name">{item.name}</span>
                    <div className="outfit-cpw-bar-wrap">
                      <div
                        className="outfit-cpw-bar"
                        style={{ width: `${pct}%`, background: getCPWColor(cpw) }}
                      />
                    </div>
                    <span className="outfit-cpw-value" style={{ color: getCPWColor(cpw) }}>₽{cpw}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="outfit-tip-card">
            <h3>🧠 Совет</h3>
            <p>Оптимальный cost-per-wear — менее ₽100. Если вещь стоит ₽5000 и ты надел её 50 раз — это отличная покупка. Если купил за ₽500 и надел 2 раза — это провал.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutfitMathPage;
