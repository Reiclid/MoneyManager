// src/components/TransactionList.jsx
import React, { useState, useMemo } from 'react';

// Допоміжна функція для форматування дати в YYYY-MM-DD
const getISODate = (date) => date.toISOString().split('T')[0];

// Функції для кнопок швидкого вибору
const getToday = () => getISODate(new Date());
const getStartOfMonth = () => {
    const now = new Date();
    return getISODate(new Date(now.getFullYear(), now.getMonth(), 1));
};
const getStartOfWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Понеділок - 1-й день
    return getISODate(new Date(now.setDate(diff)));
};


function TransactionList({ transactions, accounts, onEditTx }) {
    // --- НОВІ ФІЛЬТРИ ДАТ ---
    const [startDate, setStartDate] = useState(getStartOfMonth());
    const [endDate, setEndDate] = useState(getToday());

    const accountMap = useMemo(() =>
        new Map(accounts.map(acc => [acc.id, acc.name])),
        [accounts]
    );

    // Фільтруємо транзакції на основі вибраного діапазону дат
    const filteredTransactions = useMemo(() => {
        // Встановлюємо час 00:00:00 для startDate
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        // Встановлюємо час 23:59:59 для endDate
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= start && txDate <= end;
        });
    }, [transactions, startDate, endDate]);


    return (
        <section className="card transaction-list">
            <h3>Історія транзакцій</h3>

            {/* --- НОВІ ФІЛЬТРИ --- */}
            <div className="filter-controls">
                <div className="filter-quick-buttons">
                    <button className="btn-quick-filter" onClick={() => { setStartDate(getToday()); setEndDate(getToday()); }}>
                        Сьогодні
                    </button>
                    <button className="btn-quick-filter" onClick={() => { setStartDate(getStartOfWeek()); setEndDate(getToday()); }}>
                        Цей тиждень
                    </button>
                    <button className="btn-quick-filter" onClick={() => { setStartDate(getStartOfMonth()); setEndDate(getToday()); }}>
                        Цей місяць
                    </button>
                </div>
                <div className="form-group">
                    <label>З дати:</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>До дати:</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>

            {filteredTransactions.length === 0 ? (
                <p className="text-center">Немає транзакцій за вибраний період</p>
            ) : (
                <ul>
                    {filteredTransactions.map((tx) => (
                        <li key={tx.id} className="tx-item">
                            <div className="tx-details">
                                <span className="tx-desc">{tx.description}</span>
                                <span className="tx-meta">
                                    {new Date(tx.date).toLocaleDateString('uk-UA')} | {accountMap.get(tx.accountId) || 'Рахунок'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className={`tx-amount ${tx.type}`}>
                                    {tx.type === 'income' ? '+' : '-'}
                                    {tx.amount.toFixed(2)} грн
                                </span>
                                <button className="btn-edit" onClick={() => onEditTx(tx)}>
                                    ✏️
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default TransactionList;