// ================ بنك الأحلام - الملف الرئيسي الكامل ================
// هذا الملف يحتوي على كل المنطق الخاص بالموقع

// ================ إعدادات Firebase ================
const firebaseConfig = {
    apiKey: "AIzaSyDX_0F5dMZVp548piOKtko056NDf28UhVc",
    authDomain: "dream-bank-2ed13.firebaseapp.com",
    databaseURL: "https://dream-bank-2ed13-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "dream-bank-2ed13",
    storageBucket: "dream-bank-2ed13.firebasestorage.app",
    messagingSenderId: "15273062983",
    appId: "1:15273062983:web:4686593dc46bda7907b762",
    measurementId: "G-3JGCVJKM2J"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const analytics = firebase.analytics();

// ================ متغيرات عامة ================
let currentUser = null;
let currentUserId = null;
let currentPage = 1;
let dreamsPerPage = 6;
let allDreams = [];
let filteredDreams = [];
let searchTimeout = null;

// ================ تهيئة الصفحة ================
document.addEventListener('DOMContentLoaded', () => {
    console.log('بنك الأحلام - جاهز للعمل');
    
    // تهيئة جميع الأنظمة
    initHeader();
    initScrollProgress();
    initBackToTop();
    initMobileMenu();
    checkAuth();
    
    // تحميل الإحصائيات
    loadStats();
    
    // تحميل الأحلام حسب الصفحة
    if (document.getElementById('dreamsGrid')) {
        if (window.location.pathname.includes('explore')) {
            loadAllDreams();
            initSearchAndFilters();
        } else {
            loadRecentDreams();
        }
    }
    
    // تحميل حلم محدد
    if (document.getElementById('dreamDetails')) {
        loadDreamById();
    }
    
    // تهيئة النماذج
    initForms();
    
    // تسجيل زيارة في التحليلات
    logPageView();
});

// ================ 1. نظام الهيدر المتحرك ================
function initHeader() {
    const header = document.getElementById('mainHeader');
    if (!header) return;
    
    let lastScroll = 0;
    let ticking = false;
    
    window.addEventListener('scroll', () => {
        lastScroll = window.scrollY;
        
        if (!ticking) {
            window.requestAnimationFrame(() => {
                if (lastScroll < 50) {
                    header.classList.remove('hidden');
                } else if (lastScroll > (window.lastScrollValue || 0)) {
                    header.classList.add('hidden');
                } else {
                    header.classList.remove('hidden');
                }
                
                window.lastScrollValue = lastScroll;
                ticking = false;
            });
            
            ticking = true;
        }
    });
}

// ================ 2. مؤشر التمرير ================
function initScrollProgress() {
    const loadingBar = document.getElementById('loadingBar');
    if (!loadingBar) return;
    
    window.addEventListener('scroll', () => {
        const winScroll = document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        loadingBar.style.width = scrolled + '%';
    });
}

// ================ 3. زر العودة للأعلى ================
function initBackToTop() {
    const backToTop = document.getElementById('backToTop');
    if (!backToTop) return;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });
    
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ================ 4. القائمة الجانبية للجوال ================
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
    
    function closeMenu() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);
}

// ================ 5. نظام المستخدمين ================
function checkAuth() {
    const storedUser = localStorage.getItem('dreamBankUser');
    
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            currentUserId = currentUser.id;
            updateUIForLoggedInUser();
        } catch (e) {
            console.error('خطأ في قراءة بيانات المستخدم:', e);
            logout();
        }
    }
}

