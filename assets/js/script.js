// ================ إعدادات Firebase ================
const firebaseConfig = {
    apiKey: "AIzaSyDX_0F5dMZVp548piOKtko056NDf28UhVc",
    authDomain: "dream-bank-2ed13.firebaseapp.com",
    databaseURL: "https://dream-bank-2ed13-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "dream-bank-2ed13",
    storageBucket: "dream-bank-2ed13.firebasestorage.app",
    messagingSenderId: "15273062983",
    appId: "1:15273062983:web:4686593dc46bda7907b762"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentUser = null;
let currentPage = 1;
const dreamsPerPage = 6;
let allDreams = [];
let filteredDreams = [];

document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initBackToTop();
    initMobileMenu();
    checkAuth();
    loadStats();
    
    if (document.getElementById('recentDreams')) loadRecentDreams();
    if (document.getElementById('dreamsGrid')) loadAllDreams();
    if (document.getElementById('dreamDetails')) loadDreamById();
    if (document.getElementById('loginForm')) initLogin();
    if (document.getElementById('registerForm')) initRegister();
    if (document.getElementById('dreamForm')) initDreamForm();
    if (document.getElementById('searchDreams')) initSearch();
});

function initHeader() {
    const header = document.getElementById('mainHeader');
    if (!header) return;
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;
        if (currentScroll < 50) header.classList.remove('hidden');
        else if (currentScroll > lastScroll) header.classList.add('hidden');
        else header.classList.remove('hidden');
        lastScroll = currentScroll;
    });
}

function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 300);
    });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function initMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('mobileSidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('overlay');
    if (!menuBtn || !sidebar || !closeBtn || !overlay) return;
    
    menuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    const close = () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    };
    
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
}

function checkAuth() {
    const user = localStorage.getItem('dreamBankUser');
    if (user) {
        currentUser = JSON.parse(user);
        document.querySelectorAll('#userMenu, #sidebarUser').forEach(el => {
            if (el) el.innerHTML = `<span class="username"><i class="fas fa-user"></i> ${currentUser.username}</span><button onclick="logout()" class="btn btn-outline">خروج</button>`;
        });
    }
}

window.logout = () => {
    localStorage.removeItem('dreamBankUser');
    currentUser = null;
    window.location.reload();
};

function loadStats() {
    database.ref('stats').once('value').then(s => {
        const stats = s.val() || { dreams: 0, users: 0, today: 0, likes: 0 };
        document.querySelectorAll('[data-stat]').forEach(el => {
            const stat = el.getAttribute('data-stat');
            if (stats[stat] !== undefined) el.textContent = stats[stat];
        });
    });
}

function loadRecentDreams() {
    database.ref('dreams').orderByChild('isPublic').equalTo(true).limitToLast(6).once('value').then(s => {
        const dreams = s.val();
        const grid = document.getElementById('recentDreams');
        if (!grid) return;
        grid.innerHTML = '';
        if (dreams) {
            Object.entries(dreams).reverse().forEach(([id, d]) => grid.appendChild(createDreamCard(id, d)));
        } else grid.innerHTML = '<div class="no-data"><p>لا توجد أحلام بعد</p></div>';
    });
}

function loadAllDreams() {
    database.ref('dreams').orderByChild('isPublic').equalTo(true).once('value').then(s => {
        const dreams = s.val();
        if (dreams) {
            allDreams = Object.entries(dreams).map(([id, d]) => ({ id, ...d })).reverse();
            filteredDreams = [...allDreams];
            displayDreams();
        }
    });
}

function displayDreams() {
    const grid = document.getElementById('dreamsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const start = (currentPage - 1) * dreamsPerPage;
    const end = start + dreamsPerPage;
    filteredDreams.slice(start, end).forEach(d => grid.appendChild(createDreamCard(d.id, d)));
    const btn = document.getElementById('loadMoreBtn');
    if (btn) btn.style.display = currentPage * dreamsPerPage >= filteredDreams.length ? 'none' : 'inline-flex';
}

function createDreamCard(id, d) {
    const card = document.createElement('div');
    card.className = 'dream-card';
    card.innerHTML = `
        <div class="dream-card-header">
            <div class="dream-user"><i class="fas fa-user-circle"></i><span>${d.username || 'مستخدم'}</span></div>
            <div class="dream-date">${new Date(d.date).toLocaleDateString('ar-EG')}</div>
        </div>
        <div class="dream-content">${(d.text || '').substring(0, 150)}${d.text?.length > 150 ? '...' : ''}</div>
        <div class="dream-footer">
            <div class="dream-likes"><i class="fas fa-heart" onclick="likeDream('${id}', event)"></i><span>${d.likes || 0}</span></div>
            <a href="/A-Dream-Bank/pages/dream.html?id=${id}" class="read-more">اقرأ المزيد <i class="fas fa-arrow-left"></i></a>
        </div>
    `;
    return card;
}

window.likeDream = (id, e) => {
    e?.stopPropagation();
    database.ref('dreams/' + id).transaction(d => { if (d) d.likes = (d.likes || 0) + 1; return d; });
    database.ref('stats/likes').transaction(l => (l || 0) + 1);
};

function loadDreamById() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return (window.location.href = '/A-Dream-Bank/pages/explore.html');
    database.ref('dreams/' + id).once('value').then(s => {
        const d = s.val();
        const el = document.getElementById('dreamDetails');
        if (!el) return;
        if (d) {
            el.innerHTML = `
                <div class="dream-detail-header">
                    <div class="dream-detail-user"><i class="fas fa-user-circle"></i> ${d.username || 'مستخدم'}</div>
                    <div class="dream-detail-date"><i class="far fa-calendar-alt"></i> ${new Date(d.date).toLocaleString('ar-EG')}</div>
                </div>
                <div class="dream-detail-content">${d.text}</div>
                <div class="dream-detail-actions">
                    <button onclick="likeDream('${id}')" class="btn btn-secondary"><i class="fas fa-heart"></i> إعجاب (${d.likes || 0})</button>
                    <a href="/A-Dream-Bank/pages/explore.html" class="btn btn-primary">العودة</a>
                </div>
            `;
        } else el.innerHTML = '<div class="no-data"><p>الحلم غير موجود</p><a href="/A-Dream-Bank/pages/explore.html" class="btn btn-primary">العودة</a></div>';
    });
}

