import { useState } from 'react';

const API_URL = 'http://localhost:3001'; // Адреса нашого бек-енду

function LoginPage({ onLoginSuccess }) {
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Скидаємо помилку

        const endpoint = isRegistering ? '/register' : '/login';

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Щось пішло не так');
            }

            if (isRegistering) {
                // Успішна реєстрація, пропонуємо увійти
                setIsRegistering(false);
                setError('Успішна реєстрація! Тепер можете увійти.');
            } else {
                // Успішний вхід
                onLoginSuccess(data.nickname);
            }

        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="login-container">
            <form onSubmit={handleSubmit} className="login-form">
                <h2>{isRegistering ? 'Реєстрація' : 'Вхід'}</h2>

                {error && <p className="error-message">{error}</p>}

                <div className="form-group">
                    <label>Нікнейм</label>
                    <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Пароль</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" className="btn-submit">
                    {isRegistering ? 'Зареєструватись' : 'Увійти'}
                </button>

                <button
                    type="button"
                    className="btn-toggle-mode"
                    onClick={() => {
                        setIsRegistering(!isRegistering);
                        setError('');
                    }}
                >
                    {isRegistering ? 'Вже є акаунт? Увійти' : 'Немає акаунту? Реєстрація'}
                </button>
            </form>
        </div>
    );
}

export default LoginPage;