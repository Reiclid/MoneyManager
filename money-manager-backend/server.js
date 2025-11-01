// money-manager-backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcrypt');
const multer = require('multer');
const csv = require('csv-parser');

const app = express();
const port = 3001;
const dbFilePath = './db.json';
const saltRounds = 10;
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(bodyParser.json());

// --- Допоміжні функції (readDb, writeDb - без змін) ---
const readDb = () => {
    if (!fs.existsSync(dbFilePath)) {
        const initialData = { users: {}, data: {} };
        fs.writeFileSync(dbFilePath, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    try {
        const data = fs.readFileSync(dbFilePath);
        return JSON.parse(data);
    } catch (error) {
        console.error("Помилка читання db.json", error);
        const initialData = { users: {}, data: {} };
        fs.writeFileSync(dbFilePath, JSON.stringify(initialData, null, 2));
        return initialData;
    }
};
const writeDb = (data) => {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2));
};

// --- API: Автентифікація (Оновлено /register) ---
app.post('/register', async (req, res) => {
    const { nickname, password } = req.body;
    if (!nickname || !password) return res.status(400).json({ message: 'Потрібен нік та пароль' });
    const db = readDb();
    if (db.users[nickname]) return res.status(400).json({ message: 'Цей нік вже зайнятий' });

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    db.users[nickname] = hashedPassword;
    db.data[nickname] = {
        accounts: [{ id: `acc_${new Date().getTime()}`, name: 'Готівка', initialBalance: 0 }],
        transactions: [],
        settings: {
            monthlyIncome: 30000,
            percentNecessities: 50,
            percentFun: 30,
            percentSavings: 20
        },
        goals: [] // <-- !!! ДОДАНО НОВЕ ПОЛЕ ДЛЯ ЦІЛЕЙ !!!
    };
    writeDb(db);
    res.status(201).json({ message: 'Користувача створено' });
});

app.post('/login', async (req, res) => {
    // ... (без змін)
    const { nickname, password } = req.body;
    const db = readDb();
    const userPasswordHash = db.users[nickname];
    if (!userPasswordHash) return res.status(404).json({ message: 'Користувача не знайдено' });
    const match = await bcrypt.compare(password, userPasswordHash);
    if (match) {
        res.status(200).json({ message: 'Вхід успішний', nickname: nickname });
    } else {
        res.status(401).json({ message: 'Неправильний пароль' });
    }
});

// --- API: Дані (Оновлено /data) ---
app.get('/data/:nickname', (req, res) => {
    const { nickname } = req.params;
    const db = readDb();
    if (!db.data[nickname]) return res.status(404).json({ message: 'Дані користувача не знайдено' });

    // Захист від старих користувачів (додаємо відсутні поля)
    if (!db.data[nickname].accounts) db.data[nickname].accounts = [{ id: `acc_${new Date().getTime()}`, name: 'Готівка', initialBalance: 0 }];
    if (!db.data[nickname].transactions) db.data[nickname].transactions = [];
    if (!db.data[nickname].settings) db.data[nickname].settings = { monthlyIncome: 30000, percentNecessities: 50, percentFun: 30, percentSavings: 20 };
    if (!db.data[nickname].goals) db.data[nickname].goals = []; // <-- !!! ДОДАНО ПЕРЕВІРКУ ЦІЛЕЙ !!!

    writeDb(db);
    res.status(200).json(db.data[nickname]);
});

// --- API: Транзакції (Без змін) ---
app.post('/transactions/:nickname', (req, res) => {
    // ... (без змін)
    const { nickname } = req.params;
    const txData = req.body;
    if (!txData.description || !txData.amount || !txData.type || !txData.date || !txData.accountId) {
        return res.status(400).json({ message: 'Не заповнені всі поля' });
    }
    const db = readDb();
    if (!db.data[nickname]) return res.status(404).json({ message: 'Користувач не знайдений' });
    if (!db.data[nickname].transactions) db.data[nickname].transactions = [];
    const newTransaction = { ...txData, id: `tx_${new Date().getTime()}`, amount: parseFloat(txData.amount) };
    db.data[nickname].transactions.unshift(newTransaction);
    writeDb(db);
    res.status(201).json(db.data[nickname].transactions);
});

