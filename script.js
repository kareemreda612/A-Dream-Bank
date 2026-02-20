// ================ إعدادات Firebase ================
// استبدل هذا بالمعلومات الخاصة بك من Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDbUUnQUX5WuiVDqgDeL5iqDKmdpQd9U14",
  authDomain: "dream-bank-88691.firebaseapp.com",
  databaseURL: "https://dream-bank-88691-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "dream-bank-88691",
  storageBucket: "dream-bank-88691.firebasestorage.app",
  messagingSenderId: "378619838754",
  appId: "1:378619838754:web:2f3646bff096bbf05f657b"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ================ متغيرات عامة ================
let currentUser = null;

// ================ التحقق من تسجيل الدخول ================
function checkAuth() {
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    
    if (userId && username) {
        currentUser = { id: userId, username: username };
        updateUIForLoggedInUser();
    }
}

// ================ تحديث واجهة المستخدم بعد تسجيل الدخول ================
function updateUIForLoggedInUser() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu && currentUser) {
        userMenu.innerHTML = `
            <span class="username"><i class="fas fa-user"></i> ${currentUser.username}</span>
            <a href="#" onclick="logout()">خروج</a>
        `;
    }
}

// ================ تسجيل الخروج ================
function logout() {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    currentUser = null;
    window.location.href = 'index.html';
}

// ================ تحميل الإحصائيات ================
function loadStats() {
    const statsRef = database.ref('stats');
    
    statsRef.once('value').then((snapshot) => {
        const stats = snapshot.val() || { dreams: 0, users: 0, today: 0, likes: 0 };
        
        document.getElementById('totalDreams').textContent = stats.dreams;
        document.getElementById('totalUsers').textContent = stats.users;
        document.getElementById('todayDreams').textContent = stats.today;
        document.getElementById('totalLikes').textContent = stats.likes;
    });
}

// ================ تحميل الأحلام العامة ================
function loadPublicDreams() {
    const dreamsRef = database.ref('dreams').orderByChild('isPublic').equalTo(true);
    
    dreamsRef.on('value', (snapshot) => {
        const dreams = snapshot.val();
        const grid = document.getElementById('dreamsGrid');
        
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (dreams) {
            const dreamsArray = Object.entries(dreams).reverse();
            
            dreamsArray.forEach(([id, dream]) => {
                const card = document.createElement('div');
                card.className = 'dream-card';
                card.innerHTML = `
                    <div class="dream-card-header">
                        <div><i class="fas fa-user-circle"></i> ${dream.username || 'زائر'}</div>
                        <div>${dream.date || ''}</div>
                    </div>
                    <div class="dream-content">
                        "${dream.text.substring(0, 150)}${dream.text.length > 150 ? '...' : ''}"
                    </div>
                    <div class="dream-footer">
                        <div>❤️ ${dream.likes || 0}</div>
                        <a href="dream.html?id=${id}" style="color: var(--primary);">اقرأ المزيد ←</a>
                    </div>
                `;
                grid.appendChild(card);
            });
        } else {
            grid.innerHTML = '<p style="text-align: center;">لا توجد أحلام بعد</p>';
        }
    });
}

// ================ تحميل حلم محدد ================
function loadDreamById() {
    const urlParams = new URLSearchParams(window.location.search);
    const dreamId = urlParams.get('id');
    
    if (!dreamId) return;
    
    const dreamRef = database.ref('dreams/' + dreamId);
    
    dreamRef.once('value').then((snapshot) => {
        const dream = snapshot.val();
        const container = document.getElementById('dreamDetails');
        
        if (dream) {
            container.innerHTML = `
                <div style="margin-bottom: 30px; display: flex; justify-content: space-between;">
                    <div><i class="fas fa-user-circle"></i> ${dream.username || 'زائر'}</div>
                    <div>📅 ${dream.date || ''}</div>
                </div>
                <div style="font-size: 20px; line-height: 1.8; margin-bottom: 30px; padding: 20px; background: #f7fafc; border-radius: 15px;">
                    ${dream.text}
                </div>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button onclick="likeDream('${dreamId}')" class="btn btn-secondary">❤️ إعجاب (${dream.likes || 0})</button>
                    <a href="explore.html" class="btn btn-primary">← العودة</a>
                </div>
            `;
        }
    });
}

