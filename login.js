// --- ระบบจัดการสมาชิก (เชื่อมต่อกับ Database จริง) ---

// ✅ แก้เป็นแบบนี้ (สั้นๆ ง่ายๆ ไม่ต้องแก้ IP อีกตลอดชาติ)
const API_URL = '/api';
// ฟังก์ชันสลับหน้า Login / Register
function toggleForms() {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    
    if (loginForm.classList.contains('hidden')) {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
    }
}

// 1. ฟังก์ชันสมัครสมาชิก (Register) -> ส่งข้อมูลไปเก็บใน SQL Server
async function handleRegister(e) {
    e.preventDefault();

    const fullname = document.getElementById('reg-fullname').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPass = document.getElementById('reg-confirm-password').value;

    if (password !== confirmPass) {
        alert("รหัสผ่านไม่ตรงกัน");
        return;
    }

    try {
        // ยิงข้อมูลไปหา Node.js
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, fullname })
        });

        const data = await response.json();

        if (data.success) {
            alert("✅ สมัครสมาชิกสำเร็จ! ข้อมูลถูกบันทึกลง Database แล้ว");
            toggleForms(); // กลับไปหน้า Login
        } else {
            alert("❌ " + data.message); // เช่น ชื่อผู้ใช้ซ้ำ
        }
    } catch (error) {
        console.error('Error:', error);
        alert("ติดต่อ Server ไม่ได้ (ตรวจสอบว่าเปิด node server.js หรือยัง?)");
    }
}

// 2. ฟังก์ชันเข้าสู่ระบบ (Login) -> ตรวจสอบกับ SQL Server
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        // ส่ง User/Pass ไปเช็คที่ Node.js
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            // ล็อกอินผ่าน! จำข้อมูลผู้ใช้ไว้ในเว็บ
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            
            alert(`ยินดีต้อนรับ, ${data.user.FULLNAME}`);
            window.location.href = 'index.html'; // ไปหน้าหลัก
        } else {
            alert("❌ " + data.message); // ชื่อหรือรหัสผิด
        }
    } catch (error) {
        console.error('Error:', error);
        alert("ติดต่อ Server ไม่ได้");
    }
}