function updateUIForLoggedInUser() {
    // تحديث القائمة الرئيسية
    const userMenu = document.getElementById('userMenu');
    if (userMenu && currentUser) {
        userMenu.innerHTML = `
            <span class="username">
                <i class="fas fa-user"></i> ${escapeHtml(currentUser.username)}
            </span>
            <button onclick="logout()" class="btn btn-outline">خروج</button>
        `;
    }
    
    // تحديث القائمة الجانبية
    const sidebarUser = document.getElementById('sidebarUser');
    if (sidebarUser && currentUser) {
        sidebarUser.innerHTML = `
            <span class="username" style="justify-content: center;">
                <i class="fas fa-user"></i> ${escapeHtml(currentUser.username)}
            </span>
            <button onclick="logout()" class="btn btn-outline" style="width: 100%;">خروج</button>
        `;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function logout() {
    localStorage.removeItem('dreamBankUser');
    currentUser = null;
    currentUserId = null;
    
    // إعادة تحميل الصفحة لتحديث الواجهة
    window.location.reload();
}

// ================ 6. تحميل الإحصائيات ================
function loadStats() {
    const statsRef = database.ref('stats');
    
    statsRef.once('value').then((snapshot) => {
        const stats = snapshot.val() || { dreams: 0, users: 0, today: 0, likes: 0 };
        
        // تحديث كل العناصر التي تحمل data-stat
        document.querySelectorAll('[data-stat]').forEach(el => {
            const statName = el.getAttribute('data-stat');
            if (stats[statName] !== undefined) {
                el.textContent = stats[statName];
            }
        });
        
        // تحديث أرقام الفوتر
        updateFooterStats(stats);
    }).catch(error => {
        console.error('خطأ في تحميل الإحصائيات:', error);
    });
}

function updateFooterStats(stats) {
    const footerStats = {
        dreams: document.getElementById('footerDreams'),
        users: document.getElementById('footerUsers'),
        likes: document.getElementById('footerLikes')
    };
    
    if (footerStats.dreams) footerStats.dreams.textContent = stats.dreams || 0;
    if (footerStats.users) footerStats.users.textContent = stats.users || 0;
    if (footerStats.likes) footerStats.likes.textContent = stats.likes || 0;
}

// ================ 7. تحميل أحدث الأحلام ================
function loadRecentDreams() {
    const dreamsRef = database.ref('dreams')
        .orderByChild('isPublic')
        .equalTo(true)
        .limitToLast(6);
    
    dreamsRef.once('value').then((snapshot) => {
        const dreams = snapshot.val();
        const grid = document.getElementById('dreamsGrid');
        
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (dreams) {
            const dreamsArray = Object.entries(dreams).reverse();
            
            dreamsArray.forEach(([id, dream]) => {
                const card = createDreamCard(id, dream);
                grid.appendChild(card);
            });
        } else {
            showNoDreams(grid);
        }
    }).catch(error => {
        console.error('خطأ في تحميل الأحلام:', error);
    });
}

// ================ 8. تحميل كل الأحلام (لصفحة الاستكشاف) ================
function loadAllDreams() {
    const dreamsRef = database.ref('dreams')
        .orderByChild('isPublic')
        .equalTo(true);
    
    dreamsRef.once('value').then((snapshot) => {
        const dreams = snapshot.val();
        const grid = document.getElementById('dreamsGrid');
        
        if (!grid) return;
        
        if (dreams) {
            allDreams = Object.entries(dreams).map(([id, dream]) => ({
                id,
                ...dream
            })).reverse();
            
            filteredDreams = [...allDreams];
            displayDreams();
        } else {
            showNoDreams(grid);
        }
    }).catch(error => {
        console.error('خطأ في تحميل الأحلام:', error);
    });
}

// ================ 9. عرض الأحلام مع التقسيم ================
function displayDreams() {
    const grid = document.getElementById('dreamsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const start = (currentPage - 1) * dreamsPerPage;
    const end = start + dreamsPerPage;
    const dreamsToShow = filteredDreams.slice(start, end);
    
    if (dreamsToShow.length === 0) {
        if (currentPage === 1) {
            showNoDreams(grid);
        }
        return;
    }
    
    dreamsToShow.forEach(dream => {
        const card = createDreamCard(dream.id, dream);
        grid.appendChild(card);
    });
    
    // تحديث زر تحميل المزيد
    updateLoadMoreButton();
}

function createDreamCard(id, dream) {
    const card = document.createElement('div');
    card.className = 'dream-card';
    
    const shortText = dream.text.length > 150 
        ? dream.text.substring(0, 150) + '...' 
        : dream.text;
    
    const dreamDate = dream.date ? new Date(dream.date).toLocaleDateString('ar-EG') : 'تاريخ غير معروف';
    
    card.innerHTML = `
        <div class="dream-card-header">
            <div class="dream-user">
                <i class="fas fa-user-circle"></i>
                <span>${escapeHtml(dream.username) || 'مستخدم'}</span>
            </div>
            <div class="dream-date">${dreamDate}</div>
        </div>
        <div class="dream-content">
            "${escapeHtml(shortText)}"
        </div>
        <div class="dream-footer">
            <div class="dream-likes">
                <i class="fas fa-heart" onclick="likeDream('${id}', event)"></i>
                <span>${dream.likes || 0}</span>
            </div>
            <a href="/pages/dream.html?id=${id}" class="read-more">
                اقرأ المزيد <i class="fas fa-arrow-left"></i>
            </a>
        </div>
    `;
    
    return card;
}

function showNoDreams(grid) {
    grid.innerHTML = `
        <div class="no-data">
            <i class="fas fa-cloud-moon"></i>
            <p>لا توجد أحلام بعد</p>
            <a href="/pages/submit.html" class="btn btn-primary" style="margin-top: 1rem;">
                كن أول من يشارك حلماً
            </a>
        </div>
    `;
}

function updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (!loadMoreBtn) return;
    
    const totalLoaded = currentPage * dreamsPerPage;
    
    if (totalLoaded >= filteredDreams.length) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'inline-flex';
    }
}

// ================ 10. البحث والفلترة ================
function initSearchAndFilters() {
    const searchInput = document.getElementById('searchDreams');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterDreams(searchInput.value);
            }, 300);
        });
    }
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.getAttribute('data-filter');
            applyFilter(filter);
        });
    });
}

