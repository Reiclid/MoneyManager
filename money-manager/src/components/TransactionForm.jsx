// src/components/TransactionForm.jsx
import { useState, useEffect } from 'react';

const getTodayDate = () => new Date().toISOString().split('T')[0];

function TransactionForm({
    onSave,
    accounts,
    initialData = null,
    onDelete = null, // <-- Новий prop
    onDone = () => { }
}) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('expense');
    const [date, setDate] = useState(getTodayDate());
    const [accountId, setAccountId] = useState(accounts.length > 0 ? accounts[0].id : '');
    const [budgetType, setBudgetType] = useState('necessities');
    const isEditMode = !!initialData;

    useEffect(() => {
        if (initialData) {
            setDescription(initialData.description);
            setAmount(initialData.amount);
            setType(initialData.type);
            setDate(initialData.date.split('T')[0]);
            setAccountId(initialData.accountId);
            setBudgetType(initialData.budgetType || 'necessities');
        }
    }, [initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!description || !amount || amount <= 0 || !accountId || !date) {
            alert('Будь ласка, заповніть всі поля');
            return;
        }
        const txData = {
            description,
            amount: parseFloat(amount),
            type,
            date,
            accountId,
            budgetType: type === 'income' ? null : budgetType
        };
        if (initialData) {
            txData.id = initialData.id;
        }
        onSave(txData);
        if (!initialData) {
            setDescription('');
            setAmount('');
            setDate(getTodayDate());
        } else {
            onDone();
        }
    };

    if (accounts.length === 0 && !isEditMode) {
        return (
            <div className="card">
                <h3>Додати транзакцію</h3>
                <p>Будь ласка, спочатку <a href="#accounts">додайте банківський рахунок</a>.</p>
            </div>
        );
    }

    return (
        <form className={!isEditMode ? "card transaction-form" : "transaction-form"} onSubmit={handleSubmit}>
            {!isEditMode && <h3>Додати транзакцію</h3>}
            <div className="form-controls">
                {/* ... (поля форми: Опис, Сума, Дата, Рахунок, Тип) ... */}
                <div className="form-group">
                    <label>Опис</label>
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="form-group amount">
                    <label>Сума</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div className="form-group date">
                    <label>Дата</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Рахунок (Картка)</label>
                    <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                                {acc.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>Тип</label>
                    <div className="form-group-inline">
                        <button type="button" className={`btn-type expense ${type === 'expense' ? 'active' : ''}`} onClick={() => setType('expense')}>
                            Витрата
                        </button>
                        <button type="button" className={`btn-type income ${type === 'income' ? 'active' : ''}`} onClick={() => setType('income')}>
                            Дохід
                        </button>
                    </div>
                </div>
                {type === 'expense' && (
                    <div className="form-group">
                        <label>Тип витрати</label>
                        <div className="radio-group">
                            <input type="radio" id="necessities" name="budgetType" value="necessities" checked={budgetType === 'necessities'} onChange={(e) => setBudgetType(e.target.value)} />
                            <label htmlFor="necessities">Обов'язкові</label>
                            <input type="radio" id="fun" name="budgetType" value="fun" checked={budgetType === 'fun'} onChange={(e) => setBudgetType(e.target.value)} />
                            <label htmlFor="fun">Розваги</label>
                        </div>
                    </div>
                )}

                {/* Оновлений блок кнопок */}
                <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button type="submit" className="btn-submit" style={{ width: isEditMode ? '70%' : '100%' }}>
                        {isEditMode ? 'Зберегти зміни' : 'Додати'}
                    </button>

                    {/* !!! НОВА КНОПКА ВИДАЛЕННЯ !!! */}
                    {isEditMode && onDelete && (
                        <button
                            type="button"
                            className="btn-delete"
                            style={{ width: '30%', margin: 0 }}
                            onClick={() => onDelete(initialData.id)}
                        >
                            Видалити
                        </button>
                    )}
                </div>
            </div>
        </form>
    );
}
export default TransactionForm;