function initSearch() {
    document.getElementById('searchDreams').addEventListener('input', e => {
        const term = e.target.value.toLowerCase();
        filteredDreams = allDreams.filter(d => d.text?.toLowerCase().includes(term) || d.username?.toLowerCase().includes(term));
        currentPage = 1;
        displayDreams();
    });
    document.querySelectorAll('.filter-btn').forEach(b => b.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const filter = this.dataset.filter;
        if (filter === 'popular') filteredDreams = [...allDreams].sort((a, b) => (b.likes || 0) - (a.likes || 0));
        else if (filter === 'recent') filteredDreams = [...allDreams].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        else filteredDreams = [...allDreams];
        currentPage = 1;
        displayDreams();
    }));
    const loadMore = document.getElementById('loadMoreBtn');
    if (loadMore) loadMore.addEventListener('click', () => { currentPage++; displayDreams(); });
}

function initLogin() {
    document.getElementById('loginForm').addEventListener('submit', e => {
        e.preventDefault();
        const u = document.getElementById('username').value.trim();
        const p = document.getElementById('password').value.trim();
        if (!u || !p) return showMessage('املأ جميع الحقول', 'error');
        database.ref('users').orderByChild('username').equalTo(u).once('value', s => {
            let found = false;
            s.forEach(c => {
                const user = c.val();
                if (user.password === p) {
                    found = true;
                    localStorage.setItem('dreamBankUser', JSON.stringify({ id: c.key, username: user.username }));
                    showMessage('تم الدخول', 'success');
                    setTimeout(() => window.location.href = '/A-Dream-Bank/index.html', 1500);
                }
            });
            if (!found) showMessage('خطأ في البيانات', 'error');
        });
    });
}

function initRegister() {
    document.getElementById('registerForm').addEventListener('submit', e => {
        e.preventDefault();
        const u = document.getElementById('username').value.trim();
        const p = document.getElementById('password').value;
        const cp = document.getElementById('confirmPassword')?.value;
        const agree = document.getElementById('agreeTerms')?.checked;
        if (!u || !p) return showMessage('املأ الحقول المطلوبة', 'error');
        if (p.length < 6) return showMessage('كلمة السر 6 أحرف على الأقل', 'error');
        if (cp && p !== cp) return showMessage('كلمة السر غير متطابقة', 'error');
        if (!agree) return showMessage('وافق على الشروط', 'error');
        
        database.ref('users').orderByChild('username').equalTo(u).once('value', s => {
            if (s.exists()) return showMessage('الاسم موجود', 'error');
            const ref = database.ref('users').push();
            ref.set({ username: u, email: document.getElementById('email')?.value || '', password: p, joinDate: new Date().toISOString().split('T')[0] })
                .then(() => {
                    database.ref('stats/users').transaction(u => (u || 0) + 1);
                    showMessage('تم التسجيل', 'success');
                    setTimeout(() => window.location.href = '/A-Dream-Bank/pages/login.html', 2000);
                });
        });
    });
}

function initDreamForm() {
    document.getElementById('dreamForm').addEventListener('submit', e => {
        e.preventDefault();
        if (!currentUser) return (window.location.href = '/A-Dream-Bank/pages/login.html');
        const text = document.getElementById('dreamText').value.trim();
        if (!text) return showMessage('اكتب الحلم', 'error');
        const isPublic = document.getElementById('isPublic')?.checked || false;
        database.ref('dreams').push({
            userId: currentUser.id, username: currentUser.username, text, date: new Date().toLocaleString('ar-EG'),
            timestamp: firebase.database.ServerValue.TIMESTAMP, isPublic, likes: 0
        }).then(() => {
            database.ref('stats/dreams').transaction(d => (d || 0) + 1);
            database.ref('stats/today').transaction(t => (t || 0) + 1);
            showMessage('تم الحفظ', 'success');
            setTimeout(() => window.location.href = '/A-Dream-Bank/pages/explore.html', 2000);
        });
    });
}

function showMessage(msg, type = 'success') {
    const div = document.createElement('div');
    div.className = `notification notification-${type}`;
    div.style.cssText = `position:fixed; top:90px; right:20px; background:${type==='success'?'#10b981':'#ef4444'}; color:white; padding:1rem 2rem; border-radius:0.5rem; z-index:9999; animation:slideIn 0.3s ease;`;
    div.innerHTML = `<i class="fas ${type==='success'?'fa-check-circle':'fa-exclamation-circle'}"></i> ${msg}`;
    document.body.appendChild(div);
    setTimeout(() => { div.remove(); }, 3000);
}

const style = document.createElement('style');
style.textContent = `@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`;
document.head.appendChild(style);