// src/components/Dashboard.jsx
import React, { useState } from 'react'; // <-- ВАЖЛИВО: імпортуємо useState

// --- Допоміжні функції (без змін) ---
const calculateTotalBalance = (transactions, accounts) => {
    const totalIncome = transactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpense = transactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
    const totalInitialBalance = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);

    return totalInitialBalance + totalIncome - totalExpense;
};

const findActiveGoal = (goals, totalBalance) => {
    if (!goals || goals.length === 0) return null;
    const activeGoals = goals.filter(g => g.targetAmount > totalBalance);
    if (activeGoals.length === 0) return null;
    activeGoals.sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate));
    return activeGoals[0];
};

// --- Головна функція розрахунків (ОНОВЛЕНО) ---
const calculateMetrics = (transactions, settings, accounts, goals) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Поточний загальний баланс
    const totalBalance = calculateTotalBalance(transactions, accounts);

    // --- 2. НОВЕ: Розрахунок історичних середніх витрат ---
    const expenses = transactions.filter(tx => tx.type === 'expense');
    let historicalAvg = { day: 0, week: 0, month: 0 };

    if (expenses.length > 1) {
        // Сортуємо, щоб знайти найпершу витрату
        expenses.sort((a, b) => new Date(a.date) - new Date(b.date));
        const firstDate = new Date(expenses[0].date);

        // Рахуємо, скільки всього днів ведеться облік
        const totalDays = Math.max(1, Math.ceil((today - firstDate) / (1000 * 60 * 60 * 24)));

        // Рахуємо загальну суму витрат за весь час
        const totalSpent = expenses.reduce((sum, tx) => sum + tx.amount, 0);

        const avgPerDay = totalSpent / totalDays;
        historicalAvg.day = avgPerDay;
        historicalAvg.week = avgPerDay * 7;
        historicalAvg.month = avgPerDay * 30.42; // 30.42 - середня к-ть днів у місяці
    }

    // 3. Розрахунок по цілі (як і раніше)
    const activeGoal = findActiveGoal(goals, totalBalance);
    let goalMetrics = {
        activeGoalName: null,
        amountToSave: 0,
        daysToGoal: 0,
        mustSavePerDay: 0,
        safeToSpendTotalToday: null,
    };

    if (activeGoal) {
        const targetDate = new Date(activeGoal.targetDate);
        targetDate.setHours(23, 59, 59, 999);
        const amountToSave = activeGoal.targetAmount - totalBalance;
        const daysToGoal = Math.max(1, Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24))); // Завжди > 0

        const mustSavePerDay = amountToSave / daysToGoal;
        const dailyIncome = (settings.monthlyIncome || 0) / 30.42;

        goalMetrics = {
            activeGoalName: activeGoal.name,
            amountToSave: amountToSave,
            daysToGoal: daysToGoal,
            mustSavePerDay: mustSavePerDay,
            safeToSpendTotalToday: dailyIncome - mustSavePerDay,
        };
    }

    // 4. Розрахунки по місячному бюджету (як і раніше)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthTxs = transactions.filter(tx => new Date(tx.date) >= startOfMonth);

    const spentNecessities = thisMonthTxs.filter(tx => tx.budgetType === 'necessities').reduce((sum, tx) => sum + tx.amount, 0);
    const spentFun = thisMonthTxs.filter(tx => tx.budgetType === 'fun').reduce((sum, tx) => sum + tx.amount, 0);

    return {
        totalBalance,
        goalMetrics,
        historicalAvg, // <-- Повертаємо нові дані
        spentNecessities,
        spentFun
    };
};