function filterDreams(searchTerm) {
    if (!searchTerm.trim()) {
        filteredDreams = [...allDreams];
    } else {
        const term = searchTerm.toLowerCase().trim();
        filteredDreams = allDreams.filter(dream => 
            dream.text.toLowerCase().includes(term) ||
            (dream.username && dream.username.toLowerCase().includes(term))
        );
    }
    
    currentPage = 1;
    displayDreams();
}

function applyFilter(filter) {
    switch(filter) {
        case 'popular':
            filteredDreams = [...allDreams].sort((a, b) => (b.likes || 0) - (a.likes || 0));
            break;
        case 'recent':
            filteredDreams = [...allDreams].sort((a, b) => {
                const dateA = a.timestamp || 0;
                const dateB = b.timestamp || 0;
                return dateB - dateA;
            });
            break;
        case 'trending':
            // الأحلام الأكثر تفاعلاً في آخر 24 ساعة
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
            filteredDreams = allDreams.filter(dream => 
                dream.timestamp > oneDayAgo && (dream.likes || 0) > 0
            ).sort((a, b) => (b.likes || 0) - (a.likes || 0));
            break;
        default:
            filteredDreams = [...allDreams];
    }
    
    currentPage = 1;
    displayDreams();
}

// ================ 11. تحميل المزيد ================
if (document.getElementById('loadMoreBtn')) {
    document.getElementById('loadMoreBtn').addEventListener('click', () => {
        currentPage++;
        displayDreams();
    });
}

