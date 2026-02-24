import React, { useState } from 'react';
import './SplitSubscribePage.css';

interface Member {
  id: string;
  name: string;
  avatar: string;
}

interface Subscription {
  id: string;
  name: string;
  icon: string;
  totalCost: number;
  members: string[];
  paidBy: string;
  color: string;
}

interface ShareListing {
  id: string;
  service: string;
  icon: string;
  slotsTotal: number;
  slotsFilled: number;
  pricePerSlot: number;
  host: string;
  description: string;
}

const SERVICES = [
  { name: 'Netflix', icon: '🎬', color: '#E50914' },
  { name: 'Яндекс Плюс', icon: '🎵', color: '#FFCC00' },
  { name: 'Spotify', icon: '🎧', color: '#1DB954' },
  { name: 'YouTube Premium', icon: '▶️', color: '#FF0000' },
  { name: 'Apple Music', icon: '🍎', color: '#FA243C' },
  { name: 'VPN (NordVPN)', icon: '🔒', color: '#4687FF' },
  { name: 'Кинопоиск', icon: '🎥', color: '#FF6600' },
  { name: 'Disney+', icon: '✨', color: '#113CCF' },
];

const MOCK_LISTINGS: ShareListing[] = [
  { id: '1', service: 'YouTube Premium', icon: '▶️', slotsTotal: 5, slotsFilled: 3, pricePerSlot: 99, host: 'Андрей К.', description: 'Семейная подписка, ищу ещё 2 человека' },
  { id: '2', service: 'Netflix', icon: '🎬', slotsTotal: 4, slotsFilled: 2, pricePerSlot: 200, host: 'Маша Л.', description: 'Подписка Стандарт с рекламой' },
  { id: '3', service: 'Яндекс Плюс', icon: '🎵', slotsTotal: 6, slotsFilled: 5, pricePerSlot: 80, host: 'Дима В.', description: 'Яндекс Плюс Мульти, последний слот!' },
  { id: '4', service: 'Spotify', icon: '🎧', slotsTotal: 6, slotsFilled: 4, pricePerSlot: 70, host: 'Юля П.', description: 'Premium для семьи' },
  { id: '5', service: 'VPN (NordVPN)', icon: '🔒', slotsTotal: 6, slotsFilled: 1, pricePerSlot: 120, host: 'Саша М.', description: '6 устройств одновременно, быстрый' },
];

const SplitSubscribePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [tab, setTab] = useState<'family' | 'market'>('family');
  const [members, setMembers] = useState<Member[]>([
    { id: '1', name: 'Вы', avatar: '😎' },
    { id: '2', name: 'Андрей', avatar: '🧑' },
    { id: '3', name: 'Маша', avatar: '👩' },
  ]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([
    { id: '1', name: 'Netflix', icon: '🎬', totalCost: 799, members: ['1', '2', '3'], paidBy: '1', color: '#E50914' },
    { id: '2', name: 'Яндекс Плюс', icon: '🎵', totalCost: 480, members: ['1', '3'], paidBy: '2', color: '#FFCC00' },
    { id: '3', name: 'Spotify', icon: '🎧', totalCost: 420, members: ['2', '3'], paidBy: '3', color: '#1DB954' },
  ]);
  const [showAddSub, setShowAddSub] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubCost, setNewSubCost] = useState('');
  const [newSubMembers, setNewSubMembers] = useState<string[]>([]);
  const [newSubPaidBy, setNewSubPaidBy] = useState('');
  const [listings, setListings] = useState<ShareListing[]>(MOCK_LISTINGS);
  const [requestedSlots, setRequestedSlots] = useState<string[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationText, setNotificationText] = useState('');

  const AVATARS = ['😎', '🧑', '👩', '👨', '🧒', '👧', '🧔', '👱'];

  const pushNotification = (text: string) => {
    setNotificationText(text);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  // Расчёт долгов
  const calculateDebts = () => {
    const balances: Record<string, number> = {};
    members.forEach(m => { balances[m.id] = 0; });

    subscriptions.forEach(sub => {
      if (sub.members.length === 0) return;
      const share = sub.totalCost / sub.members.length;
      sub.members.forEach(memberId => {
        balances[memberId] = (balances[memberId] || 0) - share;
      });
      balances[sub.paidBy] = (balances[sub.paidBy] || 0) + sub.totalCost;
    });

    const debts: { from: string; to: string; amount: number }[] = [];
    const debtors = members.filter(m => balances[m.id] < -0.5);
    const creditors = members.filter(m => balances[m.id] > 0.5);

    debtors.forEach(debtor => {
      let remaining = Math.abs(balances[debtor.id]);
      creditors.forEach(creditor => {
        if (remaining < 0.5 || balances[creditor.id] < 0.5) return;
        const amount = Math.min(remaining, balances[creditor.id]);
        debts.push({ from: debtor.id, to: creditor.id, amount: Math.round(amount) });
        remaining -= amount;
        balances[creditor.id] -= amount;
      });
    });
    return debts;
  };

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || '?';
  const getMemberAvatar = (id: string) => members.find(m => m.id === id)?.avatar || '👤';

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const newMember: Member = {
      id: Date.now().toString(),
      name: newMemberName.trim(),
      avatar: AVATARS[members.length % AVATARS.length],
    };
    setMembers([...members, newMember]);
    setNewMemberName('');
    setShowAddMember(false);
    pushNotification(`${newMember.name} добавлен в семью!`);
  };

  const handleAddSubscription = () => {
    if (!newSubName || !newSubCost || newSubMembers.length === 0 || !newSubPaidBy) return;
    const service = SERVICES.find(s => s.name === newSubName);
    const newSub: Subscription = {
      id: Date.now().toString(),
      name: newSubName,
      icon: service?.icon || '📱',
      totalCost: Number(newSubCost),
      members: newSubMembers,
      paidBy: newSubPaidBy,
      color: service?.color || '#888',
    };
    setSubscriptions([...subscriptions, newSub]);
    setShowAddSub(false);
    setNewSubName('');
    setNewSubCost('');
    setNewSubMembers([]);
    setNewSubPaidBy('');
    pushNotification(`Подписка ${newSub.name} добавлена!`);
  };

  const handleRemoveSub = (id: string) => {
    const sub = subscriptions.find(s => s.id === id);
    setSubscriptions(subscriptions.filter(s => s.id !== id));
    if (sub) pushNotification(`${sub.name} удалена`);
  };

  const handleRequestSlot = (listingId: string) => {
    const listing = listings.find(l => l.id === listingId);
    if (!listing) return;
    setRequestedSlots([...requestedSlots, listingId]);
    setListings(listings.map(l =>
      l.id === listingId ? { ...l, slotsFilled: l.slotsFilled + 1 } : l
    ));
    pushNotification(`Запрос отправлен! ${listing.host} получит уведомление.`);
  };

  const debts = calculateDebts();
  const totalMonthly = subscriptions.reduce((sum, s) => sum + s.totalCost, 0);
  const mySubscriptions = subscriptions.filter(s => s.members.includes('1'));
  const mySaving = mySubscriptions.reduce((sum, s) => {
    const share = s.totalCost / s.members.length;
    return sum + (s.totalCost - share);
  }, 0);

  return (
    <div className="split-page">
      {/* Уведомление */}
      {showNotification && (
        <div className="split-notification">
          <span>🔔 {notificationText}</span>
        </div>
      )}

      {/* Шапка */}
      <div className="split-header">
        <button className="split-back-btn" onClick={onBack}>← Назад</button>
        <div className="split-header-title">
          <h1>💳 Split & Subscribe</h1>
          <p>Менеджер совместных подписок</p>
        </div>
      </div>

      {/* Табы */}
      <div className="split-tabs">
        <button
          className={`split-tab ${tab === 'family' ? 'active' : ''}`}
          onClick={() => setTab('family')}
        >
          👨‍👩‍👧 Моя Семья
        </button>
        <button
          className={`split-tab ${tab === 'market' ? 'active' : ''}`}
          onClick={() => setTab('market')}
        >
          🔍 Найти шеринг
        </button>
      </div>

      {tab === 'family' && (
        <div className="split-content">
          {/* Статистика */}
          <div className="split-stats-row">
            <div className="split-stat-card">
              <span className="split-stat-value">₽{totalMonthly}</span>
              <span className="split-stat-label">Всего в месяц</span>
            </div>
            <div className="split-stat-card green">
              <span className="split-stat-value">₽{Math.round(mySaving)}</span>
              <span className="split-stat-label">Вы экономите</span>
            </div>
            <div className="split-stat-card blue">
              <span className="split-stat-value">{subscriptions.length}</span>
              <span className="split-stat-label">Подписок</span>
            </div>
          </div>

          {/* Члены семьи */}
          <div className="split-section">
            <div className="split-section-header">
              <h2>👥 Участники</h2>
              <button className="split-add-btn" onClick={() => setShowAddMember(true)}>+ Добавить</button>
            </div>
            <div className="split-members-row">
              {members.map(m => (
                <div key={m.id} className="split-member-chip">
                  <span className="split-member-avatar">{m.avatar}</span>
                  <span className="split-member-name">{m.name}</span>
                </div>
              ))}
            </div>
            {showAddMember && (
              <div className="split-add-form">
                <input
                  className="split-input"
                  placeholder="Имя участника"
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddMember()}
                />
                <button className="split-btn-primary" onClick={handleAddMember}>Добавить</button>
                <button className="split-btn-ghost" onClick={() => setShowAddMember(false)}>Отмена</button>
              </div>
            )}
          </div>

          {/* Подписки */}
          <div className="split-section">
            <div className="split-section-header">
              <h2>📋 Подписки</h2>
              <button className="split-add-btn" onClick={() => setShowAddSub(true)}>+ Добавить</button>
            </div>

            {showAddSub && (
              <div className="split-add-card">
                <h3>Новая подписка</h3>
                <div className="split-services-grid">
                  {SERVICES.map(s => (
                    <button
                      key={s.name}
                      className={`split-service-btn ${newSubName === s.name ? 'selected' : ''}`}
                      onClick={() => setNewSubName(s.name)}
                      style={{ borderColor: newSubName === s.name ? s.color : 'transparent' }}
                    >
                      {s.icon} {s.name}
                    </button>
                  ))}
                </div>
                <input
                  className="split-input"
                  type="number"
                  placeholder="Стоимость в месяц (₽)"
                  value={newSubCost}
                  onChange={e => setNewSubCost(e.target.value)}
                />
                <div>
                  <p className="split-label">Кто участвует:</p>
                  <div className="split-checkbox-row">
                    {members.map(m => (
                      <label key={m.id} className="split-checkbox-label">
                        <input
                          type="checkbox"
                          checked={newSubMembers.includes(m.id)}
                          onChange={e => {
                            if (e.target.checked) setNewSubMembers([...newSubMembers, m.id]);
                            else setNewSubMembers(newSubMembers.filter(id => id !== m.id));
                          }}
                        />
                        {m.avatar} {m.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="split-label">Кто платит:</p>
                  <select className="split-select" value={newSubPaidBy} onChange={e => setNewSubPaidBy(e.target.value)}>
                    <option value="">— выберите —</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.avatar} {m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="split-form-actions">
                  <button className="split-btn-primary" onClick={handleAddSubscription}>Добавить</button>
                  <button className="split-btn-ghost" onClick={() => setShowAddSub(false)}>Отмена</button>
                </div>
              </div>
            )}

            <div className="split-subs-list">
              {subscriptions.map(sub => {
                const sharePerPerson = sub.totalCost / sub.members.length;
                return (
                  <div key={sub.id} className="split-sub-card" style={{ borderLeftColor: sub.color }}>
                    <div className="split-sub-main">
                      <span className="split-sub-icon">{sub.icon}</span>
                      <div className="split-sub-info">
                        <strong>{sub.name}</strong>
                        <span className="split-sub-meta">
                          {sub.members.length} чел. · ₽{Math.round(sharePerPerson)}/чел.
                        </span>
                      </div>
                      <div className="split-sub-cost">
                        <span className="split-sub-total">₽{sub.totalCost}</span>
                        <span className="split-sub-payer">платит {getMemberAvatar(sub.paidBy)} {getMemberName(sub.paidBy)}</span>
                      </div>
                      <button className="split-remove-btn" onClick={() => handleRemoveSub(sub.id)}>✕</button>
                    </div>
                    <div className="split-sub-members">
                      {sub.members.map(mId => (
                        <span key={mId} className="split-mini-chip">{getMemberAvatar(mId)} {getMemberName(mId)}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Расчёт долгов */}
          <div className="split-section">
            <h2>💰 Кто кому должен этот месяц</h2>
            {debts.length === 0 ? (
              <div className="split-all-clear">
                <span>✅ Все расчёты в порядке!</span>
              </div>
            ) : (
              <div className="split-debts-list">
                {debts.map((debt, i) => (
                  <div key={i} className="split-debt-card">
                    <div className="split-debt-info">
                      <span className="split-debt-from">{getMemberAvatar(debt.from)} {getMemberName(debt.from)}</span>
                      <span className="split-debt-arrow">→</span>
                      <span className="split-debt-to">{getMemberAvatar(debt.to)} {getMemberName(debt.to)}</span>
                    </div>
                    <div className="split-debt-amount">₽{debt.amount}</div>
                    <button
                      className="split-notify-btn"
                      onClick={() => pushNotification(`Уведомление отправлено: «${getMemberName(debt.from)}, переведи ${getMemberName(debt.to)} ₽${debt.amount}»`)}
                    >
                      🔔 Напомнить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'market' && (
        <div className="split-content">
          <div className="split-market-header">
            <h2>🔍 Найти место в шеринге</h2>
            <p>Присоединяйтесь к существующим семейным подпискам</p>
          </div>

          <div className="split-listings">
            {listings.map(listing => {
              const isRequested = requestedSlots.includes(listing.id);
              const isFull = listing.slotsFilled >= listing.slotsTotal;
              return (
                <div key={listing.id} className={`split-listing-card ${isFull ? 'full' : ''}`}>
                  <div className="split-listing-top">
                    <span className="split-listing-icon">{listing.icon}</span>
                    <div className="split-listing-info">
                      <strong>{listing.service}</strong>
                      <p className="split-listing-desc">{listing.description}</p>
                      <p className="split-listing-host">Организатор: {listing.host}</p>
                    </div>
                    <div className="split-listing-price">
                      <span className="split-listing-amount">₽{listing.pricePerSlot}</span>
                      <span className="split-listing-period">/месяц</span>
                    </div>
                  </div>
                  <div className="split-listing-bottom">
                    <div className="split-slots">
                      <div className="split-slots-bar">
                        {Array.from({ length: listing.slotsTotal }).map((_, i) => (
                          <div
                            key={i}
                            className={`split-slot ${i < listing.slotsFilled ? 'filled' : 'empty'}`}
                          />
                        ))}
                      </div>
                      <span className="split-slots-text">
                        {listing.slotsFilled}/{listing.slotsTotal} мест занято
                      </span>
                    </div>
                    {isFull ? (
                      <span className="split-full-badge">Мест нет</span>
                    ) : isRequested ? (
                      <span className="split-requested-badge">✓ Запрос отправлен</span>
                    ) : (
                      <button className="split-join-btn" onClick={() => handleRequestSlot(listing.id)}>
                        Вступить
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="split-create-listing">
            <h3>Создайте свой шеринг</h3>
            <p>Заполните семейную подписку и зарабатывайте на экономии</p>
            <button
              className="split-btn-primary large"
              onClick={() => pushNotification('Форма создания шеринга откроется в полной версии!')}
            >
              + Создать объявление
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SplitSubscribePage;