// --- Компонент Dashboard (ОНОВЛЕНО) ---
function Dashboard({ transactions, settings, accounts, goals }) {

    // --- НОВИЙ СТАН: для перемикача День/Тиждень/Місяць ---
    const [goalPeriod, setGoalPeriod] = useState('day'); // 'day', 'week', 'month'

    if (!settings) {
        return <section className="dashboard card"><p>Завантаження налаштувань...</p></section>;
    }

    const {
        totalBalance,
        goalMetrics,
        historicalAvg, // <-- Отримуємо нові дані
        spentNecessities,
        spentFun
    } = calculateMetrics(transactions, settings, accounts, goals);

    // --- НОВА ЛОГІКА: Розрахунок для перемикача ---
    let displaySafeToSpend = 0;
    let displayPeriodLabel = 'сьогодні';

    if (goalMetrics.safeToSpendTotalToday !== null) {
        displaySafeToSpend = goalMetrics.safeToSpendTotalToday;
        if (goalPeriod === 'week') {
            displaySafeToSpend *= 7;
            displayPeriodLabel = 'на тиждень';
        } else if (goalPeriod === 'month') {
            displaySafeToSpend *= 30.42;
            displayPeriodLabel = 'на місяць';
        }
    }

    return (
        <section className="dashboard card">
            <div className="metrics-grid">

                {/* --- ГОЛОВНИЙ БЛОК: ЦІЛЬ (ОНОВЛЕНО) --- */}
                {goalMetrics.safeToSpendTotalToday !== null ? (
                    <>
                        <div className="metric-card total-balance" style={{ gridColumn: '1 / -1' }}>
                            <h3>Загальний баланс</h3>
                            <p>{totalBalance.toFixed(2)} грн</p>
                        </div>

                        <div className="metric-card main-metric" style={{ background: 'var(--primary-color)', color: 'white', gridColumn: '1 / -1' }}>

                            {/* --- НОВІ ПЕРЕМИКАЧІ --- */}
                            <div className="period-toggle-buttons">
                                <button
                                    className={`btn-period-toggle ${goalPeriod === 'day' ? 'active' : ''}`}
                                    onClick={() => setGoalPeriod('day')}
                                >День</button>
                                <button
                                    className={`btn-period-toggle ${goalPeriod === 'week' ? 'active' : ''}`}
                                    onClick={() => setGoalPeriod('week')}
                                >Тиждень</button>
                                <button
                                    className={`btn-period-toggle ${goalPeriod === 'month' ? 'active' : ''}`}
                                    onClick={() => setGoalPeriod('month')}
                                >Місяць</button>
                            </div>

                            <h3 style={{ color: 'rgba(255,255,255,0.8)' }}>Можна витратити {displayPeriodLabel}</h3>
                            <p style={{ color: 'white', fontSize: '2.5rem' }}>
                                {displaySafeToSpend.toFixed(0)} грн
                            </p>
                            <small style={{ color: 'rgba(255,255,255,0.8)' }}>
                                * Щоб досягти цілі "{goalMetrics.activeGoalName}" ({goalMetrics.daysToGoal} дн. залишилось)
                            </small>
                        </div>

                        <div className="metric-card budget-savings">
                            <h3>Треба заощаджувати / день</h3>
                            <p>{goalMetrics.mustSavePerDay.toFixed(0)} грн</p>
                        </div>
                        <div className="metric-card">
                            <h3>Залишилось до цілі</h3>
                            <p>{goalMetrics.amountToSave.toFixed(0)} грн</p>
                        </div>
                    </>
                ) : (
                    <div className="metric-card total-balance" style={{ gridColumn: '1 / -1' }}>
                        <h3>Загальний баланс</h3>
                        <p>{totalBalance.toFixed(2)} грн</p>
                        <small>Додайте фінансову ціль, щоб бачити розрахунки</small>
                    </div>
                )}

                {/* --- НОВІ КАРТКИ: ПРОГНОЗ ВИТРАТ --- */}
                <div className="metric-card" style={{ gridColumn: '1 / -1' }}>
                    <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Прогноз (на основі минулих витрат)</h3>
                </div>
                <div className="metric-card">
                    <h3>Середні витрати / день</h3>
                    <p>{historicalAvg.day.toFixed(0)} грн</p>
                </div>
                <div className="metric-card">
                    <h3>Середні витрати / тиждень</h3>
                    <p>{historicalAvg.week.toFixed(0)} грн</p>
                </div>
                <div className="metric-card">
                    <h3>Середні витрати / місяць</h3>
                    <p>{historicalAvg.month.toFixed(0)} грн</p>
                </div>

                {/* --- Додаткові картки (стара логіка) --- */}
                <div className="metric-card budget-necessities">
                    <h3>Витрачено (Обов'язкові)</h3>
                    <p>{spentNecessities.toFixed(2)} грн</p>
                    <small>Цього місяця</small>
                </div>
                <div className="metric-card budget-fun">
                    <h3>Витрачено (Розваги)</h3>
                    <p>{spentFun.toFixed(2)} грн</p>
                    <small>Цього місяця</small>
                </div>

            </div>
        </section>
    );
}

export default Dashboard;