// ================ NEURAL DREAMSCAPE CORE ================

class NeuralDreamscape {
    constructor() {
        this.timeHue = this.calculateTimeHue();
        this.init();
    }
    
    // حساب لون الوقت - ميزة فريدة
    calculateTimeHue() {
        const hours = new Date().getHours();
        const minutes = new Date().getMinutes();
        // لون يتغير مع الوقت من اليوم
        return (hours * 15 + minutes * 0.25) % 360;
    }
    
    // تحديث المتغيرات حسب الوقت
    updateTimeBasedVariables() {
        document.documentElement.style.setProperty(
            '--time-hue', 
            `${this.calculateTimeHue()}deg`
        );
    }
    
    // الهيدر الذكي مع تأخير عصبي
    initSmartHeader() {
        const header = document.querySelector('.neural-header');
        let lastScroll = 0;
        let scrollTimeout;
        
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            // تأخير عصبي - يحاكي التفكير
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                if (currentScroll > lastScroll && currentScroll > 100) {
                    header.style.transform = 'translateY(-100%)';
                } else {
                    header.style.transform = 'translateY(0)';
                }
                lastScroll = currentScroll;
            }, 50); // تأخير 50ms يحاكي زمن انتقال العصب
        });
    }
    
    // عدادات متحركة مع تأثير الكشف التدريجي
    animateNumbers() {
        const stats = document.querySelectorAll('.stat-neural-number');
        stats.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target') || '0');
            let current = 0;
            const increment = target / 100;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    stat.textContent = target;
                    clearInterval(timer);
                } else {
                    stat.textContent = Math.floor(current);
                }
            }, 20);
        });
    }
    
    // تأثيرات التمرير العصبية
    initNeuralScroll() {
        const progress = document.createElement('div');
        progress.className = 'dream-progress';
        document.body.appendChild(progress);
        
        window.addEventListener('scroll', () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            progress.style.width = scrolled + '%';
        });
    }
    
    // إنشاء عناصر زخرفية عشوائية
    createRandomGlows() {
        for (let i = 0; i < 5; i++) {
            const glow = document.createElement('div');
            glow.className = 'neural-glow';
            glow.style.top = Math.random() * 100 + '%';
            glow.style.left = Math.random() * 100 + '%';
            glow.style.animationDelay = Math.random() * 5 + 's';
            document.body.appendChild(glow);
        }
    }
    
    // تحديث دوري للون حسب الوقت
    startTimeLoop() {
        setInterval(() => {
            this.updateTimeBasedVariables();
        }, 60000); // يتغير كل دقيقة
    }
    
    // تهيئة كل شيء
    init() {
        this.updateTimeBasedVariables();
        this.initSmartHeader();
        this.initNeuralScroll();
        this.createRandomGlows();
        this.startTimeLoop();
        
        // مراقبة ظهور العناصر
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('distorted');
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.dream-neural-card, .stat-neural-item').forEach(el => {
            observer.observe(el);
        });
    }
}

// بدء الحلم
const dreamscape = new NeuralDreamscape();

// ================ Firebase Integration ================
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

// ================ بيانات الموقع ================
function loadStats() {
    database.ref('stats').once('value').then((snapshot) => {
        const stats = snapshot.val() || { dreams: 0, users: 0, today: 0, likes: 0 };
        
        document.querySelectorAll('[data-stat]').forEach(el => {
            const stat = el.getAttribute('data-stat');
            if (stats[stat] !== undefined) {
                el.setAttribute('data-target', stats[stat]);
                el.textContent = '0';
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
});
