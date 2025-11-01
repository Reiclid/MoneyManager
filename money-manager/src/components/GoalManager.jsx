// src/components/GoalManager.jsx
import React, { useState } from 'react';

// Допоміжна функція для отримання дати (наприклад, +30 днів)
const getTodayPlus = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};

function GoalManager({ goals = [], onAddGoal, onDeleteGoal }) {
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [targetDate, setTargetDate] = useState(getTodayPlus(30));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !targetAmount || !targetDate) {
            alert('Будь ласка, заповніть всі поля цілі');
            return;
        }
        onAddGoal({ name, targetAmount, targetDate });
        // Очистка форми
        setName('');
        setTargetAmount('');
    };

    return (
        <div className="card" id="goals">
            <h3>Фінансові цілі</h3>

            {/* Список поточних цілей */}
            <ul className="goal-list">
                {goals.length === 0 ? (
                    <li style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>У вас ще немає цілей.</li>
                ) : (
                    goals.map(goal => (
                        <li key={goal.id} className="goal-item">
                            <div className="goal-details">
                                <span className="goal-name">{goal.name}</span>
                                <span className="goal-meta">
                                    {goal.targetAmount.toFixed(2)} грн до {new Date(goal.targetDate).toLocaleDateString('uk-UA')}
                                </span>
                            </div>
                            <button
                                className="btn-delete-goal"
                                onClick={() => onDeleteGoal(goal.id)}
                            >
                                &times;
                            </button>
                        </li>
                    ))
                )}
            </ul>

            {/* Форма додавання нової цілі */}
            <h4 style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                Додати нову ціль
            </h4>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Назва (напр. 'Відпустка')</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Потрібна сума (загальна)</label>
                    <input
                        type="number"
                        value={targetAmount}
                        onChange={(e) => setTargetAmount(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Кінцева дата</label>
                    <input
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="btn-submit">Додати ціль</button>
            </form>
        </div>
    );
}

export default GoalManager;