const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs'); // Потрібен тільки для видалення tmp файлів
const bcrypt = require('bcrypt');
const multer = require('multer');
const csv = require('csv-parser');
const { MongoClient, ObjectId } = require('mongodb'); // <-- ГОЛОВНИЙ ІМПОРТ

const app = express();
// Render надає свій порт через process.env.PORT
const port = process.env.PORT || 3001;
const saltRounds = 10;
const upload = multer({ dest: 'uploads/' }); // Для імпорту

// --- ПІДКЛЮЧЕННЯ ДО MONGODB ATLAS ---
// Цей рядок шукає "Environment Variable" на Render
const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error("!!! MONGODB_URI не знайдено. Сервер не може підключитися до БД.");
    console.error("!!! Додайте MONGODB_URI в Environment Variables на Render.");
}

const client = new MongoClient(uri);
let usersCollection; // Глобальна змінна для доступу до "таблиці" користувачів

// Асинхронна функція для підключення до БД
async function connectDb() {
    try {
        await client.connect();
        // Назва бази даних береться з вашої URI (те, що ви додали після .net/...)
        const database = client.db();
        usersCollection = database.collection("users");
        console.log("Успішно підключено до MongoDB Atlas!");
    } catch (e) {
        console.error("!!! Помилка підключення до MongoDB", e);
        process.exit(1); // Зупиняємо сервер, якщо не можемо підключитися
    }
}

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());

// --- Допоміжна функція (для дат, без змін) ---
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

// --- API: Автентифікація ---