// ================ 12. نظام الإعجابات ================
function likeDream(dreamId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const dreamRef = database.ref('dreams/' + dreamId);
    
    dreamRef.transaction((dream) => {
        if (dream) {
            dream.likes = (dream.likes || 0) + 1;
        }
        return dream;
    }).then(() => {
        // تحديث عداد الإعجاب في الواجهة
        if (event && event.target) {
            const likesSpan = event.target.closest('.dream-likes')?.querySelector('span');
            if (likesSpan) {
                likesSpan.textContent = parseInt(likesSpan.textContent) + 1;
            }
        }
        
        // تحديث إحصائيات الإعجابات
        database.ref('stats/likes').transaction(likes => (likes || 0) + 1);
        
        showNotification('تم تسجيل إعجابك', 'success');
    }).catch(error => {
        console.error('خطأ في تسجيل الإعجاب:', error);
        showNotification('حدث خطأ، حاول مرة أخرى', 'error');
    });
}

// ================ 13. تحميل حلم محدد ================
function loadDreamById() {
    const urlParams = new URLSearchParams(window.location.search);
    const dreamId = urlParams.get('id');
    
    if (!dreamId) {
        window.location.href = '/pages/explore.html';
        return;
    }
    
    const dreamRef = database.ref('dreams/' + dreamId);
    
    dreamRef.once('value').then((snapshot) => {
        const dream = snapshot.val();
        const container = document.getElementById('dreamDetails');
        
        if (!container) return;
        
        if (dream) {
            displayDreamDetails(container, dreamId, dream);
        } else {
            showDreamNotFound(container);
        }
    }).catch(error => {
        console.error('خطأ في تحميل الحلم:', error);
        showDreamError();
    });
}

function displayDreamDetails(container, dreamId, dream) {
    const dreamDate = dream.date ? new Date(dream.date).toLocaleString('ar-EG') : 'تاريخ غير معروف';
    
    container.innerHTML = `
        <div class="dream-detail-header">
            <div class="dream-detail-user">
                <i class="fas fa-user-circle"></i> ${escapeHtml(dream.username) || 'مستخدم'}
            </div>
            <div class="dream-detail-date">
                <i class="far fa-calendar-alt"></i> ${dreamDate}
            </div>
        </div>
        
        <div class="dream-detail-content">
            ${escapeHtml(dream.text)}
        </div>
        
        <div class="dream-detail-actions">
            <button onclick="likeDream('${dreamId}', event)" class="btn btn-secondary">
                <i class="fas fa-heart"></i> إعجاب (${dream.likes || 0})
            </button>
            <a href="/pages/explore.html" class="btn btn-primary">
                <i class="fas fa-arrow-right"></i> العودة إلى الاستكشاف
            </a>
        </div>
    `;
}

function showDreamNotFound(container) {
    container.innerHTML = `
        <div class="no-data">
            <i class="fas fa-exclamation-circle" style="color: var(--danger);"></i>
            <h2>الحلم غير موجود</h2>
            <p>عذراً، لم نتمكن من العثور على الحلم المطلوب</p>
            <a href="/pages/explore.html" class="btn btn-primary" style="margin-top: 1rem;">
                استكشف أحلام أخرى
            </a>
        </div>
    `;
}