app.put('/transactions/:nickname/:txId', (req, res) => {
    // ... (без змін)
    const { nickname, txId } = req.params;
    const updatedTxData = req.body;
    const db = readDb();
    if (!db.data[nickname] || !db.data[nickname].transactions) return res.status(404).json({ message: 'Дані не знайдено' });
    const txIndex = db.data[nickname].transactions.findIndex(tx => tx.id === txId);
    if (txIndex === -1) return res.status(404).json({ message: 'Транзакцію не знайдено' });
    db.data[nickname].transactions[txIndex] = { ...db.data[nickname].transactions[txIndex], ...updatedTxData, amount: parseFloat(updatedTxData.amount) };
    writeDb(db);
    res.status(200).json(db.data[nickname].transactions);
});

app.delete('/transactions/:nickname/:txId', (req, res) => {
    // ... (без змін)
    const { nickname, txId } = req.params;
    const db = readDb();
    if (!db.data[nickname] || !db.data[nickname].transactions) return res.status(404).json({ message: 'Дані не знайдено' });
    const txIndex = db.data[nickname].transactions.findIndex(tx => tx.id === txId);
    if (txIndex === -1) return res.status(404).json({ message: 'Транзакцію не знайдено' });
    db.data[nickname].transactions.splice(txIndex, 1);
    writeDb(db);
    res.status(200).json(db.data[nickname].transactions);
});

// --- API: Рахунки (Без змін) ---
app.post('/accounts/:nickname', (req, res) => {
    // ... (без змін)
    const { nickname } = req.params;
    const { name, initialBalance } = req.body;
    const db = readDb();
    if (!db.data[nickname]) return res.status(404).json({ message: 'Користувач не знайдений' });
    if (!db.data[nickname].accounts) db.data[nickname].accounts = [];
    const newAccount = { id: `acc_${new Date().getTime()}`, name, initialBalance: parseFloat(initialBalance) || 0 };
    db.data[nickname].accounts.push(newAccount);
    writeDb(db);
    res.status(201).json(db.data[nickname].accounts);
});

app.put('/accounts/:nickname/:accId', (req, res) => {
    // ... (без змін)
    const { nickname, accId } = req.params;
    const { name, initialBalance } = req.body;
    const db = readDb();
    if (!db.data[nickname] || !db.data[nickname].accounts) return res.status(404).json({ message: 'Дані не знайдено' });
    const accIndex = db.data[nickname].accounts.findIndex(acc => acc.id === accId);
    if (accIndex === -1) return res.status(404).json({ message: 'Рахунок не знайдено' });
    db.data[nickname].accounts[accIndex] = { ...db.data[nickname].accounts[accIndex], name: name, initialBalance: parseFloat(initialBalance) || 0 };
    writeDb(db);
    res.status(200).json(db.data[nickname].accounts);
});

app.delete('/accounts/:nickname/:accId', (req, res) => {
    // ... (без змін)
    const { nickname, accId } = req.params;
    const db = readDb();
    if (!db.data[nickname] || !db.data[nickname].accounts) return res.status(404).json({ message: 'Дані не знайдено' });
    const accIndex = db.data[nickname].accounts.findIndex(acc => acc.id === accId);
    if (accIndex === -1) return res.status(404).json({ message: 'Рахунок не знайдено' });
    if (db.data[nickname].accounts.length === 1) return res.status(400).json({ message: 'Неможливо видалити останній рахунок' });
    db.data[nickname].accounts.splice(accIndex, 1);
    writeDb(db);
    res.status(200).json(db.data[nickname].accounts);
});

// --- API: Налаштування (Без змін) ---
app.put('/settings/:nickname', (req, res) => {
    // ... (без змін)
    const { nickname } = req.params;
    const newSettings = req.body;
    const db = readDb();
    if (!db.data[nickname]) return res.status(404).json({ message: 'Користувач не знайдений' });
    db.data[nickname].settings = newSettings;
    writeDb(db);
    res.status(200).json(db.data[nickname].settings);
});

// --- API: ІМПОРТ (!!! ВИПРАВЛЕНО БАГ !!!) ---

const parseBankDate = (dateString) => {
    try {
        const [date, time] = dateString.split(' ');
        const [day, month, year] = date.split('.');
        return `${year}-${month}-${day}T${time || '00:00:00'}`;
    } catch (e) {
        console.warn(`Не вдалося розпізнати дату: ${dateString}`);
        return new Date().toISOString();
    }
};

