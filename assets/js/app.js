// Main App Logic for StaffSync SPA
const App = (() => {
    let currentUser = null;

    // UI Elements
    const rootEl = document.getElementById('app');

    // Utility: Simple HTML Escaping to prevent XSS
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return (unsafe + '').replace(/[&<"'>]/g, function (m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[m];
        });
    }

    // Utility: Calculate SLA
    function getSLAInfo(ticket) {
        if (ticket.status === 'resolved' || ticket.status === 'closed') return null;

        const lastUpdated = new Date(ticket.updated_at).getTime();
        const now = new Date().getTime();
        const diffHrs = (now - lastUpdated) / (1000 * 60 * 60);

        if (diffHrs < 24) return { text: '< 24h', color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' };
        if (diffHrs < 48) return { text: '> 24h', color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800' };
        return { text: 'SLA Breach', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 animate-pulse' };
    }

    // Utility: Premium Toast Notifications
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return alert(message);

        const toast = document.createElement('div');
        toast.className = `transform transition-all duration-300 translate-y-4 opacity-0 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md max-w-sm ${type === 'success' ? 'bg-green-50/90 border-green-200 text-green-800 dark:bg-green-900/40 dark:border-green-800 dark:text-green-300' :
            type === 'error' ? 'bg-red-50/90 border-red-200 text-red-800 dark:bg-red-900/40 dark:border-red-800 dark:text-red-300' :
                'bg-white/90 border-gray-200 text-gray-800 dark:bg-gray-800/90 dark:border-gray-700 dark:text-gray-200'
            }`;

        const icon = type === 'success'
            ? '<svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>'
            : '<svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';

        toast.innerHTML = `
            ${icon}
            <span class="font-medium text-sm">${escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-4', 'opacity-0');
        });

        // Auto remove
        setTimeout(() => {
            toast.classList.add('translate-y-4', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Utility: Toggle Theme
    function toggleTheme() {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        }
    }

    // Init App
    async function init() {
        try {
            const res = await Api.auth.me();
            if (res.status === 'success') {
                currentUser = res.user;
                renderDashboard();
            }
        } catch (err) {
            renderLogin();
        }
    }

    // Handlers
    function handleUnauthorized() {
        currentUser = null;
        renderLogin();
    }

    // Views
    function renderLogin() {
        rootEl.innerHTML = `
            <div class="flex-grow flex items-center justify-center bg-[#F9FAFB] dark:bg-gray-950 py-12 px-4 shadow-[inset_0_2px_40px_rgba(0,0,0,0.02)]">
                <div class="max-w-md w-full space-y-10 p-12 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-soft border border-gray-100 dark:border-gray-800 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-400 to-brand-600"></div>
                    <div class="text-center">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 mb-6 shadow-sm">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                        <h2 class="text-4xl font-black text-gray-900 dark:text-white tracking-tight">StaffSync</h2>
                        <p class="mt-3 text-gray-500 dark:text-gray-400 font-medium">Elevate your support experience.</p>
                    </div>
                    <form id="loginForm" class="space-y-6">
                        <div id="loginError" class="hidden rounded-2xl bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30"></div>
                        <div class="space-y-5">
                            <div>
                                <label class="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 ml-1">Username</label>
                                <input id="username" name="username" type="text" required class="bg-gray-50 dark:bg-white/5 border-none w-full px-6 py-4 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 ring-brand-500/20 outline-none transition-all" placeholder="e.g. admin">
                            </div>
                            <div>
                                <label class="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 ml-1">Password</label>
                                <input id="password" name="password" type="password" required class="bg-gray-50 dark:bg-white/5 border-none w-full px-6 py-4 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 ring-brand-500/20 outline-none transition-all" placeholder="••••••••">
                            </div>
                        </div>
                        <div class="pt-2">
                            <button type="submit" class="w-full bg-slate-900 dark:bg-brand-500 text-white py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-xl hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden">
                                <span class="relative z-10">Sign into Dashboard</span>
                                <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                        </div>
                        <p class="text-center text-xs text-gray-400 dark:text-gray-500">
                             &copy; 2026 StaffSyncAPI. Built for modern teams.
                        </p>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = e.target.username.value;
            const password = e.target.password.value;

            try {
                const res = await Api.auth.login(username, password);
                if (res.status === 'success') {
                    Api.setCsrfToken(res.csrf_token);
                    currentUser = res.user;
                    renderDashboard();
                }
            } catch (err) {
                const errDiv = document.getElementById('loginError');
                errDiv.textContent = err.message || 'Login failed';
                errDiv.classList.remove('hidden');
            }
        });
    }

    async function renderDashboard() {
        // Layout wrapper with side navigation
        rootEl.innerHTML = `
            <div class="min-h-screen flex bg-[#F9FAFB] dark:bg-gray-950 transition-colors duration-200">
                <!-- Floating Sidebar -->
                <aside class="w-72 hidden md:flex flex-col p-6 h-screen sticky top-0">
                    <div class="flex-grow flex flex-col bg-slate-900 dark:bg-gray-900 rounded-[3rem] shadow-2xl p-6 text-white relative overflow-hidden ring-1 ring-white/10">
                        <!-- Branding -->
                        <div class="mb-12 flex items-center gap-4 px-2">
                            <div class="w-10 h-10 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </div>
                            <h1 class="text-2xl font-black tracking-tighter text-white">StaffSync</h1>
                        </div>

                        <!-- User Profile Mini -->
                        <div class="mb-10 px-2 py-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center font-black text-white shadow-inner">
                                    ${currentUser.username.charAt(0).toUpperCase()}
                                </div>
                                <div class="overflow-hidden">
                                    <p class="font-bold text-sm truncate text-white/90">${escapeHtml(currentUser.full_name)}</p>
                                    <p class="text-[10px] font-bold uppercase tracking-widest text-white/40 border-b border-brand-500/30 w-fit">${currentUser.role}</p>
                                </div>
                            </div>
                            <button onclick="App.renderView('profile')" class="w-full text-center py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-xs font-bold text-white/80">
                                Manage Identity
                            </button>
                        </div>

                        <!-- Main Navigation -->
                        <div class="space-y-1.5 flex-grow overflow-y-auto px-1 custom-scrollbar" id="navLinks">
                            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 px-4 mb-3">Core</div>
                            <button onclick="App.renderView('dashboard')" class="nav-btn group" data-view="dashboard">
                                <svg class="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"></path></svg>
                                <span>Overview</span>
                            </button>
                            <button onclick="App.renderView('tickets')" class="nav-btn group" data-view="tickets">
                                <svg class="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                                <span>Work Desk</span>
                            </button>
                            
                            ${currentUser.role !== 'customer' ? `
                            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 px-4 mt-8 mb-3">Ops</div>
                            <button onclick="App.renderView('responses')" class="nav-btn group" data-view="responses">
                                <svg class="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                <span>Macro Lab</span>
                            </button>
                            ` : ''}

                            ${currentUser.role === 'admin' ? `
                            <button onclick="App.renderView('users')" class="nav-btn group" data-view="users">
                                <svg class="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                <span>Team Mesh</span>
                            </button>
                            <button onclick="App.renderView('departments')" class="nav-btn group" data-view="departments">
                                <svg class="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                <span>Dept. Map</span>
                            </button>
                            ` : ''}
                        </div>

                        <!-- Secondary Links -->
                        <div class="mt-8 pt-8 border-t border-white/5 space-y-1.5 px-1">
                            <button onclick="App.toggleTheme()" class="nav-btn-alt group text-white/40">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                                <span>Appearance</span>
                            </button>
                            <button id="logoutBtn" class="nav-btn-alt group !text-red-400/60 hover:!text-red-400 hover:!bg-red-500/10">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                                <span>Term Session</span>
                            </button>
                        </div>
                    </div>
                </aside>

                <!-- Mobile Navigation Bar -->
                <header class="md:hidden fixed top-0 w-full bg-white/80 dark:bg-gray-950/80 border-b border-gray-100 dark:border-white/5 p-4 z-50 backdrop-blur-xl flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white">
                             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                        <h1 class="text-xl font-black tracking-tighter dark:text-white">StaffSync</h1>
                    </div>
                    <button id="mobileMenuBtn" class="p-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                        <svg class="w-6 h-6 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                    </button>
                </header>

                <!-- Scrollable Content Canvas -->
                <main class="flex-grow pt-24 md:pt-0 overflow-y-auto h-screen relative scroll-smooth overflow-x-hidden">
                    <div class="max-w-7xl mx-auto p-4 md:p-12 lg:p-16">
                        <div id="mainView" class="w-full pb-32"></div>
                    </div>
                </main>
            </div>

            <style>
                .nav-btn {
                    @apply w-full text-left px-5 py-3 rounded-2xl flex items-center gap-4 text-white/50 hover:bg-white/5 hover:text-white transition-all font-bold text-sm tracking-tight;
                }
                .nav-btn.active {
                    @apply bg-brand-500 text-white shadow-lg shadow-brand-500/20 opacity-100;
                }
                .nav-btn.active svg { @apply opacity-100; }
                
                .nav-btn-alt {
                    @apply w-full text-left px-5 py-2.5 rounded-2xl flex items-center gap-4 transition-all font-bold text-[10px] uppercase tracking-widest;
                }
                
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
            </style>
        `;

        // Event Listeners for Dashboard
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await Api.auth.logout();
                handleUnauthorized();
            });
        }

        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                const aside = document.querySelector('aside');
                aside.classList.toggle('hidden');
                aside.classList.toggle('fixed');
                aside.classList.toggle('inset-0');
                aside.classList.toggle('z-50');
                aside.classList.toggle('bg-gray-950/50');
                aside.classList.toggle('backdrop-blur-sm');
            });
        }

        // Init Default View
        renderView('dashboard');
    }

    async function renderView(viewName) {
        const viewContainer = document.getElementById('mainView');
        // V5 Skeleton Loader
        viewContainer.innerHTML = `
            <div class="animate-pulse space-y-12">
                <div class="space-y-4">
                    <div class="h-12 bg-gray-200 dark:bg-gray-800 rounded-2xl w-1/4"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/3"></div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div class="h-32 bg-gray-200 dark:bg-gray-800 rounded-[2rem]"></div>
                    <div class="h-32 bg-gray-200 dark:bg-gray-800 rounded-[2rem]"></div>
                    <div class="h-32 bg-gray-200 dark:bg-gray-800 rounded-[2rem]"></div>
                </div>
                <div class="h-96 bg-gray-200 dark:bg-gray-800 rounded-[2rem]"></div>
            </div>`;

        // Update active state in sidebar
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
        });

        if (viewName === 'dashboard') {
            try {
                const res = await Api.dashboard.get();
                const d = res.data;
                const stats = d.stats;

                let html = `
                    <div class="mb-16">
                        <h2 class="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Workspace Overview</h2>
                        <p class="text-slate-500 font-medium">Capture insights and track team performance in real-time.</p>
                    </div>

                    <!-- V5 Stats Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                        <div class="group p-8 rounded-[2.5rem] bg-white dark:bg-gray-900 border border-slate-100 dark:border-white/5 shadow-soft hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                            <div class="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                            <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Volume</h3>
                            <div class="flex items-baseline gap-2">
                                <span class="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">${stats.total_tickets || 0}</span>
                                <span class="text-xs font-bold text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-full">TOTAL</span>
                            </div>
                        </div>
                        
                        <div class="group p-8 rounded-[2.5rem] bg-white dark:bg-gray-900 border border-slate-100 dark:border-white/5 shadow-soft hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                             <div class="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                            <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pending</h3>
                            <div class="flex items-baseline gap-2">
                                <span class="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">${stats.open_tickets || 0}</span>
                                <span class="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">ACTIVE</span>
                            </div>
                        </div>

                        <div class="group p-8 rounded-[2.5rem] bg-slate-900 border border-white/5 shadow-2xl transition-all duration-500 relative overflow-hidden">
                             <div class="absolute top-0 right-0 w-32 h-32 bg-brand-400/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                            <h3 class="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Resolution</h3>
                            <div class="flex items-baseline gap-2">
                                <span class="text-5xl font-black text-white tracking-tighter">${stats.resolved_tickets || 0}</span>
                                <span class="text-xs font-bold text-brand-400 bg-white/10 px-2 py-0.5 rounded-full">SUCCESS</span>
                            </div>
                        </div>
                    </div>

                    <!-- Activity Split -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div class="lg:col-span-2 space-y-6">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-xl font-black text-slate-900 dark:text-white tracking-tight">Recent Activity Stream</h3>
                                <button onclick="App.renderView('tickets')" class="text-xs font-black uppercase tracking-widest text-brand-500 hover:text-brand-600 transition-colors">History &rarr;</button>
                            </div>
                            
                            <div class="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-soft overflow-hidden">
                                <div class="divide-y divide-slate-50 dark:divide-white/5">
                `;

                if (d.recent_tickets.length === 0) {
                    html += `
                        <div class="p-20 text-center">
                            <div class="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>
                            </div>
                            <p class="text-slate-400 font-bold text-sm tracking-tight">The stream is currently quiet.</p>
                        </div>
                    `;
                } else {
                    d.recent_tickets.forEach(rt => {
                        const statusColors = {
                            'open': 'bg-amber-100/50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
                            'answered': 'bg-brand-100/50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400',
                            'customer_reply': 'bg-rose-100/50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
                            'resolved': 'bg-emerald-100/50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
                            'closed': 'bg-slate-100/50 text-slate-700 dark:bg-white/10 dark:text-slate-400'
                        };
                        const sc = statusColors[rt.status] || 'bg-slate-100 text-slate-800';

                        html += `
                            <div class="p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300 group cursor-pointer flex items-center justify-between" onclick="App.renderTicketDetail(${rt.id})">
                                <div class="flex items-center gap-5">
                                    <div class="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center font-black text-slate-400 group-hover:bg-brand-500 group-hover:text-white transition-all duration-500">
                                        #${rt.id.toString().slice(-2)}
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-brand-500 transition-colors uppercase text-sm">${escapeHtml(rt.subject)}</h4>
                                        <div class="flex items-center gap-2 mt-1">
                                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${new Date(rt.updated_at).toLocaleDateString()}</span>
                                            <span class="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${rt.priority}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-4">
                                    <span class="px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-widest border border-transparent ${sc}">
                                        ${rt.status.replace('_', ' ')}
                                    </span>
                                    <svg class="w-5 h-5 text-slate-300 group-hover:text-brand-500 transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
                                </div>
                            </div>
                        `;
                    });
                }

                html += `
                                </div>
                            </div>
                        </div>
                `;

                // Online Staff (Only for Admins/Agents)
                if (currentUser.role !== 'customer') {
                    html += `
                        <div class="space-y-6">
                            <h3 class="text-xl font-black text-slate-900 dark:text-white tracking-tight">Active Team</h3>
                            <div class="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-white/5 shadow-soft">
                                <ul class="space-y-4">
                    `;

                    if (!d.online_staff || d.online_staff.length === 0) {
                        html += `
                            <div class="py-12 text-center text-slate-300">
                                <p class="text-[10px] font-black uppercase tracking-widest">Standalone Mode</p>
                            </div>
                        `;
                    } else {
                        d.online_staff.forEach(os => {
                            html += `
                                <li class="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300">
                                    <div class="relative flex-shrink-0">
                                        <div class="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-white font-black text-xs">
                                            ${os.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span class="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-950 rounded-full"></span>
                                    </div>
                                    <div class="overflow-hidden">
                                        <p class="text-sm font-black text-slate-900 dark:text-white truncate">${escapeHtml(os.full_name || os.username)}</p>
                                        <p class="text-[10px] font-black text-brand-500 uppercase tracking-widest">${os.role}</p>
                                    </div>
                                </li>
                            `;
                        });
                    }

                    html += `
                                </ul>
                            </div>
                        </div>
                    `;
                }

                html += `</div>`;
                viewContainer.innerHTML = html;

            } catch (err) {
                viewContainer.innerHTML = `<div class="p-12 text-center"><p class="text-rose-500 font-bold">Failed to load telemetry: ${err.message}</p></div>`;
            }
        }
        else if (viewName === 'tickets') {
            try {
                // Get filter values from DOM if they exist
                const searchInput = document.getElementById('ticketSearchInput');
                const statusSelect = document.getElementById('ticketStatusFilter');

                const filters = {};
                if (searchInput && searchInput.value) filters.search = searchInput.value;
                if (statusSelect && statusSelect.value !== 'all') filters.status = statusSelect.value;

                const res = await Api.tickets.list(filters);
                const tickets = res.data;
                const viewMode = localStorage.getItem('ticket-view') || 'list';

                let html = `
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
                        <div class="space-y-2">
                            <h2 class="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Central Desk</h2>
                            <div class="flex items-center gap-4">
                                <p class="text-slate-500 font-medium">Coordinate and resolve incoming requests.</p>
                                ${currentUser.role !== 'customer' ? `
                                <div class="bg-slate-100 dark:bg-white/5 p-1 rounded-xl flex items-center gap-1">
                                    <button onclick="localStorage.setItem('ticket-view', 'list'); App.renderView('tickets')" class="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">List</button>
                                    <button onclick="localStorage.setItem('ticket-view', 'kanban'); App.renderView('tickets')" class="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">Board</button>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="flex flex-wrap items-center gap-4 w-full md:w-auto">
                            <form onsubmit="event.preventDefault(); App.renderView('tickets')" class="flex items-center gap-3 bg-white dark:bg-gray-900 px-5 py-3 rounded-2xl shadow-soft border border-slate-100 dark:border-white/5 flex-grow md:min-w-[300px] focus-within:ring-2 ring-brand-500/20 transition-all">
                                <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                <input type="text" id="ticketSearchInput" value="${filters.search || ''}" placeholder="Filter by ID or Subject..." class="bg-transparent border-none focus:ring-0 p-0 text-sm font-bold text-slate-900 dark:text-white w-full placeholder-slate-300">
                            </form>
                            
                            <select id="ticketStatusFilter" onchange="App.renderView('tickets')" class="bg-white dark:bg-gray-900 px-4 py-3 rounded-2xl shadow-soft border border-slate-100 dark:border-white/5 text-xs font-black uppercase tracking-widest text-slate-500 cursor-pointer focus:ring-2 ring-brand-500/20 outline-none">
                                <option value="all" ${!filters.status ? 'selected' : ''}>Status All</option>
                                <option value="open" ${filters.status === 'open' ? 'selected' : ''}>Open</option>
                                <option value="answered" ${filters.status === 'answered' ? 'selected' : ''}>Answered</option>
                                <option value="customer_reply" ${filters.status === 'customer_reply' ? 'selected' : ''}>Reply</option>
                                <option value="resolved" ${filters.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                                <option value="closed" ${filters.status === 'closed' ? 'selected' : ''}>Closed</option>
                            </select>

                            ${currentUser.role === 'customer' ? `
                                <button onclick="App.renderNewTicket()" class="bg-brand-500 text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-brand-500/20 hover:bg-brand-600 hover:-translate-y-0.5 transition-all duration-300">
                                    New Ticket
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;

                if (tickets.length === 0) {
                    html += `
                        <div class="bg-white dark:bg-gray-900 rounded-[3rem] p-32 text-center border border-slate-100 dark:border-white/5 shadow-soft">
                            <div class="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <svg class="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                            </div>
                            <h3 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight -mb-1">All Clear</h3>
                            <p class="text-slate-400 font-medium">No tickets matching your current filters were found.</p>
                        </div>
                    `;
                } else if (viewMode === 'kanban' && currentUser.role !== 'customer') {
                    // KANBAN VIEW
                    const cols = [
                        { id: 'open', title: 'Open', color: 'bg-amber-500' },
                        { id: 'answered', title: 'Answered', color: 'bg-brand-500' },
                        { id: 'customer_reply', title: 'Reply', color: 'bg-rose-500' },
                        { id: 'resolved', title: 'Resolved', color: 'bg-emerald-500' }
                    ];

                    html += `<div class="flex gap-8 overflow-x-auto pb-12 h-[calc(100vh-320px)] items-start custom-scrollbar">`;

                    cols.forEach(col => {
                        const colTickets = tickets.filter(t => t.status === col.id);
                        html += `
                            <div class="flex-shrink-0 w-80 flex flex-col max-h-full">
                                <div class="px-6 py-4 flex justify-between items-center mb-4">
                                     <div class="flex items-center gap-3">
                                        <span class="w-2 h-2 rounded-full ${col.color}"></span>
                                        <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">${col.title}</h4>
                                     </div>
                                     <span class="text-[10px] font-black text-slate-400">${colTickets.length}</span>
                                </div>
                                <div class="space-y-4 px-2 overflow-y-auto flex-grow h-full" ondragover="event.preventDefault();" ondrop="App.handleDrop(event, '${col.id}')">
                                    ${colTickets.map(t => `
                                        <div class="bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-soft border border-slate-100 dark:border-white/5 cursor-grab active:cursor-grabbing hover:shadow-2xl hover:border-brand-500/20 transition-all duration-300 group" 
                                             draggable="true" 
                                             ondragstart="event.dataTransfer.setData('text/plain', ${t.id});"
                                             onclick="App.renderTicketDetail(${t.id})">
                                            <div class="flex justify-between items-start mb-4 gap-4">
                                                <h4 class="font-bold text-slate-900 dark:text-white text-sm leading-tight uppercase tracking-tight group-hover:text-brand-500 transition-colors">${escapeHtml(t.subject)}</h4>
                                                ${t.priority === 'urgent' ? '<span class="flex-shrink-0 w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>' : ''}
                                            </div>
                                            <div class="flex items-center justify-between mt-auto">
                                                <div class="bg-slate-50 dark:bg-white/5 px-3 py-1 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    #${t.id}
                                                </div>
                                                <div class="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                                    ${escapeHtml(t.department) || 'Core'}
                                                </div>
                                            </div>
                                            ${App.getSLAInfo(t) ? `
                                            <div class="mt-4 pt-4 border-t border-slate-50 dark:border-white/5">
                                                 <span class="text-[9px] font-black px-2 py-0.5 rounded-lg border ${App.getSLAInfo(t).color.replace('text-', 'border-').replace('bg-', 'bg-opacity-10 ')} uppercase tracking-widest">${App.getSLAInfo(t).text}</span>
                                            </div>
                                            ` : ''}
                                        </div>
                                    `).join('')}
                                    ${colTickets.length === 0 ? `<div class="text-center p-8 text-[9px] font-black text-slate-200 border-2 border-dashed border-slate-50 dark:border-white/5 rounded-[2rem] uppercase tracking-[0.2em]">Drop Zone</div>` : ''}
                                </div>
                            </div>
                        `;
                    });

                    html += `</div>`;

                } else {
                    // LIST VIEW
                    html += `
                        <div class="bg-white dark:bg-gray-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-soft overflow-hidden">
                            <table class="min-w-full divide-y divide-slate-50 dark:divide-white/5">
                                <thead class="bg-slate-50 dark:bg-white/5">
                                    <tr>
                                        <th class="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Subject & Meta</th>
                                        <th class="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden sm:table-cell">Department</th>
                                        <th class="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                        <th class="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Action</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-50 dark:divide-white/5">
                    `;

                    tickets.forEach(t => {
                        const statusColors = {
                            'open': 'bg-amber-500/10 text-amber-500',
                            'answered': 'bg-brand-500/10 text-brand-500',
                            'customer_reply': 'bg-rose-500/10 text-rose-500',
                            'resolved': 'bg-emerald-500/10 text-emerald-500',
                            'closed': 'bg-slate-500/10 text-slate-500'
                        };
                        const sc = statusColors[t.status] || 'bg-slate-100 text-slate-800';

                        html += `
                            <tr class="hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300 group">
                                <td class="px-8 py-6">
                                    <div class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-brand-500 transition-colors">${escapeHtml(t.subject)}</div>
                                    <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-3">
                                        <span>#${t.id}</span>
                                        <span class="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        <span>${new Date(t.updated_at).toLocaleDateString()}</span>
                                        ${App.getSLAInfo(t) ? `<span class="font-black px-1.5 py-0.5 rounded border ${App.getSLAInfo(t).color.replace('text-', 'border-').replace('bg-', 'bg-opacity-5 ')}">${App.getSLAInfo(t).text}</span>` : ''}
                                    </div>
                                </td>
                                <td class="px-8 py-6 hidden sm:table-cell">
                                    <div class="text-xs font-black text-slate-400 uppercase tracking-widest">${escapeHtml(t.department) || 'Core'}</div>
                                </td>
                                <td class="px-8 py-6">
                                    <span class="px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-widest border border-transparent ${sc}">${t.status.replace('_', ' ')}</span>
                                </td>
                                <td class="px-8 py-6 text-right">
                                    <button onclick="App.renderTicketDetail(${t.id})" class="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-brand-500 transition-colors flex items-center gap-2 ml-auto group/btn">
                                        Manage <svg class="w-4 h-4 transform group-hover/btn:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                    html += `</tbody></table></div>`;
                }

                viewContainer.innerHTML = html;
            } catch (err) {
                viewContainer.innerHTML = `<div class="p-20 text-center"><p class="text-rose-500 font-black">Sync Failure: ${err.message}</p></div>`;
            }
        }
        else if (viewName === 'users') {
            try {
                const res = await Api.users.list();
                const users = res.data;
                let html = `
                    <div class="mb-12">
                        <h2 class="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Internal Team</h2>
                        <p class="text-slate-500 font-medium">Manage permissions and global access controls.</p>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div class="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-soft h-fit">
                            <h3 class="text-lg font-black text-slate-900 dark:text-white mb-6 tracking-tight">Onboard User</h3>
                            <form id="newUserForm" class="space-y-4">
                                <input type="text" id="nuUsername" required placeholder="Display Name" class="bg-slate-50 dark:bg-white/5 border-none w-full px-5 py-3 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 ring-brand-500/20 outline-none">
                                <input type="email" id="nuEmail" required placeholder="Email Coordinates" class="bg-slate-50 dark:bg-white/5 border-none w-full px-5 py-3 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 ring-brand-500/20 outline-none">
                                <input type="text" id="nuFullName" required placeholder="Legal Name" class="bg-slate-50 dark:bg-white/5 border-none w-full px-5 py-3 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 ring-brand-500/20 outline-none">
                                <select id="nuRole" class="bg-slate-50 dark:bg-white/5 border-none w-full px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 focus:ring-2 ring-brand-500/20 outline-none appearance-none">
                                    <option value="customer">Role: Customer</option>
                                    <option value="agent">Role: Support Agent</option>
                                    <option value="admin">Role: Administrator</option>
                                </select>
                                <input type="password" id="nuPassword" required placeholder="Secure Token" class="bg-slate-50 dark:bg-white/5 border-none w-full px-5 py-3 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 ring-brand-500/20 outline-none">
                                <button type="submit" class="w-full bg-slate-900 dark:bg-brand-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                                    Authorize Access
                                </button>
                            </form>
                        </div>

                        <div class="lg:col-span-2">
                             <div class="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-soft overflow-hidden">
                                <table class="min-w-full divide-y divide-slate-50 dark:divide-white/5">
                                    <thead class="bg-slate-50 dark:bg-white/5">
                                        <tr>
                                            <th class="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">User Profile</th>
                                            <th class="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Assignment</th>
                                            <th class="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Registry</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-50 dark:divide-white/5">
                `;
                users.forEach(u => {
                    const roleColor = u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-500' : (u.role === 'agent' ? 'bg-brand-500/10 text-brand-500' : 'bg-slate-500/10 text-slate-500');
                    html += `
                        <tr class="hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300">
                            <td class="px-8 py-6">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center font-black text-slate-400 text-xs">
                                        ${u.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">${escapeHtml(u.full_name)}</div>
                                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">${escapeHtml(u.email)}</div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-8 py-6">
                                <span class="px-3 py-1 text-[9px] font-black uppercase rounded-full tracking-widest ${roleColor}">${u.role}</span>
                            </td>
                            <td class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                ${new Date(u.created_at).toLocaleDateString()}
                            </td>
                        </tr>
                    `;
                });
                html += `</tbody></table></div></div></div>`;
                viewContainer.innerHTML = html;

                document.getElementById('newUserForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    try {
                        await Api.users.create({
                            username: document.getElementById('nuUsername').value,
                            email: document.getElementById('nuEmail').value,
                            full_name: document.getElementById('nuFullName').value,
                            role: document.getElementById('nuRole').value,
                            password: document.getElementById('nuPassword').value
                        });
                        App.toast('Credentials authorized', 'success');
                        document.getElementById('newUserForm').reset();
                        App.renderView('users');
                    } catch (err) {
                        App.toast(err.message, 'error');
                    }
                });

            } catch (err) {
                viewContainer.innerHTML = `<div class="p-20 text-center"><p class="text-rose-500 font-black">Sync Failure: ${err.message}</p></div>`;
            }
        }
        else if (viewName === 'profile') {
            try {
                const res = await Api.auth.me();
                const user = res.user;

                let html = `
                    <div class="max-w-4xl mx-auto">
                        <div class="mb-12">
                            <h2 class="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">User Identity</h2>
                            <p class="text-slate-500 font-medium">Manage your cryptographic profile and credentials.</p>
                        </div>
                        
                        <div class="bg-white dark:bg-gray-900 rounded-[3rem] p-12 border border-slate-100 dark:border-white/5 shadow-soft relative overflow-hidden">
                            <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-500 via-indigo-500 to-brand-500"></div>
                            
                            <div class="flex flex-col md:flex-row items-center gap-10 mb-12">
                                <div class="w-32 h-32 rounded-[2rem] bg-slate-900 ring-4 ring-slate-900/10 flex items-center justify-center text-white text-5xl font-black">
                                    ${user.username.charAt(0).toUpperCase()}
                                </div>
                                <div class="text-center md:text-left">
                                    <h3 class="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">${escapeHtml(user.full_name)}</h3>
                                    <p class="text-brand-500 font-black uppercase tracking-[0.3em] text-[10px] mt-1">@${escapeHtml(user.username)}</p>
                                    <span class="inline-flex mt-4 items-center px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] bg-slate-900 text-white">${user.role}</span>
                                </div>
                            </div>
                            
                            <form id="updateProfileForm" class="space-y-8">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div class="space-y-2">
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Visual Name</label>
                                        <input type="text" id="upFullName" required value="${escapeHtml(user.full_name)}" class="bg-slate-50 dark:bg-white/5 border-none w-full px-6 py-4 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 ring-brand-500/20 outline-none">
                                    </div>
                                    <div class="space-y-2">
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Digital Signature (Email)</label>
                                        <input type="email" id="upEmail" required value="${escapeHtml(user.email)}" class="bg-slate-50 dark:bg-white/5 border-none w-full px-6 py-4 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 ring-brand-500/20 outline-none">
                                    </div>
                                    <div class="md:col-span-2 space-y-2">
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Identity Rotation (New Password)</label>
                                        <input type="password" id="upPassword" placeholder="••••••••" class="bg-slate-50 dark:bg-white/5 border-none w-full px-6 py-4 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 ring-brand-500/20 outline-none">
                                        <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-2 ml-2">Leave blank to maintain current authentication sequence.</p>
                                    </div>
                                </div>
                                
                                <div class="flex justify-end pt-8 border-t border-slate-50 dark:border-white/5">
                                    <button type="submit" class="bg-brand-500 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-brand-500/20 hover:bg-brand-600 hover:-translate-y-1 transition-all duration-500">
                                        Commit Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;

                viewContainer.innerHTML = html;

                document.getElementById('updateProfileForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    try {
                        await Api.users.updateProfile({
                            full_name: document.getElementById('upFullName').value,
                            email: document.getElementById('upEmail').value,
                            password: document.getElementById('upPassword').value
                        });

                        currentUser.full_name = document.getElementById('upFullName').value;
                        App.toast('Identity synchronized', 'success');
                        setTimeout(() => window.location.reload(), 1000);
                    } catch (err) {
                        App.toast(err.message, 'error');
                    }
                });

            } catch (err) {
                viewContainer.innerHTML = `<div class="p-20 text-center"><p class="text-rose-500 font-black">Sync Failure: ${err.message}</p></div>`;
            }
        }
        else if (viewName === 'departments' && currentUser.role === 'admin') {
            try {
                const res = await Api.departments.list();
                const depts = res.data;
                let html = `
                    <div class="mb-12">
                        <h2 class="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Category Routing</h2>
                        <p class="text-slate-500 font-medium">Define department silos and triage logic.</p>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
                         <div class="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-soft h-fit">
                            <h3 class="text-lg font-black text-slate-900 dark:text-white mb-6 tracking-tight">Initialize Silo</h3>
                            <form id="newDeptForm" class="space-y-4">
                                <input type="text" id="ndName" required placeholder="Nomenclature (e.g. Sales)" class="bg-slate-50 dark:bg-white/5 border-none w-full px-5 py-4 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 ring-brand-500/20 outline-none">
                                <input type="text" id="ndDesc" placeholder="Protocol Description" class="bg-slate-50 dark:bg-white/5 border-none w-full px-5 py-4 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 ring-brand-500/20 outline-none">
                                <button type="submit" class="w-full bg-slate-900 dark:bg-brand-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                                    Commit Silo
                                </button>
                            </form>
                        </div>

                        <div class="lg:col-span-2">
                             <div class="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-soft overflow-hidden">
                                <table class="min-w-full divide-y divide-slate-50 dark:divide-white/5">
                                    <thead class="bg-slate-50 dark:bg-white/5">
                                        <tr>
                                            <th class="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Department</th>
                                            <th class="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Description</th>
                                            <th class="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-50 dark:divide-white/5">
                `;
                if (depts.length === 0) {
                    html += `<tr><td colspan="3" class="px-8 py-10 text-center text-[10px] font-black uppercase text-slate-300 tracking-widest">No silos configured</td></tr>`;
                } else {
                    depts.forEach(d => {
                        html += `
                            <tr class="hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-500">
                                <td class="px-8 py-6">
                                    <div class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">${escapeHtml(d.name)}</div>
                                </td>
                                <td class="px-8 py-6">
                                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${escapeHtml(d.description || 'General Purpose')}</div>
                                </td>
                                <td class="px-8 py-6 text-right">
                                    <button onclick="App.deleteDepartment(${d.id})" class="text-rose-300 hover:text-rose-500 transition-colors">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                }
                html += `</tbody></table></div></div></div>`;
                viewContainer.innerHTML = html;

                document.getElementById('newDeptForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    try {
                        await Api.departments.create({
                            name: document.getElementById('ndName').value,
                            description: document.getElementById('ndDesc').value
                        });
                        App.toast('Silo synchronized', 'success');
                        document.getElementById('newDeptForm').reset();
                        App.renderView('departments');
                    } catch (err) {
                        App.toast(err.message, 'error');
                    }
                });

            } catch (err) {
                viewContainer.innerHTML = `<div class="p-20 text-center"><p class="text-rose-500 font-black">Sync Failure: ${err.message}</p></div>`;
            }
        }
        else if (viewName === 'responses') {
            try {
                const res = await Api.cannedResponses.list();
                const responses = res.data;
                let html = `
                    <div class="mb-12">
                        <h2 class="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Macro Laboratory</h2>
                        <p class="text-slate-500 font-medium">Standardize communications with optimized response templates.</p>
                    </div>
                `;

                if (currentUser.role === 'admin' || currentUser.role === 'agent') {
                    html += `
                        <div class="bg-white dark:bg-gray-900 rounded-[3rem] p-10 border border-slate-100 dark:border-white/5 shadow-soft mb-16">
                            <h3 class="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">Design New Macro</h3>
                            <form id="newMacroForm" class="space-y-6">
                                <input type="text" id="nmTitle" required placeholder="Macro Title (e.g. Identity Triage)" class="bg-slate-50 dark:bg-white/5 border-none w-full px-6 py-4 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 ring-brand-500/20 outline-none">
                                <textarea id="nmBody" required rows="4" placeholder="Encoded response sequence..." class="bg-slate-50 dark:bg-white/5 border-none w-full px-6 py-4 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 ring-brand-500/20 outline-none resize-none"></textarea>
                                ${currentUser.role === 'admin' ? `
                                <label class="flex items-center space-x-3 cursor-pointer group">
                                    <div class="relative w-10 h-6 bg-slate-200 dark:bg-white/10 rounded-full transition-colors group-hover:bg-brand-500/20">
                                        <input type="checkbox" id="nmGlobal" class="hidden peer">
                                        <div class="absolute top-1 left-1 w-4 h-4 bg-white dark:bg-slate-400 rounded-full transition-all peer-checked:left-5 peer-checked:bg-brand-500"></div>
                                    </div>
                                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Broadcast Globally</span>
                                </label>
                                ` : ''}
                                <div class="flex justify-end">
                                    <button type="submit" class="bg-slate-900 dark:bg-brand-500 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:-translate-y-1 transition-all duration-300">
                                        Deploy Template
                                    </button>
                                </div>
                            </form>
                        </div>
                    `;
                }

                if (responses.length === 0) {
                    html += `
                        <div class="bg-slate-50 dark:bg-white/5 rounded-[3rem] p-24 text-center border-2 border-dashed border-slate-200 dark:border-white/10">
                            <p class="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Registry Empty</p>
                        </div>
                    `;
                } else {
                    html += `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">`;
                    responses.forEach(r => {
                        const isGlobal = r.is_global == 1;
                        html += `
                            <div class="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-soft hover:shadow-2xl transition-all duration-500 group flex flex-col">
                                <div class="flex justify-between items-start mb-6">
                                    <h4 class="font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-brand-500 transition-colors text-sm">${escapeHtml(r.title)}</h4>
                                    ${isGlobal ? '<span class="px-2 py-0.5 bg-brand-500 text-white text-[8px] font-black rounded-full tracking-widest">GLOBAL</span>' : '<span class="px-2 py-0.5 bg-slate-100 text-slate-400 text-[8px] font-black rounded-full tracking-widest">PRIVATE</span>'}
                                </div>
                                <div class="text-[11px] font-bold text-slate-500 line-clamp-4 mb-8 flex-grow leading-relaxed uppercase tracking-tighter">${escapeHtml(r.message_body)}</div>
                                <button onclick="App.deleteMacro(${r.id})" class="text-[9px] font-black uppercase tracking-widest text-rose-300 hover:text-rose-500 self-end transition-colors">
                                    Destruct &times;
                                </button>
                            </div>
                        `;
                    });
                    html += `</div>`;
                }

                viewContainer.innerHTML = html;

                if (document.getElementById('newMacroForm')) {
                    document.getElementById('newMacroForm').addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const title = document.getElementById('nmTitle').value;
                        const body = document.getElementById('nmBody').value;
                        const globalChk = document.getElementById('nmGlobal');
                        const isGlobal = globalChk ? globalChk.checked : false;

                        try {
                            await Api.cannedResponses.create({ title, message_body: body, is_global: isGlobal });
                            App.toast('Template saved successfully', 'success');
                            App.renderView('responses');
                        } catch (err) {
                            App.toast(err.message || 'Failed to create template', 'error');
                        }
                    });
                }
            } catch (err) {
                viewContainer.innerHTML = `<div class="text-red-500 bg-red-50 p-4 rounded-lg">Failed to load templates: ${err.message}</div>`;
            }
        }
    }

    async function renderTicketDetail(id) {
        const viewContainer = document.getElementById('mainView');
        // Skeleton Loader for Ticket Detail
        viewContainer.innerHTML = `
            <div class="animate-pulse space-y-6">
                <div class="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                    <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2 mb-4"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
                <div class="flex flex-col gap-4">
                    <div class="flex gap-4"><div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div><div class="flex-grow h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div></div>
                    <div class="flex gap-4 flex-row-reverse"><div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div><div class="flex-grow h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div></div>
                </div>
            </div>`;

        try {
            const res = await Api.tickets.get(id);
            const t = res.ticket;
            const messages = res.messages;

            let macros = [];
            if (currentUser.role !== 'customer') {
                try {
                    const mRes = await Api.cannedResponses.list();
                    macros = mRes.data || [];
                } catch (e) { }
            }

            const statusColors = {
                'open': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                'answered': 'bg-brand-500/10 text-brand-500 border-brand-500/20',
                'customer_reply': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                'resolved': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                'closed': 'bg-slate-500/10 text-slate-500 border-slate-500/20'
            };
            const sc = statusColors[t.status] || 'bg-slate-500/10 text-slate-500';

            let html = `
                <div class="mb-10 pb-10 border-b border-slate-100 dark:border-white/5">
                    <button onclick="App.renderView('tickets')" class="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-brand-500 transition-all mb-8">
                        <svg class="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                        Registry Return
                    </button>
                    
                    <div class="flex flex-col lg:flex-row justify-between items-start gap-8">
                        <div class="max-w-3xl">
                             <div class="flex items-center gap-3 mb-4">
                                <span class="px-3 py-1 text-[9px] font-black uppercase rounded-full tracking-widest ${sc} ring-1 ring-inset ring-current/20">
                                    ${t.status.replace('_', ' ')}
                                </span>
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Silo: ${escapeHtml(t.department) || 'Global'}</span>
                            </div>
                            <h2 class="text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-[1.1] mb-4">${escapeHtml(t.subject)}</h2>
                            <div class="flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>Ref: #${t.id}</span>
                                <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span>Initiated by ${escapeHtml(t.creator)}</span>
                                ${App.getSLAInfo(t) ? `
                                    <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                                    <span class="text-brand-500 font-black">${App.getSLAInfo(t).text}</span>
                                ` : ''}
                            </div>
                        </div>

                        ${currentUser.role !== 'customer' ? `
                        <div class="flex items-center gap-3 bg-white dark:bg-gray-900 p-2 rounded-2xl border border-slate-100 dark:border-white/5 shadow-soft">
                            <select id="statusSelect" class="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-500 focus:ring-0 outline-none pr-8">
                                <option value="open" ${t.status === 'open' ? 'selected' : ''}>Status: Open</option>
                                <option value="answered" ${t.status === 'answered' ? 'selected' : ''}>Status: Answered</option>
                                <option value="resolved" ${t.status === 'resolved' ? 'selected' : ''}>Status: Resolved</option>
                                <option value="closed" ${t.status === 'closed' ? 'selected' : ''}>Status: Closed</option>
                            </select>
                            <button onclick="App.updateTicketStatus(${t.id})" class="bg-slate-900 dark:bg-brand-500 text-white px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:opacity-90 transition-all">
                                Update
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <div class="space-y-8 mb-12">
            `;

            messages.forEach((m, idx) => {
                const isInternal = m.is_internal_note == 1;
                const isMe = m.user_id === currentUser.id;
                
                html += `
                    <div class="flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500" style="animation-delay: ${idx * 100}ms">
                        <div class="max-w-[85%] lg:max-w-[70%] flex gap-5 ${isMe ? 'flex-row-reverse' : 'flex-row'}">
                            <div class="flex-shrink-0 w-12 h-12 rounded-2xl ${isMe ? 'bg-slate-900' : 'bg-slate-100 dark:bg-white/5'} flex items-center justify-center font-black text-xs ${isMe ? 'text-white' : 'text-slate-400'} shadow-soft">
                                ${m.username.charAt(0).toUpperCase()}
                            </div>
                            
                            <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                                <div class="flex items-center gap-3 mb-2 px-1">
                                    <span class="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">${escapeHtml(m.username)}</span>
                                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    ${isInternal ? '<span class="text-[8px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-black uppercase tracking-widest ring-1 ring-amber-500/20">INTERNAL</span>' : ''}
                                </div>
                                <div class="${isInternal ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/10' : (isMe ? 'bg-indigo-50 dark:bg-indigo-500/5 border-indigo-100 dark:border-indigo-500/10 text-indigo-900 dark:text-indigo-100' : 'bg-white dark:bg-gray-900 border-slate-100 dark:border-white/5')} border rounded-[1.5rem] ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'} p-6 shadow-soft">
                                    <div class="text-[13px] font-medium leading-[1.6] whitespace-pre-wrap">${escapeHtml(m.message)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `
                </div>
                ${t.status !== 'closed' ? `
                <div class="bg-white dark:bg-gray-900 rounded-[3rem] p-10 border border-slate-100 dark:border-white/5 shadow-soft relative overflow-hidden">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Communication Portal</h3>
                        ${macros.length > 0 ? `
                        <select id="macroSelect" class="bg-slate-50 dark:bg-white/5 border-none text-[9px] font-black uppercase tracking-widest text-slate-500 px-4 py-2 rounded-xl focus:ring-2 ring-brand-500/20 outline-none appearance-none" onchange="document.getElementById('replyMsg').value += this.value; this.value='';">
                            <option value="" disabled selected>Quick Encode...</option>
                            ${macros.map(m => `<option value="${escapeHtml(m.message_body).replace(/"/g, '&quot;')}">${escapeHtml(m.title)}</option>`).join('')}
                        </select>
                        ` : ''}
                    </div>
                    <form id="replyForm" class="space-y-6">
                        <textarea id="replyMsg" required rows="5" class="bg-slate-50 dark:bg-white/5 border-none w-full p-8 rounded-[2rem] text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 ring-brand-500/20 outline-none resize-none transition-all" placeholder="Input response sequence..."></textarea>
                        
                        <div class="flex flex-col md:flex-row justify-between items-center gap-6">
                            ${currentUser.role !== 'customer' ? `
                                <label class="flex items-center space-x-3 cursor-pointer group">
                                    <div class="relative w-10 h-6 bg-slate-200 dark:bg-white/10 rounded-full transition-colors group-hover:bg-amber-500/20">
                                        <input type="checkbox" id="replyInternal" class="hidden peer">
                                        <div class="absolute top-1 left-1 w-4 h-4 bg-white dark:bg-slate-400 rounded-full transition-all peer-checked:left-5 peer-checked:bg-amber-500"></div>
                                    </div>
                                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Cryptography</span>
                                </label>
                            ` : '<div></div>'}
                            
                            <button type="submit" class="w-full md:w-auto bg-slate-900 dark:bg-brand-500 text-white px-12 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:-translate-y-1 transition-all duration-300">
                                Dispatch Message
                            </button>
                        </div>
                    </form>
                </div>
                ` : `
                <div class="bg-slate-50 dark:bg-white/5 rounded-[3rem] p-12 text-center border border-slate-100 dark:border-white/5">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Communication Sequence Terminated (Closed)</p>
                </div>
                `}
            `;

            viewContainer.innerHTML = html;

            if (t.status !== 'closed') {
                document.getElementById('replyForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const msg = document.getElementById('replyMsg').value;
                    const isInternal = document.getElementById('replyInternal') ? document.getElementById('replyInternal').checked : false;

                    try {
                        await Api.messages.add({
                            ticket_id: id,
                            message: msg,
                            is_internal_note: isInternal
                        });
                        App.toast('Message Dispatched', 'success');
                        App.renderTicketDetail(id);
                    } catch (err) {
                        App.toast(err.message, 'error');
                    }
                });
            }

        } catch (err) {
            viewContainer.innerHTML = `<div class="p-20 text-center"><p class="text-rose-500 font-black">Sync Failure: ${err.message}</p></div>`;
        }
    }

    async function renderNewTicket() {
        const viewContainer = document.getElementById('mainView');

        try {
            const deptsRes = await Api.departments.list();
            const depts = deptsRes.data;

            let deptOptions = depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

            viewContainer.innerHTML = `
                <div class="max-w-3xl mx-auto py-12">
                    <button onclick="App.renderView('tickets')" class="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-brand-500 transition-all mb-12">
                        <svg class="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                        Discussion Index
                    </button>
                    
                    <div class="mb-12">
                        <h2 class="text-5xl font-black tracking-tighter text-slate-900 dark:text-white mb-4">Initialize Support Request</h2>
                        <p class="text-slate-500 font-medium">Please define the parameters of your inquiry for optimized routing.</p>
                    </div>
                    
                    <div class="bg-white dark:bg-gray-900 rounded-[3rem] p-12 border border-slate-100 dark:border-white/5 shadow-soft relative overflow-hidden">
                        <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-500 via-indigo-500 to-brand-500"></div>
                        
                        <form id="newTicketForm" class="space-y-10">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div class="space-y-3">
                                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Assigned Silo</label>
                                    <select id="ntDept" class="bg-slate-50 dark:bg-white/5 border-none w-full px-6 py-4 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 ring-brand-500/20 outline-none appearance-none" required>
                                        <option value="" disabled selected>Select routing...</option>
                                        ${deptOptions}
                                    </select>
                                </div>
                                <div class="space-y-3">
                                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Severity Level</label>
                                    <select id="ntPriority" class="bg-slate-50 dark:bg-white/5 border-none w-full px-6 py-4 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 ring-brand-500/20 outline-none appearance-none">
                                        <option value="low">Priority: Normal</option>
                                        <option value="medium" selected>Priority: Standard</option>
                                        <option value="high">Priority: Elevated</option>
                                        <option value="urgent">Priority: Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div class="space-y-3">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Request Nomenclature (Subject)</label>
                                <input type="text" id="ntSubject" required class="bg-slate-50 dark:bg-white/5 border-none w-full px-8 py-5 rounded-2xl text-lg font-black tracking-tight text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 ring-brand-500/20 outline-none" placeholder="Brief executive summary...">
                            </div>

                            <div class="space-y-3">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Details (Encoded Description)</label>
                                <textarea id="ntMessage" required rows="6" class="bg-slate-50 dark:bg-white/5 border-none w-full p-8 rounded-[2rem] text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 ring-brand-500/20 outline-none resize-none transition-all" placeholder="Explain the technical or logistical impasse..."></textarea>
                            </div>

                            <div class="flex justify-end pt-8 border-t border-slate-50 dark:border-white/5">
                                <button type="submit" class="w-full bg-slate-900 dark:bg-brand-500 text-white py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-xl hover:-translate-y-1 transition-all duration-500">
                                    Initiate Process
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            document.getElementById('newTicketForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    const res = await Api.tickets.create({
                        department_id: document.getElementById('ntDept').value,
                        subject: document.getElementById('ntSubject').value,
                        priority: document.getElementById('ntPriority').value,
                        message: document.getElementById('ntMessage').value
                    });
                    if (res.status === 'success') {
                        App.toast('Request Established', 'success');
                        App.renderTicketDetail(res.ticket_id);
                    }
                } catch (err) {
                    App.toast(err.message, 'error');
                }
            });

        } catch (err) {
            viewContainer.innerHTML = `<div class="p-20 text-center"><p class="text-rose-500 font-black">Sync Failure: ${err.message}</p></div>`;
        }
    }

    async function updateTicketStatus(id) {
        const select = document.getElementById('statusSelect');
        const status = select.value;
        try {
            await Api.tickets.updateStatus(id, status);
            App.toast('Status updated successfully', 'success');
            renderTicketDetail(id); // reload
        } catch (e) {
            App.toast(e.message || 'Error updating status', 'error');
        }
    }

    async function deleteMacro(id) {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            await Api.cannedResponses.delete(id);
            App.toast('Template deleted', 'success');
            App.renderView('responses');
        } catch (e) {
            App.toast(e.message || 'Failed to delete template', 'error');
        }
    }

    async function deleteDepartment(id) {
        if (!confirm('Are you sure you want to delete this department?\nNote: You cannot delete a department that contains active tickets.')) return;
        try {
            await Api.departments.delete(id);
            App.toast('Department deleted successfully', 'success');
            App.renderView('departments');
        } catch (e) {
            App.toast(e.message || 'Failed to delete department', 'error');
        }
    }

    async function handleDrop(event, newStatus) {
        event.preventDefault();
        const ticketId = event.dataTransfer.getData('text/plain');
        if (!ticketId) return;

        try {
            await Api.tickets.updateStatus(ticketId, newStatus);
            App.toast('Ticket moved successfully', 'success');
            App.renderView('tickets');
        } catch (e) {
            App.toast(e.message || 'Failed to move ticket', 'error');
        }
    }

    // Expose public API
    return {
        init,
        handleUnauthorized,
        renderView,
        renderTicketDetail,
        renderNewTicket,
        updateTicketStatus,
        deleteMacro,
        deleteDepartment,
        handleDrop,
        toast: showToast,
        toggleTheme,
        getSLAInfo
    };
})();

// Start App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