// Реєстрація: Створює новий документ у колекції 'users'
app.post('/register', async (req, res) => {
    const { nickname, password } = req.body;
    if (!nickname || !password) return res.status(400).json({ message: 'Потрібен нік та пароль' });

    try {
        const existingUser = await usersCollection.findOne({ nickname: nickname });
        if (existingUser) {
            return res.status(400).json({ message: 'Цей нік вже зайнятий' });
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Cтруктура даних нового користувача
        const newUserDocument = {
            nickname: nickname,
            password: hashedPassword,
            accounts: [{ id: `acc_${new Date().getTime()}`, name: 'Готівка', initialBalance: 0 }],
            transactions: [],
            settings: {
                monthlyIncome: 30000,
                percentNecessities: 50,
                percentFun: 30,
                percentSavings: 20
            },
            goals: []
        };

        await usersCollection.insertOne(newUserDocument);
        res.status(201).json({ message: 'Користувача створено' });

    } catch (e) {
        res.status(500).json({ message: `Помилка сервера: ${e.message}` });
    }
});

// Вхід: Шукає документ та перевіряє пароль
app.post('/login', async (req, res) => {
    const { nickname, password } = req.body;
    try {
        const user = await usersCollection.findOne({ nickname: nickname });
        if (!user) {
            return res.status(404).json({ message: 'Користувача не знайдено' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            res.status(200).json({ message: 'Вхід успішний', nickname: nickname });
        } else {
            res.status(401).json({ message: 'Неправильний пароль' });
        }
    } catch (e) {
        res.status(500).json({ message: `Помилка сервера: ${e.message}` });
    }
});

// --- API: Дані ---

// Отримання даних: Знаходить документ користувача і повертає його
app.get('/data/:nickname', async (req, res) => {
    const { nickname } = req.params;
    try {
        const user = await usersCollection.findOne({ nickname: nickname });
        if (!user) {
            return res.status(404).json({ message: 'Дані користувача не знайдено' });
        }

        // Повертаємо всі дані, окрім пароля
        const { password, _id, ...userData } = user; // Видаляємо пароль та _id
        res.status(200).json(userData);
    } catch (e) {
        res.status(500).json({ message: `Помилка сервера: ${e.message}` });
    }
});

// --- API: Транзакції ---

// Додавання транзакції: Оновлює масив ($push)
app.post('/transactions/:nickname', async (req, res) => {
    const { nickname } = req.params;
    const txData = req.body;
    if (!txData.description || txData.amount === undefined || !txData.type || !txData.date || !txData.accountId) {
        return res.status(400).json({ message: 'Не заповнені всі поля' });
    }

    const newTransaction = {
        ...txData,
        id: `tx_${new Date().getTime()}`,
        amount: parseFloat(txData.amount)
    };

    try {
        await usersCollection.updateOne(
            { nickname: nickname },
            // $push додає елемент в масив
            // $position: 0 додає його на початок (unshift)
            { $push: { transactions: { $each: [newTransaction], $position: 0 } } }
        );
        const user = await usersCollection.findOne({ nickname: nickname });
        res.status(201).json(user.transactions);
    } catch (e) {
        res.status(500).json({ message: `Помилка сервера: ${e.message}` });
    }
});

// Оновлення транзакції: Оновлює елемент в масиві ($set)
app.put('/transactions/:nickname/:txId', async (req, res) => {
    const { nickname, txId } = req.params;
    const updatedTxData = req.body;

    try {
        const result = await usersCollection.updateOne(
            // Знайти користувача, у якого є транзакція з таким ID
            { nickname: nickname, "transactions.id": txId },
            // Встановити нові значення для полів цієї транзакції
            // (знак $ - це та транзакція, що знайшлась)
            {
                $set: {
                    "transactions.$.description": updatedTxData.description,
                    "transactions.$.amount": parseFloat(updatedTxData.amount),
                    "transactions.$.type": updatedTxData.type,
                    "transactions.$.date": updatedTxData.date,
                    "transactions.$.accountId": updatedTxData.accountId,
                    "transactions.$.budgetType": updatedTxData.budgetType
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Транзакцію не знайдено' });
        }

        const user = await usersCollection.findOne({ nickname: nickname });
        res.status(200).json(user.transactions);
    } catch (e) {
        res.status(500).json({ message: `Помилка сервера: ${e.message}` });
    }
});

// Видалення транзакції: Видаляє елемент з масиву ($pull)
app.delete('/transactions/:nickname/:txId', async (req, res) => {
    const { nickname, txId } = req.params;
    try {
        await usersCollection.updateOne(
            { nickname: nickname },
            // $pull видаляє з масиву 'transactions' об'єкт, де 'id' == txId
            { $pull: { transactions: { id: txId } } }
        );

        const user = await usersCollection.findOne({ nickname: nickname });
        res.status(200).json(user.transactions);
    } catch (e) {
        res.status(500).json({ message: `Помилка сервера: ${e.message}` });
    }
});

// --- API: Рахунки (така ж логіка $push, $set, $pull) ---

app.post('/accounts/:nickname', async (req, res) => {
    const { nickname } = req.params;
    const { name, initialBalance } = req.body;
    const newAccount = {
        id: `acc_${new Date().getTime()}`,
        name,
        initialBalance: parseFloat(initialBalance) || 0
    };

    try {
        await usersCollection.updateOne(
            { nickname: nickname },
            { $push: { accounts: newAccount } }
        );
        const user = await usersCollection.findOne({ nickname: nickname });
        res.status(201).json(user.accounts);
    } catch (e) {
        res.status(500).json({ message: `Помилка сервера: ${e.message}` });
    }
});

app.put('/accounts/:nickname/:accId', async (req, res) => {
    const { nickname, accId } = req.params;
    const { name, initialBalance } = req.body;

    try {
        await usersCollection.updateOne(
            { nickname: nickname, "accounts.id": accId },
            {
                $set: {
                    "accounts.$.name": name,
                    "accounts.$.initialBalance": parseFloat(initialBalance) || 0
                }
            }
        );
        const user = await usersCollection.findOne({ nickname: nickname });
        res.status(200).json(user.accounts);
    } catch (e) {
        res.status(500).json({ message: `Помилка сервера: ${e.message}` });
    }
});

app.delete('/accounts/:nickname/:accId', async (req, res) => {
    const { nickname, accId } = req.params;
    try {
        await usersCollection.updateOne(
            { nickname: nickname },
            { $pull: { accounts: { id: accId } } }
        );
        const user = await usersCollection.findOne({ nickname: nickname });
        res.status(200).json(user.accounts);
    } catch (e) {
        res.status(500).json({ message: `Помилка сервера: ${e.message}` });
    }
});

// --- API: Налаштування ---
app.put('/settings/:nickname', async (req, res) => {
    const { nickname } = req.params;
    const newSettings = req.body;

    try {
        await usersCollection.updateOne(
            { nickname: nickname },
            // Просто замінюємо весь об'єкт 'settings'
            { $set: { settings: newSettings } }
        );
        const user = await usersCollection.findOne({ nickname: nickname });
        res.status(200).json(user.settings);
    } catch (e) {
        res.status(500).json({ message: `Помилка сервера: ${e.message}` });
    }
});

// --- API: Цілі ---
app.post('/goals/:nickname', async (req, res) => {
    const { nickname } = req.params;
    const { name, targetAmount, targetDate } = req.body;
    const newGoal = {
        id: `goal_${new Date().getTime()}`,
        name,
        targetAmount: parseFloat(targetAmount),
        targetDate
    };

    try {
        await usersCollection.updateOne(
            { nickname: nickname },
            { $push: { goals: newGoal } }
        );
        const user = await usersCollection.findOne({ nickname: nickname });
        res.status(201).json(user.goals);
    } catch (e) {
        res.status(500).json({ message: `Помилка сервера: ${e.message}` });
    }
});

app.delete('/goals/:nickname/:goalId', async (req, res) => {
    const { nickname, goalId } = req.params;
    try {
        await usersCollection.updateOne(
            { nickname: nickname },
            { $pull: { goals: { id: goalId } } }
        );
        const user = await usersCollection.findOne({ nickname: nickname });
        res.status(200).json(user.goals);
    } catch (e) {
        res.status(500).json({ message: `Помилка сервера: ${e.message}` });
    }
});

// --- API: ІМПОРТ (змінено лише збереження) ---
app.post('/import/:nickname', upload.single('file'), (req, res) => {
    const { nickname } = req.params;
    const { bankType, accountId } = req.body;
    const filePath = req.file.path;

    const newTransactions = [];
    let csvOptions = {};
    let mapping = {};

    if (bankType === 'privat') {
        csvOptions = {
            headers: ['Дата', 'Категорія', 'Картка', 'Опис операції', 'Сума в валюті картки', 'Валюта картки', 'Сума в валюті транзакції', 'Валюта транзакції', 'Залишок на кінець періоду', 'Валюта залишку'],
            skipLines: 2
        };
        mapping = { date: 'Дата', description: 'Опис операції', amount: 'Сума в валюті картки' };
    } else if (bankType === 'mono') {
        csvOptions = {
            headers: ['Дата i час операції', 'Деталі операції', 'MCC', 'Сума в валюті картки (UAH)', 'Сума в валюті операції', 'Валюта', 'Курс', 'Сума комісій (UAH)', 'Сума кешбеку (UAH)', 'Залишок після операції'],
            skipLines: 22
        };
        mapping = { date: 'Дата i час операції', description: 'Деталі операції', amount: 'Сума в валюті картки (UAH)' };
    } else {
        return res.status(400).json({ message: 'Невідомий тип банку' });
    }

    fs.createReadStream(filePath)
        .pipe(csv(csvOptions))
        .on('data', (row) => {
            const rawAmount = parseFloat(row[mapping.amount]);
            const description = row[mapping.description];
            const date = row[mapping.date];

            if (description && date && !isNaN(rawAmount)) {
                const finalAmount = Math.abs(rawAmount);
                const finalType = rawAmount >= 0 ? 'income' : 'expense';
                newTransactions.push({
                    id: `imp_${new Date().getTime()}_${Math.random()}`,
                    date: parseBankDate(date),
                    description: description,
                    amount: finalAmount,
                    type: finalType,
                    accountId: accountId,
                    budgetType: finalType === 'income' ? null : 'necessities'
                });
            }
        })
        .on('end', async () => {
            try {
                // !!! ЗАМІНА writeDb() на MongoDB !!!
                if (newTransactions.length > 0) {
                    await usersCollection.updateOne(
                        { nickname: nickname },
                        { $push: { transactions: { $each: newTransactions, $position: 0 } } }
                    );
                }

                fs.unlinkSync(filePath); // Видаляємо тимчасовий файл

                const user = await usersCollection.findOne({ nickname: nickname });
                console.log(`Імпортовано ${newTransactions.length} транзакцій`);
                res.status(200).json(user.transactions);
            } catch (e) {
                fs.unlinkSync(filePath); // Видаляємо, навіть якщо помилка
                res.status(500).json({ message: `Помилка збереження імпорту: ${e.message}` });
            }
        })
        .on('error', (error) => {
            fs.unlinkSync(filePath);
            res.status(500).json({ message: `Помилка парсингу файлу: ${error.message}` });
        });
});

// --- Запуск сервера ---
// Запускаємо сервер ТІЛЬКИ ПІСЛЯ підключення до БД
if (uri) {
    connectDb().then(() => {
        app.listen(port, () => {
            console.log(`Сервер Money Manager запущено на http://localhost:${port} і підключено до MongoDB.`);
        });
    });
} else {
    // Локальний запуск без URI (не рекомендовано, але можливо для тестів)
    console.warn("!!! Увага: MONGODB_URI не встановлено. Сервер не буде працювати.");
    // app.listen(port, () => {
    //     console.log(`Сервер Money Manager запущено локально, АЛЕ БЕЗ БАЗИ ДАНИХ.`);
    // });
}