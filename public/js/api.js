const API_URL = '';

export async function register({ username, email, password }) {
    return apiRequest('auth/register', 'POST', { username, email, password });
}

export async function resendVerification(email) {
    return apiRequest('auth/resend-verification', 'POST', { email });
}

export async function findUserByName(username) {
    try {
        const response = await apiRequest(`users/${username}`);
        return response;
    } catch (error) {
        if (error.message === 'User not found') {
            return null;
        }
        throw error;
    }
}

export async function apiRequest(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('userToken');
    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
        // Avoid 304 and stale cached payloads for sensitive data like groups/history
        cache: method === 'GET' ? 'no-store' : undefined,
    };

    try {
        const response = await fetch(`${API_URL}/api/${endpoint}`, options);
        
        if (!response.ok) {
            if (response.status === 401) {
                // Clear token and notify app to show login
                try { localStorage.removeItem('userToken'); } catch (_) {}
                try { window.dispatchEvent(new CustomEvent('api:unauthorized')); } catch (_) {}
                let message = 'Unauthorized';
                try {
                    const errorData = await response.json();
                    message = errorData.message || message;
                } catch (_) {}
                const err = new Error(message);
                err.status = 401;
                throw err;
            }
            const errorData = await response.json();
            throw new Error(errorData.message || 'API error');
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}