function showDreamError() {
    const container = document.getElementById('dreamDetails');
    if (container) {
        container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-exclamation-triangle" style="color: var(--warning);"></i>
                <h2>حدث خطأ</h2>
                <p>عذراً، حدث خطأ أثناء تحميل الحلم</p>
                <a href="/pages/explore.html" class="btn btn-primary" style="margin-top: 1rem;">
                    العودة للاستكشاف
                </a>
            </div>
        `;
    }
}

// ================ 14. نظام النماذج ================
function initForms() {
    // نموذج تسجيل الدخول
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // نموذج التسجيل
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // نموذج إضافة حلم
    const dreamForm = document.getElementById('dreamForm');
    if (dreamForm) {
        dreamForm.addEventListener('submit', handleSubmitDream);
    }
}

// ================ 15. معالجة تسجيل الدخول ================
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const rememberMe = document.getElementById('rememberMe')?.checked || false;
    
    if (!username || !password) {
        showNotification('اسم المستخدم وكلمة السر مطلوبان', 'error');
        return;
    }
    
    const usersRef = database.ref('users');
    
    usersRef.orderByChild('username').equalTo(username).once('value', (snapshot) => {
        let found = false;
        
        snapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            if (user.password === password) {
                found = true;
                const userData = {
                    id: childSnapshot.key,
                    username: user.username,
                    email: user.email || '',
                    joinDate: user.joinDate
                };
                
                localStorage.setItem('dreamBankUser', JSON.stringify(userData));
                
                showNotification(`مرحباً ${username}!`, 'success');
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            }
        });
        
        if (!found) {
            showNotification('اسم المستخدم أو كلمة السر خطأ', 'error');
        }
    }).catch(error => {
        console.error('خطأ في تسجيل الدخول:', error);
        showNotification('حدث خطأ في الاتصال', 'error');
    });
}

// ================ 16. معالجة التسجيل الجديد ================
function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const agreeTerms = document.getElementById('agreeTerms')?.checked;
    
    // التحقق من المدخلات
    if (!username || !password) {
        showNotification('اسم المستخدم وكلمة السر مطلوبان', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('كلمة السر يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    if (confirmPassword && password !== confirmPassword) {
        showNotification('كلمة السر غير متطابقة', 'error');
        return;
    }
    
    if (!agreeTerms) {
        showNotification('يجب الموافقة على شروط الاستخدام', 'error');
        return;
    }
    
    const usersRef = database.ref('users');
    
    usersRef.orderByChild('username').equalTo(username).once('value', (snapshot) => {
        if (snapshot.exists()) {
            showNotification('اسم المستخدم موجود بالفعل', 'error');
        } else {
            const newUserRef = usersRef.push();
            const joinDate = new Date().toISOString().split('T')[0];
            
            const userData = {
                username: username,
                email: email || '',
                password: password,
                joinDate: joinDate,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            newUserRef.set(userData)
                .then(() => {
                    // تحديث إحصائيات المستخدمين
                    database.ref('stats/users').transaction(users => (users || 0) + 1);
                    
                    showNotification('تم التسجيل بنجاح!', 'success');
                    
                    setTimeout(() => {
                        window.location.href = '/pages/login.html';
                    }, 2000);
                })
                .catch(error => {
                    console.error('خطأ في التسجيل:', error);
                    showNotification('حدث خطأ، حاول مرة أخرى', 'error');
                });
        }
    });
}

// ================ 17. معالجة إضافة حلم جديد ================
function handleSubmitDream(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showNotification('يجب تسجيل الدخول أولاً', 'error');
        setTimeout(() => {
            window.location.href = '/pages/login.html';
        }, 2000);
        return;
    }
    
    const dreamText = document.getElementById('dreamText').value.trim();
    const dreamTitle = document.getElementById('dreamTitle')?.value.trim() || '';
    const dreamTags = document.getElementById('dreamTags')?.value.trim() || '';
    const isPublic = document.getElementById('isPublic')?.checked || false;
    const allowComments = document.getElementById('allowComments')?.checked || true;
    
    // جمع المشاعر المحددة
    const emotions = [];
    document.querySelectorAll('input[name="emotion"]:checked').forEach(cb => {
        emotions.push(cb.value);
    });
    
    if (!dreamText) {
        showNotification('يرجى كتابة الحلم', 'error');
        return;
    }
    
    if (dreamText.length < 10) {
        showNotification('الحلم يجب أن يكون 10 أحرف على الأقل', 'error');
        return;
    }
    
    const dreamsRef = database.ref('dreams');
    const newDreamRef = dreamsRef.push();
    
    const dreamData = {
        userId: currentUser.id,
        username: currentUser.username,
        title: dreamTitle || dreamText.substring(0, 50),
        text: dreamText,
        tags: dreamTags.split(',').map(tag => tag.trim()).filter(tag => tag),
        emotions: emotions,
        date: new Date().toLocaleString('ar-EG'),
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        isPublic: isPublic,
        allowComments: allowComments,
        likes: 0,
        comments: 0,
        views: 0
    };
    
    newDreamRef.set(dreamData)
        .then(() => {
            // تحديث الإحصائيات
            database.ref('stats/dreams').transaction(dreams => (dreams || 0) + 1);
            database.ref('stats/today').transaction(count => (count || 0) + 1);
            
            showNotification('تم تسجيل الحلم بنجاح!', 'success');
            
            setTimeout(() => {
                window.location.href = '/pages/explore.html';
            }, 2000);
        })
        .catch(error => {
            console.error('خطأ في حفظ الحلم:', error);
            showNotification('حدث خطأ، حاول مرة أخرى', 'error');
        });
}

// ================ 18. نظام الإشعارات ================
function showNotification(message, type = 'success') {
    // إزالة أي إشعارات سابقة
    const existingNotifications = document.querySelector('.notifications-container');
    if (existingNotifications) {
        existingNotifications.remove();
    }
    
    // إنشاء حاوية الإشعارات
    const container = document.createElement('div');
    container.className = 'notifications-container';
    container.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        z-index: 9999;
    `;
    document.body.appendChild(container);
    
    // إنشاء الإشعار
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
        color: white;
        padding: 1rem 2rem;
        border-radius: var(--border-radius-lg);
        box-shadow: var(--shadow-lg);
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 0.5rem;
        animation: slideIn 0.3s ease;
        direction: rtl;
    `;
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(notification);
    
    // إزالة الإشعار بعد 3 ثواني
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, 3000);
}

// ================ 19. تسجيل الدخول السريع (للتجربة) ================
function quickLogin(type) {
    if (type === 'guest') {
        const guestData = {
            id: 'guest_' + Date.now(),
            username: 'ضيف',
            email: '',
            joinDate: new Date().toISOString().split('T')[0]
        };
        
        localStorage.setItem('dreamBankUser', JSON.stringify(guestData));
        showNotification('تم الدخول كضيف', 'success');
        
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
    } else if (type === 'demo') {
        // بيانات تجريبية
        const demoData = {
            id: 'demo_' + Date.now(),
            username: 'مستخدم تجريبي',
            email: 'demo@example.com',
            joinDate: new Date().toISOString().split('T')[0]
        };
        
        localStorage.setItem('dreamBankUser', JSON.stringify(demoData));
        showNotification('تم الدخول في الوضع التجريبي', 'success');
        
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
    }
}

// ================ 20. تسجيل زيارات الصفحات (تحليلات) ================
function logPageView() {
    if (typeof gtag !== 'undefined') {
        gtag('config', 'G-3JGCVJKM2J', {
            'page_title': document.title,
            'page_path': window.location.pathname
        });
    }
    
    // تسجيل في console للتصحيح
    console.log(`📊 زيارة: ${document.title} - ${window.location.pathname}`);
}

// ================ 21. دوال مساعدة عامة ================
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

function shareDream(dreamId) {
    const url = `${window.location.origin}/pages/dream.html?id=${dreamId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'حلم من بنك الأحلام',
            text: 'شاهد هذا الحلم على بنك الأحلام',
            url: url
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(url).then(() => {
            showNotification('تم نسخ الرابط', 'success');
        });
    }
}

// ================ 22. تهيئة أنماط CSS للإشعارات ================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ================ 23. معالجة الأخطاء العامة ================
window.addEventListener('error', (event) => {
    console.error('خطأ عام:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('وعد غير معالج:', event.reason);
});

// ================ 24. حفظ حالة المستخدم عند إغلاق الصفحة ================
window.addEventListener('beforeunload', () => {
    // يمكن إضافة أي منطق للحفظ هنا
});

// ================ 25. جاهزية الموقع ================
console.log('🚀 بنك الأحلام - جاهز ومتصل بقاعدة البيانات');