// src/components/SettingsPanel.jsx
import { useState, useEffect } from 'react';

// Об'єкт за замовчуванням, щоб уникнути помилки "null"
const defaultSettings = {
  monthlyIncome: 30000,
  percentNecessities: 50,
  percentFun: 30,
  percentSavings: 20
};

function SettingsPanel({ settings, onSave }) {
  // Ініціалізуємо стан з `settings` (якщо вони є) або з `defaultSettings`
  const [formData, setFormData] = useState(settings || defaultSettings);
  const [error, setError] = useState('');

  // Цей ефект спрацює, коли `settings` завантажаться з API
  useEffect(() => {
    // Оновлюємо форму, ТІЛЬКИ якщо `settings` не null
    if (settings) {
      setFormData(settings);
    }
  }, [settings]); // Залежність - `settings`

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { percentNecessities, percentFun, percentSavings } = formData;
    const totalPercent = percentNecessities + percentFun + percentSavings;
    
    if (totalPercent !== 100) {
      setError(`Сума відсотків має бути 100%, а не ${totalPercent}%`);
      return;
    }
    
    setError('');
    onSave(formData);
  };

  // Додаткова перевірка (хоча `formData` вже не має бути null)
  if (!formData) {
    return <div className="card"><p>Завантаження налаштувань...</p></div>;
  }

  return (
    <div className="card">
      <h3>Налаштування бюджету</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Очікуваний дохід / міс.</label>
          <input 
            type="number" 
            name="monthlyIncome"
            value={formData.monthlyIncome} // <-- Тепер безпечно
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Обов'язкові (%)</label>
          <input 
            type="number" 
            name="percentNecessities"
            value={formData.percentNecessities} // <-- Тепер безпечно
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Розваги (%)</label>
          <input 
            type="number" 
            name="percentFun"
            value={formData.percentFun} // <-- Тепер безпечно
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Заощадження (%)</label>
          <input 
            type="number" 
            name="percentSavings"
            value={formData.percentSavings} // <-- Тепер безпечно
            onChange={handleChange}
          />
        </div>
        {error && <p style={{color: 'var(--red-color)', fontSize: '0.9rem'}}>{error}</p>}
        <button type="submit" className="btn-submit">Зберегти</button>
      </form>
    </div>
  );
}

export default SettingsPanel;