app.post('/import/:nickname', upload.single('file'), (req, res) => {
    const { nickname } = req.params;
    const { bankType, accountId } = req.body;
    const filePath = req.file.path;

    if (!bankType || !accountId) return res.status(400).json({ message: 'Не вибрано тип банку або рахунок' });
    const db = readDb();
    if (!db.data[nickname]) return res.status(404).json({ message: 'Користувач не знайдений' });

    const newTransactions = [];
    let csvOptions = {};
    let mapping = {};

    if (bankType === 'privat') {
        csvOptions = {
            headers: ['Дата', 'Категорія', 'Картка', 'Опис операції', 'Сума в валюті картки', 'Валюта картки', 'Сума в валюті транзакції', 'Валюта транзакції', 'Залишок на кінець періоду', 'Валюта залишку'],
            skipLines: 2
        };
        mapping = {
            date: 'Дата',
            description: 'Опис операції',
            amount: 'Сума в валюті картки'
        };
    } else if (bankType === 'mono') {
        csvOptions = {
            headers: ['Дата i час операції', 'Деталі операції', 'MCC', 'Сума в валюті картки (UAH)', 'Сума в валюті операції', 'Валюта', 'Курс', 'Сума комісій (UAH)', 'Сума кешбеку (UAH)', 'Залишок після операції'],
            skipLines: 22
        };
        mapping = {
            date: 'Дата i час операції',
            description: 'Деталі операції',
            amount: 'Сума в валюті картки (UAH)'
        };
    } else {
        return res.status(400).json({ message: 'Невідомий тип банку' });
    }

    fs.createReadStream(filePath)
        .pipe(csv(csvOptions))
        .on('data', (row) => {
            const rawAmount = parseFloat(row[mapping.amount]); // <-- Сума з файлу (може бути -100)
            const description = row[mapping.description];
            const date = row[mapping.date];

            if (description && date && !isNaN(rawAmount)) {

                // !!! --- ОСЬ ВИПРАВЛЕННЯ --- !!!
                const finalAmount = Math.abs(rawAmount); // <-- 100
                const finalType = rawAmount >= 0 ? 'income' : 'expense'; // <-- 'expense'

                newTransactions.push({
                    id: `imp_${new Date().getTime()}_${Math.random()}`,
                    date: parseBankDate(date),
                    description: description,
                    amount: finalAmount, // <-- Зберігаємо 100
                    type: finalType,     // <-- Зберігаємо 'expense'
                    accountId: accountId,
                    budgetType: finalType === 'income' ? null : 'necessities'
                });
            } else {
                console.warn('Пропущено рядок (не вдалося розпізнати):', row);
            }
        })
        .on('end', () => {
            if (newTransactions.length === 0) console.warn('!!! Жодної транзакції не розпізнано.');

            db.data[nickname].transactions.unshift(...newTransactions);
            writeDb(db);
            fs.unlinkSync(filePath);

            console.log(`Імпортовано ${newTransactions.length} транзакцій`);
            res.status(200).json(db.data[nickname].transactions);
        })
        .on('error', (error) => {
            fs.unlinkSync(filePath);
            res.status(500).json({ message: `Помилка парсингу файлу: ${error.message}` });
        });
});

// --- !!! НОВІ API ДЛЯ ЦІЛЕЙ !!! ---

// Створення нової цілі
app.post('/goals/:nickname', (req, res) => {
    const { nickname } = req.params;
    const { name, targetAmount, targetDate } = req.body;

    if (!name || !targetAmount || !targetDate) {
        return res.status(400).json({ message: 'Не заповнені всі поля цілі' });
    }

    const db = readDb();
    if (!db.data[nickname]) return res.status(404).json({ message: 'Користувач не знайдений' });
    if (!db.data[nickname].goals) db.data[nickname].goals = [];

    const newGoal = {
        id: `goal_${new Date().getTime()}`,
        name,
        targetAmount: parseFloat(targetAmount),
        targetDate // Зберігаємо у форматі YYYY-MM-DD
    };

    db.data[nickname].goals.push(newGoal);
    writeDb(db);
    res.status(201).json(db.data[nickname].goals);
});

// Видалення цілі
app.delete('/goals/:nickname/:goalId', (req, res) => {
    const { nickname, goalId } = req.params;
    const db = readDb();
    if (!db.data[nickname] || !db.data[nickname].goals) {
        return res.status(404).json({ message: 'Дані не знайдено' });
    }

    const goalIndex = db.data[nickname].goals.findIndex(g => g.id === goalId);
    if (goalIndex === -1) {
        return res.status(404).json({ message: 'Ціль не знайдено' });
    }

    db.data[nickname].goals.splice(goalIndex, 1);
    writeDb(db);
    res.status(200).json(db.data[nickname].goals); // Повертаємо оновлений список
});


// --- Запуск сервера ---
app.listen(port, () => {
    console.log(`Сервер Money Manager запущено на http://localhost:${port}`);
    readDb();
});