// Core API Module for StaffSync
const Api = (() => {
    let csrfToken = null;

    // A generic request wrapper around fetch
    async function request(endpoint, method = 'GET', data = null) {
        const url = `${API_BASE_URL}/${endpoint}`;

        const headers = {
            'Accept': 'application/json'
        };

        if (csrfToken) {
            headers['X-CSRF-TOKEN'] = csrfToken;
        }

        const options = {
            method,
            headers
        };

        if (data && method !== 'GET') {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const contentType = response.headers.get("content-type");
            let result = null;

            if (contentType && contentType.indexOf("application/json") !== -1) {
                result = await response.json();
            } else {
                result = { status: 'error', message: await response.text() };
            }

            if (!response.ok) {
                if (response.status === 401) {
                    // Unauthorized, typically means session expired
                    App.handleUnauthorized();
                }
                throw result;
            }
            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    return {
        setCsrfToken: (token) => { csrfToken = token; },

        auth: {
            login: (username, password) => request('routes/auth.php?action=login', 'POST', { username, password }),
            logout: () => request('routes/auth.php?action=logout', 'POST'),
            me: () => request('routes/auth.php?action=me', 'GET')
        },

        dashboard: {
            get: () => request('routes/dashboard.php', 'GET')
        },

        tickets: {
            list: (filters = {}) => {
                const params = new URLSearchParams(filters).toString();
                return request(`routes/tickets.php?action=list&${params}`, 'GET');
            },
            get: (id) => request(`routes/tickets.php?action=get&id=${id}`, 'GET'),
            create: (data) => request('routes/tickets.php?action=create', 'POST', data),
            updateStatus: (ticketId, status) => request('routes/tickets.php?action=update_status', 'POST', { ticket_id: ticketId, status })
        },

        messages: {
            add: (data) => request('routes/messages.php', 'POST', data)
        },

        departments: {
            list: () => request('routes/departments.php', 'GET'),
            create: (data) => request('routes/departments.php?action=create', 'POST', data),
            delete: (id) => request('routes/departments.php?action=delete', 'POST', { id })
        },

        users: {
            activeStaff: () => request('routes/users.php?action=active', 'GET'),
            stats: () => request('routes/users.php?action=stats', 'GET'),
            list: () => request('routes/users.php?action=list', 'GET'),
            create: (data) => request('routes/users.php?action=create', 'POST', data),
            updateProfile: (data) => request('routes/users.php?action=update_profile', 'POST', data)
        },

        cannedResponses: {
            list: () => request('routes/canned_responses.php', 'GET'),
            create: (data) => request('routes/canned_responses.php?action=create', 'POST', data),
            delete: (id) => request('routes/canned_responses.php?action=delete', 'POST', { id })
        }
    };
})();
