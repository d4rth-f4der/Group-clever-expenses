const API_URL = '';

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
        body: body ? JSON.stringify(body) : null
    };

    try {
        const response = await fetch(`${API_URL}/api/${endpoint}`, options);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'API error');
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}