// ================ إعجاب بحلم ================
function likeDream(dreamId) {
    const dreamRef = database.ref('dreams/' + dreamId);
    
    dreamRef.transaction((dream) => {
        if (dream) {
            dream.likes = (dream.likes || 0) + 1;
        }
        return dream;
    });
    
    // تحديث الإحصائيات
    database.ref('stats/likes').transaction((likes) => (likes || 0) + 1);
}

// ================ تسجيل مستخدم جديد ================
function registerUser(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('اسم المستخدم وكلمة السر مطلوبان');
        return;
    }
    
    const usersRef = database.ref('users');
    
    usersRef.orderByChild('username').equalTo(username).once('value', (snapshot) => {
        if (snapshot.exists()) {
            alert('اسم المستخدم موجود بالفعل');
        } else {
            const newUserRef = usersRef.push();
            const userData = {
                username: username,
                email: email,
                password: password, // ملاحظة: في موقع حقيقي، يجب تشفير كلمة السر
                joinDate: new Date().toISOString().split('T')[0]
            };
            
            newUserRef.set(userData);
            
            // تحديث إحصائيات المستخدمين
            database.ref('stats/users').transaction((users) => (users || 0) + 1);
            
            alert('تم التسجيل بنجاح');
            window.location.href = 'login.html';
        }
    });
}

// ================ تسجيل الدخول ================
function loginUser(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const usersRef = database.ref('users');
    
    usersRef.orderByChild('username').equalTo(username).once('value', (snapshot) => {
        let found = false;
        
        snapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            if (user.password === password) {
                found = true;
                localStorage.setItem('userId', childSnapshot.key);
                localStorage.setItem('username', user.username);
                window.location.href = 'index.html';
            }
        });
        
        if (!found) {
            alert('اسم المستخدم أو كلمة السر خطأ');
        }
    });
}

// ================ تسجيل حلم جديد ================
function submitDream(event) {
    event.preventDefault();
    
    if (!currentUser) {
        alert('يجب تسجيل الدخول أولاً');
        window.location.href = 'login.html';
        return;
    }
    
    const dreamText = document.getElementById('dreamText').value;
    const isPublic = document.getElementById('isPublic').checked;
    
    if (!dreamText) {
        alert('يرجى كتابة الحلم');
        return;
    }
    
    const dreamsRef = database.ref('dreams');
    const newDreamRef = dreamsRef.push();
    
    const dreamData = {
        userId: currentUser.id,
        username: currentUser.username,
        text: dreamText,
        date: new Date().toLocaleString('ar-EG'),
        isPublic: isPublic,
        likes: 0
    };
    
    newDreamRef.set(dreamData);
    
    // تحديث الإحصائيات
    database.ref('stats/dreams').transaction((dreams) => (dreams || 0) + 1);
    
    const today = new Date().toISOString().split('T')[0];
    database.ref('stats/today').transaction((count) => {
        // في تطبيق حقيقي، نحتاج منطق أكثر تعقيداً للإحصائيات اليومية
        return (count || 0) + 1;
    });
    
    alert('تم تسجيل الحلم بنجاح');
    window.location.href = 'index.html';
}

// ================ ربط الأحداث ================
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من تسجيل الدخول
    checkAuth();
    
    // تحميل الإحصائيات في الصفحة الرئيسية
    if (document.getElementById('totalDreams')) {
        loadStats();
    }
    
    // تحميل الأحلام في صفحة الاستكشاف
    if (document.getElementById('dreamsGrid')) {
        loadPublicDreams();
    }
    
    // تحميل حلم محدد
    if (document.getElementById('dreamDetails')) {
        loadDreamById();
    }
    
    // ربط نموذج التسجيل
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', registerUser);
    }
    
    // ربط نموذج تسجيل الدخول
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', loginUser);
    }
    
    // ربط نموذج تسجيل الحلم
    const dreamForm = document.getElementById('dreamForm');
    if (dreamForm) {
        dreamForm.addEventListener('submit', submitDream);
    }
});
