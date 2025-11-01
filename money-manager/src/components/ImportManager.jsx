// src/components/ImportManager.jsx
import React, { useState } from 'react';

function ImportManager({ accounts, onImport, onDone }) {
    const [file, setFile] = useState(null);
    const [bankType, setBankType] = useState('privat');
    const [accountId, setAccountId] = useState(accounts.length > 0 ? accounts[0].id : '');
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!file) {
            setError('Будь ласка, виберіть файл');
            return;
        }
        if (!accountId) {
            setError('Будь ласка, створіть рахунок перед імпортом');
            return;
        }
        setError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('bankType', bankType);
        formData.append('accountId', accountId);

        // Передаємо formData в App.jsx для відправки
        onImport(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <p style={{ color: 'var(--red-color)' }}>{error}</p>}

            <div className="form-group">
                <label>1. Виберіть файл виписки (CSV)</label>
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    required
                />
            </div>

            <div className="form-group">
                <label>2. Виберіть тип банку</label>
                <select value={bankType} onChange={(e) => setBankType(e.target.value)} required>
                    <option value="privat">ПриватБанк (Виписки.csv)</option>
                    <option value="mono">Monobank (Рух коштів.csv)</option>
                </select>
            </div>

            <div className="form-group">
                <label>3. Куди імпортувати транзакції?</label>
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                            {acc.name}
                        </option>
                    ))}
                </select>
            </div>

            <button type="submit" className="btn-submit">
                Почати імпорт
            </button>
        </form>
    );
}

export default ImportManager;