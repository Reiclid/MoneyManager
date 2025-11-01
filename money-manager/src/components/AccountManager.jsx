// src/components/AccountManager.jsx
import { useState, useEffect } from 'react';

// --- Компонент форми (для додавання та редагування) ---
function AccountForm({
    onSave,
    initialData = null,
    onDelete = null, // <-- Новий prop
    onDone = () => { }
}) {
    const [name, setName] = useState('');
    const [initialBalance, setInitialBalance] = useState(0);
    const isEditMode = !!initialData;

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setInitialBalance(initialData.initialBalance);
        }
    }, [initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name) {
            alert('Введіть назву рахунку');
            return;
        }
        const accountData = { name, initialBalance: parseFloat(initialBalance) || 0 };
        if (isEditMode) {
            accountData.id = initialData.id;
        }
        onSave(accountData);
        if (!isEditMode) {
            setName('');
            setInitialBalance(0);
        } else {
            onDone();
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>Назва (напр. 'Monobank')</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>{isEditMode ? 'Початковий баланс' : 'Поточний баланс'}</label>
                <input
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                />
            </div>

            <button type="submit" className="btn-submit">
                {isEditMode ? 'Зберегти зміни' : 'Додати'}
            </button>

            {/* !!! НОВА КНОПКА ВИДАЛЕННЯ !!! */}
            {isEditMode && onDelete && (
                <button
                    type="button"
                    className="btn-delete"
                    onClick={() => onDelete(initialData.id)}
                >
                    Видалити рахунок
                </button>
            )}
        </form>
    );
}

// --- Головний компонент AccountManager ---
function AccountManager({
    accounts,
    onSaveAccount, // Змінено ім'я для ясності
    onEditAccount,
    onDelete = null, // <-- Новий prop
    initialData = null,
    isEditMode = false,
    onDone = () => { }
}) {

    // Якщо ми в режимі редагування (з модального вікна)
    if (isEditMode) {
        return (
            <AccountForm
                onSave={onSaveAccount}
                initialData={initialData}
                onDelete={onDelete} // <-- Передаємо
                onDone={onDone}
            />
        );
    }

    // Якщо це звичайний режим (в сайдбарі)
    return (
        <div className="card" id="accounts">
            <h3>Рахунки (Картки)</h3>
            <ul className="account-list" style={{ listStyle: 'none', padding: 0 }}>
                {accounts.map(acc => (
                    <li key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                        <div>
                            <span>{acc.name}</span>
                            <br />
                            <small style={{ color: 'var(--text-color-secondary)' }}>
                                (Баланс: {acc.initialBalance.toFixed(2)} грн)
                            </small>
                        </div>
                        <button className="btn-edit" onClick={() => onEditAccount(acc)}>
                            ✏️
                        </button>
                    </li>
                ))}
            </ul>

            <h4 style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                Додати новий рахунок
            </h4>
            <AccountForm onSave={onSaveAccount} />
        </div>
    );
}

export default AccountManager;