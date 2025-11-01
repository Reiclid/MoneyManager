// src/App.jsx
import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import LoginPage from './components/LoginPage';
import SettingsPanel from './components/SettingsPanel';
import AccountManager from './components/AccountManager';
import Modal from './components/Modal';
import ImportManager from './components/ImportManager';
import GoalManager from './components/GoalManager';
import './App.css';

const API_URL = 'https://moneymanager002.onrender.com';

function App() {
  // --- Стани ---
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState(null); // <--- Причина помилки (починається з null)
  const [accounts, setAccounts] = useState([]);
  const [goals, setGoals] = useState([]);
  
  const [loggedInUser, setLoggedInUser] = useState(
    localStorage.getItem('moneyManagerUser') // <-- !!! ВИПРАВЛЕННЯ 1: localStorage !!!
  );
  const [isLoading, setIsLoading] = useState(true);
  
  // --- Модальні вікна ---
  const [editingTx, setEditingTx] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // --- Тема (без змін) ---
  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
    localStorage.setItem('theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  // --- API: Завантаження (без змін) ---
  const fetchData = async (nickname) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/data/${nickname}`);
      const data = await response.json();
      if (response.ok) {
        setTransactions(data.transactions || []);
        setSettings(data.settings || {}); // <--- Тут settings отримують дані
        setAccounts(data.accounts || []);
        setGoals(data.goals || []);
      } else { throw new Error(data.message); }
    } catch (err) {
      console.error('Помилка завантаження даних:', err);
      handleLogout();
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (loggedInUser) fetchData(loggedInUser);
    else setIsLoading(false);
  }, [loggedInUser]);

  // --- API: Автентифікація (Оновлено) ---
  const handleLoginSuccess = (nickname) => {
    localStorage.setItem('moneyManagerUser', nickname); // <-- !!! ВИПРАВЛЕННЯ 2: localStorage !!!
    setLoggedInUser(nickname);
  };
  const handleLogout = () => {
    localStorage.removeItem('moneyManagerUser'); // <-- !!! ВИПРАВЛЕННЯ 3: localStorage !!!
    setLoggedInUser(null);
    setTransactions([]); setSettings(null); setAccounts([]); setGoals([]);
  };
      
  // --- API: Збереження (Транзакції та Рахунки) (без змін) ---
  const saveTransaction = async (txData) => {
    if (!loggedInUser) return;
    const isEditing = !!txData.id;
    const txId = txData.id;
    delete txData.id; 
    const url = isEditing ? `${API_URL}/transactions/${loggedInUser}/${txId}` : `${API_URL}/transactions/${loggedInUser}`;
    const method = isEditing ? 'PUT' : 'POST';
    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txData),
      });
      const updatedTransactions = await response.json();
      if (response.ok) setTransactions(updatedTransactions);
      else throw new Error(updatedTransactions.message);
      setEditingTx(null);
    } catch (err) { console.error('Помилка збереження транзакції:', err); }
  };
  
  const saveAccount = async (accountData) => {
    if (!loggedInUser) return;
    const isEditing = !!accountData.id;
    const accId = accountData.id;
    const url = isEditing ? `${API_URL}/accounts/${loggedInUser}/${accId}` : `${API_URL}/accounts/${loggedInUser}`;
    const method = isEditing ? 'PUT' : 'POST';
    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData),
      });
      const updatedAccounts = await response.json();
      if (response.ok) setAccounts(updatedAccounts);
      else throw new Error(updatedAccounts.message);
      setEditingAccount(null);
    } catch (err) { console.error('Помилка збереження рахунку:', err); }
  };
  
  // --- API: Налаштування (без змін) ---
  const updateSettings = async (newSettings) => {
    if (!loggedInUser) return;
    try {
      const response = await fetch(`${API_URL}/settings/${loggedInUser}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      const data = await response.json();
      if (response.ok) setSettings(data);
      else throw new Error(data.message);
    } catch (err) { console.error('Помилка оновлення налаштувань:', err); }
  };

  // --- API: Видалення (без змін) ---
  const deleteTransaction = async (txId) => {
    if (!loggedInUser || !txId || !window.confirm("Видалити транзакцію?")) return;
    try {
      const response = await fetch(`${API_URL}/transactions/${loggedInUser}/${txId}`, { method: 'DELETE' });
      const updatedTransactions = await response.json();
      if (response.ok) { setTransactions(updatedTransactions); setEditingTx(null); }
      else { throw new Error(updatedTransactions.message); }
    } catch (err) { console.error('Помилка видалення транзакції:', err); alert(`Помилка: ${err.message}`); }
  };

  const deleteAccount = async (accId) => {
    if (!loggedInUser || !accId || !window.confirm("Видалити рахунок?")) return;
    try {
      const response = await fetch(`${API_URL}/accounts/${loggedInUser}/${accId}`, { method: 'DELETE' });
      const updatedAccounts = await response.json();
      if (response.ok) { setAccounts(updatedAccounts); setEditingAccount(null); }
      else { throw new Error(updatedAccounts.message); }
    } catch (err) { console.error('Помилка видалення рахунку:', err); alert(`Помилка: ${err.message}`); }
  };
  
  // --- API: Імпорт (без змін) ---
  const importTransactions = async (formData) => {
    if (!loggedInUser) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/import/${loggedInUser}`, {
        method: 'POST',
        body: formData,
      });
      const newTransactions = await response.json();
      if (response.ok) {
        setTransactions(newTransactions);
        setIsImportModalOpen(false);
      } else { throw new Error(newTransactions.message); }
    } catch (err) {
      console.error('Помилка імпорту:', err);
      alert(`Помилка імпорту: ${err.message}`);
    }
    setIsLoading(false);
  };

  // --- API: Керування цілями (без змін) ---
  const addGoal = async (goalData) => {
    if (!loggedInUser) return;
    try {
      const response = await fetch(`${API_URL}/goals/${loggedInUser}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData),
      });
      const updatedGoals = await response.json();
      if (response.ok) setGoals(updatedGoals);
      else throw new Error(updatedGoals.message);
    } catch (err) { console.error('Помилка додавання цілі:', err); }
  };

  const deleteGoal = async (goalId) => {
    if (!loggedInUser || !goalId || !window.confirm("Видалити цю ціль?")) return;
    try {
      const response = await fetch(`${API_URL}/goals/${loggedInUser}/${goalId}`, { 
        method: 'DELETE' 
      });
      const updatedGoals = await response.json();
      if (response.ok) setGoals(updatedGoals);
      else throw new Error(updatedGoals.message);
    } catch (err) { console.error('Помилка видалення цілі:', err); }
  };

  // --- РЕНДЕР ---
  if (!loggedInUser) return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  
  // (Змінено) Ми більше не можемо використовувати isLoading, бо settings = null
  // Головний компонент Dashboard тепер має власну перевірку
  
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Мій Бюджет</h1>
        <div className="user-panel">
          <span>Привіт, {loggedInUser}!</span>
          <button onClick={toggleTheme} className="btn-theme-toggle">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={handleLogout} className="btn-logout">Вийти</button>
        </div>
      </header>

      <main>
        {/* Показуємо "Завантаження", лише якщо isLoading, АЛЕ settings ще не завантажено */}
        {(isLoading && !settings) ? (
          <div className="card"><p>Завантаження...</p></div>
        ) : (
          <Dashboard 
            transactions={transactions} 
            settings={settings} // settings може бути null тут, Dashboard це обробить
            accounts={accounts}
            goals={goals}
          />
        )}
        
        <div className="main-layout">
          <div className="main-content">
            <TransactionForm 
              onSave={saveTransaction}
              accounts={accounts} 
            />
            <TransactionList 
              transactions={transactions} 
              accounts={accounts}
              onEditTx={setEditingTx}
            />
          </div>
          
          <aside className="sidebar">
            <button className="btn-import" onClick={() => setIsImportModalOpen(true)}>
              📥 Імпорт виписки
            </button>
            <GoalManager 
              goals={goals}
              onAddGoal={addGoal}
              onDeleteGoal={deleteGoal}
            />
            {/* Ми рендеримо SettingsPanel, навіть якщо settings=null, 
              бо тепер він "захищений" 
            */}
            <SettingsPanel 
              settings={settings} 
              onSave={updateSettings} 
            />
            <AccountManager 
              accounts={accounts} 
              onSaveAccount={saveAccount}
              onEditAccount={setEditingAccount}
            />
          </aside>
        </div>
      </main>

      {/* --- МОДАЛЬНІ ВІКНА (без змін) --- */}
      <Modal 
        isOpen={!!editingTx} 
        onClose={() => setEditingTx(null)} 
        title="Редагувати транзакцію"
      >
        <TransactionForm 
          onSave={saveTransaction}
          accounts={accounts} 
          initialData={editingTx}
          onDelete={deleteTransaction}
          onDone={() => setEditingTx(null)}
        />
      </Modal>

      <Modal 
        isOpen={!!editingAccount} 
        onClose={() => setEditingAccount(null)} 
        title="Редагувати рахунок"
      >
        <AccountManager 
          accounts={accounts} 
          onSaveAccount={saveAccount} 
          onEditAccount={setEditingAccount}
          onDelete={deleteAccount}
          initialData={editingAccount}
          onDone={() => setEditingAccount(null)}
          isEditMode={true}
        />
      </Modal>
      
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Імпорт транзакцій з CSV"
      >
        <ImportManager 
          accounts={accounts}
          onImport={importTransactions}
          onDone={() => setIsImportModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
export default App;