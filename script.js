// ==========================================
// 1. ส่วนตัวแปร Global & ตรวจสอบสิทธิ์ (Auth Guard)
// ==========================================

// --- 🔒 ตรวจสอบการล็อกอิน ---
const currentUserData = JSON.parse(sessionStorage.getItem('currentUser'));

if (!currentUserData) {
    window.location.href = 'login.html';
    throw new Error("Redirecting to login...");
}

// ✅ ดึงชื่อผู้ใช้มาเพื่อใช้เป็น Key ใน Firebase
const currentUsername = currentUserData.username;

let currentSelectedCell = null;
let currentKey = null;
let currentDate = new Date();

// ตัวแปรเก็บข้อมูล (จะถูกอัปเดตจาก Firebase อัตโนมัติ)
let userTemplates = []; 
let scheduleData = {}; 

// ==========================================
// 🏆 1.1 ตารางมาตรฐาน (Presets)
// ==========================================
const presetTemplates = [
    { id: 'preset_chest', name: 'วันเล่นอก (พื้นฐาน)', exercises: [{ name: 'Bench Press', details: '12reps 4sets', completed: false }, { name: 'Dumbbell Press', details: '12reps 3sets', completed: false }, { name: 'Chest Fly', details: '15reps 3sets', completed: false }] },
    { id: 'preset_leg', name: 'วันเล่นขา (พื้นฐาน)', exercises: [{ name: 'Squat', details: '10reps 4sets', completed: false }, { name: 'Leg Press', details: '12reps 3sets', completed: false }, { name: 'Calf Raise', details: '15reps 3sets', completed: false }] },
    { id: 'preset_shoulder', name: 'วันเล่นไหล่ (พื้นฐาน)', exercises: [{ name: 'Overhead Press', details: '10reps 4sets', completed: false }, { name: 'Lateral Raise', details: '15reps 3sets', completed: false }] },
    { id: 'preset_back', name: 'วันเล่นหลัง (พื้นฐาน)', exercises: [{ name: 'Lat Pulldown', details: '12reps 3sets', completed: false }, { name: 'Seated Row', details: '12reps 3sets', completed: false }] },
    { id: 'preset_cardio', name: 'วันคาร์ดิโอ (พื้นฐาน)', exercises: [{ name: 'Treadmill', details: '45 นาที', completed: false }, { name: 'Cycling', details: '30 นาที', completed: false }] }
];

let tempExercises = [];
let editingTemplateId = null;
const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

const allExercisesDB = [
    "Bench Press", "Incline Bench Press", "Decline Bench Press", "Dumbbell Press", 
    "Incline Dumbbell Press", "Chest Fly", "Cable Fly", "Push Up", "Dips", "Machine Chest Press",
    "Deadlift", "Pull Up", "Lat Pulldown", "Seated Row", "Bent Over Row", 
    "One Arm Dumbbell Row", "T-Bar Row", "Face Pull", "Back Extension", "Hyperextension",
    "Squat", "Front Squat", "Goblet Squat", "Leg Press", "Lunge", 
    "Walking Lunge", "Bulgarian Split Squat", "Leg Extension", "Leg Curl", 
    "Romanian Deadlift (RDL)", "Hip Thrust", "Glute Bridge", "Calf Raise", "Seated Calf Raise",
    "Hip Abduction", "Hip Adduction", "Inner Thigh Adductor",
    "Overhead Press", "Military Press", "Dumbbell Shoulder Press", "Arnold Press", 
    "Lateral Raise", "Front Raise", "Rear Delt Fly", "Upright Row", "Shrugs",
    "Bicep Curl", "Hammer Curl", "Preacher Curl", "Concentration Curl", "Cable Curl",
    "Tricep Extension", "Skull Crusher", "Tricep Pushdown", "Overhead Tricep Extension", "Close Grip Bench Press",
    "Plank", "Crunch", "Sit Up", "Leg Raise", "Hanging Leg Raise", 
    "Russian Twist", "Mountain Climber", "Bicycle Crunch", "Ab Wheel Rollout", "Side abdominal",
    "Treadmill (Running)", "Treadmill (Walking)", "Cycling", "Elliptical", 
    "Stair Master", "Rowing Machine", "Jump Rope", "Burpees", "Jumping Jacks", "Seated Cycling"
];

// ==========================================
// 2. เริ่มทำงานเมื่อโหลดเว็บ & 🔥 เชื่อมต่อ Firebase Realtime 🔥
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    renderCalendar(); // วาดปฏิทินเปล่ารอไว้ก่อน
    renderTemplateList(); 
    setupExerciseSearch(); 
    createFloatingResetButton();
    setupDateConstraints();

    // --- 🔥 เริ่มฟังข้อมูลจาก Firebase (Real-time Sync) ---
    
    // 1. ดึงข้อมูล Schedule (ปฏิทิน)
    db.ref('users/' + currentUsername + '/schedule').on('value', (snapshot) => {
        scheduleData = snapshot.val() || {}; // ถ้าไม่มีข้อมูลให้เป็น Object ว่าง
        renderCalendar(); // วาดปฏิทินใหม่ทันทีเมื่อข้อมูลเปลี่ยน
        
        // ✅ คำนวณดาวทันทีเมื่อข้อมูลมาถึง
        calculateAchievements();

        // ถ้าเปิด Modal ค้างอยู่ ให้อัปเดตข้อมูล Realtime ด้วย
        if(currentKey && scheduleData[currentKey] && document.getElementById('exercise-modal').style.display === 'flex') {
            renderModalList();
        }
    });

    // 2. ดึงข้อมูล User Templates (ตารางที่สร้างเอง)
    db.ref('users/' + currentUsername + '/templates').on('value', (snapshot) => {
        userTemplates = snapshot.val() || [];
        renderTemplateList(); // วาดหน้ารายการใหม่
    });

    // Mobile Menu
    const mobileBtn = document.querySelector('.mobile-toggle');
    const mobileNav = document.querySelector('.header-nav');
    if (mobileBtn && mobileNav) {
        mobileBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('active');
        });
    }
});

// --- 🔥 ฟังก์ชันช่วยบันทึกลง Firebase (แทน localStorage) ---
function saveDataToFirebase() {
    db.ref('users/' + currentUsername + '/schedule').set(scheduleData);
}

function saveTemplatesToFirebase() {
    db.ref('users/' + currentUsername + '/templates').set(userTemplates);
}

// ... (ฟังก์ชัน UI เดิม) ...
function setupDateConstraints() {
    const startInput = document.getElementById('start-date-input');
    const endInput = document.getElementById('end-date-input');
    if (!startInput || !endInput) return;
    const tzOffset = new Date().getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
    startInput.setAttribute('min', localISOTime);
    endInput.setAttribute('min', localISOTime);
    startInput.addEventListener('change', function() {
        const startDateVal = this.value;
        endInput.setAttribute('min', startDateVal);
        if (endInput.value && endInput.value < startDateVal) { endInput.value = ""; }
    });
}

function setupExerciseSearch() {
    const datalist = document.getElementById('exercise-list');
    if (!datalist) return;
    allExercisesDB.sort();
    let optionsHtml = '';
    allExercisesDB.forEach(ex => { optionsHtml += `<option value="${ex}">`; });
    datalist.innerHTML = optionsHtml;
}

function createFloatingResetButton() {
    // ยกเลิกปุ่ม Reset เดิม เพราะใช้ Cloud แล้ว
}

function checkLoginStatus() {
    const authBtn = document.getElementById('nav-auth-btn');
    if(!authBtn) return;
    if (currentUserData) {
        authBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i> ออกจากระบบ (${currentUserData.fullname || currentUsername})`;
        authBtn.href = "#";
        authBtn.classList.add('logged-in');
        authBtn.onclick = (e) => {
            e.preventDefault();
            if(confirm("ต้องการออกจากระบบใช่หรือไม่?")) {
                sessionStorage.removeItem('currentUser'); // ลบ Session
                window.location.href = 'login.html';
            }
        };
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.content-view').forEach(v => v.classList.remove('active')); 
    if(tabName === 'calendar') {
        document.querySelectorAll('.tab-item')[0].classList.add('active');
        document.getElementById('calendar-view').classList.add('active');
        renderCalendar(); 
    } else {
        document.querySelectorAll('.tab-item')[1].classList.add('active');
        document.getElementById('list-view').classList.add('active');
        renderTemplateList();
    }
}

// ==========================================
// 3. ระบบปฏิทิน
// ==========================================
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const realToday = new Date();
    document.getElementById('current-month-year').innerText = `${monthNames[month]} ${year + 543}`;
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const calendarBody = document.getElementById('calendar-body');
    calendarBody.innerHTML = "";
    for(let i = 0; i < firstDayIndex; i++) {
        calendarBody.innerHTML += `<div class="day-box empty" style="border:none; cursor:default;"></div>`;
    }
    for(let i = 1; i <= lastDay; i++) {
        const dateKey = `${year}-${String(month+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const hasSchedule = scheduleData[dateKey];
        const isToday = (i === realToday.getDate() && month === realToday.getMonth() && year === realToday.getFullYear());
        const todayClass = isToday ? 'today' : '';
        let innerContent = ''; 
        if(hasSchedule) {
            const totalEx = hasSchedule.exercises.length;
            const doneEx = hasSchedule.exercises.filter(e => e.completed).length;
            let percent = 0;
            if(totalEx > 0) percent = Math.round((doneEx / totalEx) * 100);
            const badgeClass = (percent === 100) ? 'percent-badge full' : 'percent-badge';
            innerContent += `<div class="${badgeClass}">${percent}%</div>`;
            innerContent += `<div class="schedule-label">${hasSchedule.name}</div>`;
            if (hasSchedule.isFinished === true) {
                innerContent += `<i class="fas fa-check-circle status-mark completed"></i>`;
            } else {
                innerContent += `<i class="fas fa-pencil-alt status-mark pending"></i>`;
            }
        }
        calendarBody.innerHTML += `
            <div class="day-box ${todayClass}" onclick="openDate(this, '${dateKey}', ${i})">
                <span>${i}</span>
                ${innerContent}
            </div>
        `;
    }
}

function changeMonth(step) {
    currentDate.setMonth(currentDate.getMonth() + step);
    renderCalendar();
}

// ==========================================
// 4. ระบบจัดการ Modal
// ==========================================
function openDate(el, dateKey, day) {
    currentSelectedCell = el; 
    currentKey = dateKey;     
    const yearBE = currentDate.getFullYear() + 543;
    const monthName = monthNames[currentDate.getMonth()];
    document.getElementById('modal-date-title').innerText = `วันที่ ${day} ${monthName} ${yearBE}`;
    document.getElementById('exercise-modal').style.display = 'flex';
    
    if (scheduleData[dateKey]) { 
        showWorkoutView(); 
    } else { 
        showSelectionView(); 
    }
}

function showSelectionView() {
    document.getElementById('modal-select-view').style.display = 'block';
    document.getElementById('modal-workout-view').style.display = 'none';
    document.querySelector('.modal-footer').style.display = 'none';
    const container = document.getElementById('select-list-container');
    container.innerHTML = '';

    if(presetTemplates.length > 0) {
        container.innerHTML += `<div style="grid-column:1/-1; color:#ffb900; font-weight:bold; margin-top:5px; border-bottom:1px solid #eee;">แบบมาตรฐาน (เลือกได้เลย)</div>`;
        presetTemplates.forEach(temp => {
            container.innerHTML += `<div class="btn-select-template" onclick="chooseTemplate('${temp.id}')"><i class="fas fa-dumbbell"></i><span>${temp.name}</span></div>`;
        });
    }

    if(userTemplates.length > 0) {
        container.innerHTML += `<div style="grid-column:1/-1; color:#333; font-weight:bold; margin-top:15px; border-bottom:1px solid #eee;">แบบของคุณ (Saved)</div>`;
        userTemplates.forEach(temp => {
            container.innerHTML += `<div class="btn-select-template" onclick="chooseTemplate('${temp.id}')"><i class="fas fa-user-edit"></i><span>${temp.name}</span></div>`;
        });
    } else {
        container.innerHTML += `<div style="grid-column:1/-1; text-align:center; color:#999; margin-top:10px; font-size:0.9rem;">(ยังไม่มีตารางของคุณเอง ไปสร้างที่หน้า "จัดตาราง" ได้เลย)</div>`;
    }
}

function chooseTemplate(tempId) {
    let template = userTemplates.find(t => t.id === tempId);
    let isPreset = false;

    if (!template) {
        template = presetTemplates.find(t => t.id === tempId);
        isPreset = true;
    }

    if(template) {
        scheduleData[currentKey] = JSON.parse(JSON.stringify(template));
        scheduleData[currentKey].isFinished = false; 
        
        // 🔥 บันทึกลง Firebase
        saveDataToFirebase();

        if (isPreset) {
            const alreadyExists = userTemplates.some(t => t.name === template.name);
            if (!alreadyExists) {
                const newCustom = JSON.parse(JSON.stringify(template));
                newCustom.id = 'custom_' + new Date().getTime();
                userTemplates.push(newCustom);
                
                // 🔥 บันทึก Template ลง Firebase
                saveTemplatesToFirebase();
            }
        }

        renderCalendar(); 
        showWorkoutView();
    }
}

function showWorkoutView() {
    document.getElementById('modal-select-view').style.display = 'none';
    document.getElementById('modal-workout-view').style.display = 'block';
    document.querySelector('.modal-footer').style.display = 'block';
    renderModalList();
}

function renderModalList() {
    const data = scheduleData[currentKey];
    if(!data) return; 
    document.getElementById('modal-workout-name').innerText = data.name;
    const list = document.getElementById('modal-exercise-list');
    list.innerHTML = '';
    
    data.exercises.forEach((ex, idx) => {
        list.innerHTML += `
        <div class="ex-row" style="align-items:center; border-bottom:1px solid #eee; padding:5px 0;">
            <div>
                <div>${ex.name} 
                    <a href="https://www.youtube.com/results?search_query=วิธีเล่น+${ex.name}" target="_blank" style="color:red; margin-left:5px; text-decoration:none;"><i class="fab fa-youtube"></i></a>
                </div>
                <small style="color:#888;">${ex.details}</small>
            </div>
            
            <div style="display:flex; align-items:center; gap:15px;">
                <div onclick="startRestTimer(60)" style="cursor:pointer; color:#ffb900; font-size:1.2rem;" title="กดเพื่อจับเวลาพัก">
                    <i class="fas fa-stopwatch"></i>
                </div>
                <div class="check-circle ${ex.completed ? 'checked' : ''}" onclick="toggleCheck(${idx})">
                    ${ex.completed ? '<i class="fas fa-check"></i>' : ''}
                </div>
            </div>
        </div>`;
    });
}

function toggleCheck(idx) {
    if(scheduleData[currentKey] && scheduleData[currentKey].exercises[idx]) {
        scheduleData[currentKey].exercises[idx].completed = !scheduleData[currentKey].exercises[idx].completed;
        
        // 🔥 บันทึกลง Firebase (Realtime)
        saveDataToFirebase();
        renderModalList();
    }
}

function saveProgress(isFinished) {
    if (scheduleData[currentKey]) {
        scheduleData[currentKey].isFinished = isFinished;
        
        // 🔥 บันทึกลง Firebase
        saveDataToFirebase();

        const doneCount = scheduleData[currentKey].exercises.filter(e => e.completed).length;
        if(isFinished) alert(`เก่งมาก! คุณออกกำลังกายเสร็จสิ้นแล้ว (${doneCount} รายการ)`);
        else alert(`บันทึกความคืบหน้าเรียบร้อยแล้ว (${doneCount} รายการ)`);
        renderCalendar(); closeModal('exercise-modal');
    }
}

function deleteSchedule() {
    if (confirm("คุณแน่ใจไหมว่าจะลบตารางฝึกของวันนี้?")) {
        if (currentKey && scheduleData[currentKey]) {
            delete scheduleData[currentKey];
            
            // 🔥 ลบใน Firebase
            saveDataToFirebase();
        }
        renderCalendar(); alert("ลบตารางเรียบร้อย!"); closeModal('exercise-modal');
    }
}

// ==========================================
// 5. ระบบจัดการหน้ารายการ (List View)
// ==========================================
function renderTemplateList() {
    const container = document.getElementById('template-list');
    if(!container) return;
    container.innerHTML = '';

    if (userTemplates.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #aaa;">
                <i class="fas fa-clipboard-list" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                <p style="font-size: 1.1rem; margin: 0;">ยังไม่มีตารางที่คุณสร้างเอง</p>
                <p style="font-size: 0.9rem; margin-top: 5px;">กดปุ่ม <span style="background:#ffb900; color:white; width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; font-size:0.8rem;"><i class="fas fa-plus"></i></span> ด้านบนเพื่อเริ่มสร้างได้เลยครับ</p>
            </div>
        `;
        return;
    }

    userTemplates.forEach(temp => {
        let exerciseRows = temp.exercises.map(ex => `
            <div class="ex-row">
                <span><i class="fas fa-circle" style="font-size:6px; color:#ffb900; margin-right:5px; vertical-align:middle;"></i> ${ex.name}</span>
                <span>${ex.details}</span>
            </div>
        `).join('');

        container.innerHTML += `
            <div class="workout-card">
                <div class="card-actions">
                    <button class="action-btn btn-edit" onclick="editTemplate('${temp.id}')"><i class="fas fa-edit"></i> แก้ไข</button>
                    <button class="action-btn btn-del" onclick="deleteTemplate('${temp.id}')"><i class="fas fa-trash"></i> ลบ</button>
                </div>
                <div class="card-title"><i class="far fa-calendar-check"></i> ${temp.name}</div>
                <div>${exerciseRows}</div>
            </div>
        `;
    });
}

function deleteTemplate(id) {
    if(confirm("ยืนยันการลบตารางนี้ออกจากระบบ?")) {
        userTemplates = userTemplates.filter(t => t.id !== id);
        
        // 🔥 บันทึก Template ลง Firebase
        saveTemplatesToFirebase();
        renderTemplateList();
    }
}

// ==========================================
// 6. ระบบสร้าง/แก้ไข และบันทึก
// ==========================================
function addNewTemplate() {
    editingTemplateId = null;
    tempExercises = [];
    document.getElementById('schedule-name').value = "";
    document.querySelector('.sub-header-text').innerText = "เพิ่มตารางออกกำลังกาย";
    document.querySelector('.btn-save-schedule').innerText = "บันทึกตาราง";
    showCreateView();
    renderTempTable();
}

function editTemplate(id) {
    const template = userTemplates.find(t => t.id === id); 
    if (!template) return;
    editingTemplateId = id;
    document.getElementById('schedule-name').value = template.name;
    
    tempExercises = [];
    template.exercises.forEach(ex => {
        if (ex.details.includes('นาที')) {
            const timeMatch = ex.details.match(/(\d+) นาที/);
            const time = timeMatch ? parseInt(timeMatch[1]) : 30;
            tempExercises.push({ name: ex.name, type: 'cardio', time: time });
        } else {
            let rep=0, set=0, kg=0;
            const repMatch = ex.details.match(/(\d+)reps/);
            const setMatch = ex.details.match(/(\d+)sets/);
            const kgMatch = ex.details.match(/(\d+)kg/);
            if(repMatch) rep = parseInt(repMatch[1]);
            if(setMatch) set = parseInt(setMatch[1]);
            if(kgMatch) kg = parseInt(kgMatch[1]);
            tempExercises.push({ name: ex.name, type: 'weight', set: set, rep: rep, kg: kg });
        }
    });

    document.querySelector('.sub-header-text').innerText = "แก้ไขตารางออกกำลังกาย";
    document.querySelector('.btn-save-schedule').innerText = "บันทึกการแก้ไข";
    showCreateView();
    renderTempTable();
}

function showCreateView() {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    document.getElementById('create-view').classList.add('active');
}

function saveNewSchedule() {
    const scheduleName = document.getElementById('schedule-name').value;
    const repeatDay = document.getElementById('repeat-day').value;
    const startDateVal = document.getElementById('start-date-input').value;
    const endDateVal = document.getElementById('end-date-input').value;

    if(scheduleName.trim() === "") { alert("กรุณาตั้งชื่อตาราง"); return; }
    if(tempExercises.length === 0) { alert("กรุณาเพิ่มท่าออกกำลังกาย"); return; }

    const formattedExercises = tempExercises.map(e => {
        let details = "";
        if (e.type === 'cardio') {
            details = `${e.time} นาที`;
        } else {
            details = `${e.rep}reps ${e.set}sets ${e.kg}kg`;
        }
        return { name: e.name, details: details, completed: false };
    });

    let templateToSave = null;

    if (editingTemplateId) {
        const index = userTemplates.findIndex(t => t.id === editingTemplateId);
        if(index !== -1) {
            userTemplates[index].name = scheduleName;
            userTemplates[index].exercises = formattedExercises;
            templateToSave = userTemplates[index];
        }
    } else {
        templateToSave = { id: 'custom_' + new Date().getTime(), name: scheduleName, exercises: formattedExercises };
        userTemplates.push(templateToSave);
    }
    
    // 🔥 บันทึก Template ลง Firebase
    saveTemplatesToFirebase();

    if (repeatDay !== "" && startDateVal && endDateVal) {
        addScheduleRange(repeatDay, startDateVal, endDateVal, templateToSave);
    } else if (repeatDay !== "") {
        alert("กรุณาระบุ 'วันเริ่มต้น' และ 'วันสิ้นสุด' ด้วยครับ");
        return;
    }

    alert("บันทึกข้อมูลเรียบร้อย!");
    editingTemplateId = null;
    switchTab('list'); 
}

function addScheduleRange(targetDayIndex, startStr, endStr, template) {
    let currentLoop = new Date(startStr);
    const endLoop = new Date(endStr);
    targetDayIndex = parseInt(targetDayIndex);
    let countAdded = 0;

    while (currentLoop <= endLoop) {
        if (currentLoop.getDay() === targetDayIndex) {
            const y = currentLoop.getFullYear();
            const m = String(currentLoop.getMonth() + 1).padStart(2, '0');
            const d = String(currentLoop.getDate()).padStart(2, '0');
            const dateKey = `${y}-${m}-${d}`;

            scheduleData[dateKey] = JSON.parse(JSON.stringify(template));
            scheduleData[dateKey].isFinished = false;
            countAdded++;
        }
        currentLoop.setDate(currentLoop.getDate() + 1);
    }
    
    // 🔥 บันทึกตารางทั้งหมดลง Firebase ทีเดียว
    saveDataToFirebase();
    console.log(`เพิ่มตารางไปทั้งหมด ${countAdded} วัน`);
}

// ==========================================
// 7. Helper Functions & Table Render
// ==========================================
function addManualExercise() {
    const name = document.getElementById('input-ex-name').value.trim();
    const set = document.getElementById('input-ex-set').value;
    const rep = document.getElementById('input-ex-rep').value;
    const kg = document.getElementById('input-ex-kg').value;

    if (name === "" || set === "" || rep === "") { alert("กรอกข้อมูลไม่ครบ"); return; }
    
    const isCardio = allExercisesDB.includes(name) && 
                     ["Treadmill (Running)", "Treadmill (Walking)", "Cycling", "Elliptical", "Stair Master", "Rowing Machine"].some(c => name.includes(c));

    if (isCardio) {
        const timeVal = set || 30; 
        tempExercises.push({ name: name, type: 'cardio', time: parseInt(timeVal) });
    } else {
        tempExercises.push({ name: name, type: 'weight', set: parseInt(set), rep: parseInt(rep), kg: kg ? parseInt(kg) : 0 });
    }
    
    document.getElementById('input-ex-name').value = "";
    document.getElementById('input-ex-set').value = "";
    document.getElementById('input-ex-rep').value = "";
    document.getElementById('input-ex-kg').value = "";
    renderTempTable();
}

function renderTempTable() {
    const tbody = document.getElementById('added-exercise-list');
    tbody.innerHTML = "";
    tempExercises.forEach((item, index) => {
        let detailsHtml = "";
        if (item.type === 'cardio') {
            detailsHtml = `<td colspan="3" style="color:#ffb900; font-weight:bold;">${item.time} นาที</td>`;
        } else {
            detailsHtml = `<td>${item.set}</td><td>${item.rep}</td><td>${item.kg}kg</td>`;
        }
        tbody.innerHTML += `
            <tr>
                <td><i class="fas fa-times btn-del-row" onclick="removeTempExercise(${index})"></i> ${item.name}</td>
                ${detailsHtml}
            </tr>`;
    });
}

function removeTempExercise(index) {
    tempExercises.splice(index, 1);
    renderTempTable();
}

// ==========================================
// 8. Universal Modal & Data (Admin Update)
// ==========================================
let currentMuscleList = []; 
let currentSlideIndex = 0; 

// ✅ เปลี่ยนจาก const เป็น let เพื่อให้เพิ่มข้อมูลได้
let muscleData = {
    chest: { title: "เลือกท่าอก (Chest)", exercises: [
        { name: "Chest Fly", img: "Chest Fly.jpg" }, 
        { name: "Incline Chest Press", img: "Incline Chest Press.jpg" }, 
        { name: "Chest Press", img: "Chest press.jpg" }
    ]},
    triceps: { title: "เลือกท่าหลังแขน (Triceps)", exercises: [
        { name: "Rope Triceps Pushdown", img: "Rope pushdown.jpg" }
    ]},
    shoulder: { title: "เลือกท่าไหล่ (Shoulder)", exercises: [
        { name: "Shoulder Press", img: "Shoulder Press.jpg" }
    ]},
    abs: { title: "เลือกท่าท้อง (Abs)", exercises: [
        { name: "Abdominal curl", img: "abdominal curl.jpg" }, 
        { name: "Side abdominal", img: "side abdominal .jpg" }
    ]},
    back: { title: "เลือกท่าหลัง (Back)", exercises: [
        { name: "Lat Pulldown", img: "Lat Pulldown.jpg" }, 
        { name: "Chest Support Row", img: "Chest support row.jpg" }
    ]},
    biceps: { title: "เลือกท่าหน้าแขน (Biceps)", exercises: [
        { name: "Dumbell Curl", img: "dumbell curl.jpg" }, 
        { name: "Hammer Curl", img: "Hammer Curl.jpg" }, 
        { name: "Pressure Curl", img: "pressure curl.jpg" }
    ]},
    legs: { title: "เลือกท่าขา (Legs)", exercises: [
        { name: "Leg Press", img: "Leg Press.jpg" }, 
        { name: "Hip Abduction", img: "Inner Thigh Adductor.jpg" }, 
        { name: "Hip Adduction", img: "leg adduction.jpg" }, 
        { name: "Leg Curl", img: "leg curl.jpg" }, 
        { name: "Leg Extension", img: "leg extension.jpg" }
    ]},
    calves: { title: "เลือกท่าน่อง (Calves)", exercises: [
        { name: "Calf Raise", img: "Calf raise.jpg" }, 
        { name: "Seated Calf Raise", img: "Seated Calf Raise.jpg" }
    ]},
    cardio: { title: "เลือกคาร์ดิโอ (Cardio)", exercises: [
        { name: "Stair Master", img: "Stair Master.jpg" }, 
        { name: "Cycling", img: "Cycling.jpg" }, 
        { name: "Elliptical", img: "Elliptical.jpg" }, 
        { name: "Walking", img: "Walking .jpg" }, 
        { name: "Seated Cycling", img: "Seated Cycling.jpg" }
    ]}
};

// ------------------------------------------------
// 🔥 Admin System Logic (อัปเกรด: เพิ่ม/ลบ ได้)
// ------------------------------------------------

// รายชื่อ Admin (เพิ่มได้เรื่อยๆ)
const ADMIN_USERNAMES = ["admin007", "admin"];

function initSystemData() {
    // 1. เช็คว่าเป็น Admin หรือไม่
    const isAdmin = ADMIN_USERNAMES.includes(currentUsername.toLowerCase());
    if (isAdmin) {
        const adminPanel = document.getElementById('admin-panel');
        if(adminPanel) adminPanel.style.display = 'block';
    }

    // 2. ดึงข้อมูลและ Sync (ทำงานตลอดเวลาที่มีการเปลี่ยนแปลง)
    db.ref('system_exercises').on('value', (snapshot) => {
        const serverData = snapshot.val();
        
        // A. ล้างข้อมูล System เก่าออกจาก muscleData ก่อน (เพื่อกันซ้ำเวลาอัปเดต)
        for (const key in muscleData) {
            // เก็บเฉพาะท่าที่เป็น Default (ไม่มี flag isSystem)
            muscleData[key].exercises = muscleData[key].exercises.filter(ex => !ex.isSystem);
        }

        // B. ล้างหน้าจอ Admin List
        const adminList = document.getElementById('admin-exercise-list');
        if(adminList) adminList.innerHTML = ""; 

        if (serverData) {
            // C. วนลูปข้อมูลจาก Firebase ใส่กลับเข้าไป
            for (const [groupKey, exercisesObj] of Object.entries(serverData)) {
                if (muscleData[groupKey]) {
                    Object.entries(exercisesObj).forEach(([firebaseKey, exData]) => {
                        
                        // 1. เพิ่มเข้าสู่ระบบหลัก (ให้ User ทุกคนเห็น)
                        muscleData[groupKey].exercises.push({
                            name: exData.name,
                            img: exData.img,
                            isSystem: true // แปะป้ายว่าเป็นข้อมูลจากระบบ
                        });

                        // 2. แสดงในหน้า Admin (เฉพาะแอดมิน)
                        if (isAdmin && adminList) {
                            adminList.innerHTML += `
                                <div style="background:#444; padding:10px; border-radius:5px; position:relative; border:1px solid #555;">
                                    <img src="${exData.img}" style="width:100%; height:80px; object-fit:cover; border-radius:5px; background:#000;" onerror="this.src='https://placehold.co/100?text=Error'">
                                    <div style="font-size:0.8rem; margin-top:5px; color:#fff;">${exData.name}</div>
                                    <div style="font-size:0.7rem; color:#aaa;">หมวด: ${groupKey}</div>
                                    
                                    <button onclick="adminDeleteExercise('${groupKey}', '${firebaseKey}')" 
                                        style="position:absolute; top:-5px; right:-5px; background:#ff4757; color:white; border:none; border-radius:50%; width:25px; height:25px; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,0.3); font-weight:bold;">
                                        &times;
                                    </button>
                                </div>
                            `;
                        }
                    });
                }
            }
        }
        console.log("✅ System Data Synced (Add/Delete Supported)");
    });
}

// เรียกทำงานทันที
initSystemData();

// ฟังก์ชันเพิ่มท่า (Create)
function adminAddExercise() {
    const group = document.getElementById('admin-muscle-group').value;
    const name = document.getElementById('admin-ex-name').value.trim();
    const img = document.getElementById('admin-ex-img').value.trim();

    if (!name || !img) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    const newData = {
        name: name,
        img: img,
        addedBy: currentUsername,
        timestamp: Date.now()
    };

    db.ref('system_exercises/' + group).push(newData)
        .then(() => {
            // ไม่ต้อง alert ก็ได้ เพราะหน้าจอจะเด้งขึ้นมาเอง (Realtime)
            document.getElementById('admin-ex-name').value = "";
            document.getElementById('admin-ex-img').value = "";
        })
        .catch(err => alert("Error: " + err.message));
}

// ✅ ฟังก์ชันลบท่า (Delete)
function adminDeleteExercise(group, key) {
    if(confirm("⚠️ คุณต้องการลบท่านี้ออกจากระบบใช่หรือไม่?\n(User ทุกคนจะไม่เห็นท่านี้นะครับ)")) {
        db.ref(`system_exercises/${group}/${key}`).remove()
            .catch(err => alert("ลบไม่สำเร็จ: " + err.message));
    }
}

// ------------------------------------------------
// End Admin Logic
// ------------------------------------------------

function openMuscleModal(muscleKey) {
    const data = muscleData[muscleKey];
    if (!data) { alert("กำลังอัปเดตข้อมูลส่วนนี้ครับ"); return; }

    document.getElementById('muscle-modal-title').innerText = data.title;
    currentMuscleList = data.exercises;
    currentSlideIndex = 0; 

    const btns = document.querySelectorAll('.nav-btn');
    if (currentMuscleList.length <= 1) {
        btns.forEach(b => b.classList.add('hidden'));
    } else {
        btns.forEach(b => b.classList.remove('hidden'));
    }

    renderCurrentSlide(muscleKey);
    document.getElementById('universalModal').style.display = 'flex';
}

function moveSlide(direction) {
    currentSlideIndex += direction;
    if (currentSlideIndex >= currentMuscleList.length) { currentSlideIndex = 0; } 
    else if (currentSlideIndex < 0) { currentSlideIndex = currentMuscleList.length - 1; }

    const title = document.getElementById('muscle-modal-title').innerText;
    const isCardio = title.includes("Cardio") || title.includes("คาร์ดิโอ");
    renderCurrentSlide(isCardio ? 'cardio' : 'weight');
}

function renderCurrentSlide(typeCheck) {
    const slider = document.getElementById('universalSlider');
    const counter = document.getElementById('slide-counter'); 
    
    if(counter) {
        counter.innerText = `${currentSlideIndex + 1}/${currentMuscleList.length}`;
    }

    const ex = currentMuscleList[currentSlideIndex];
    const imgSrc = ex.img;
    let inputsHtml = "";

    const isCardio = (typeCheck === 'cardio');

    if (isCardio) {
        inputsHtml = `<div class="input-row"><input type="number" class="input-time" placeholder="นาที (mins)" style="width: 100px;"></div>`;
    } else {
        inputsHtml = `<div class="input-row"><input type="number" class="input-set" placeholder="Set"><input type="number" class="input-rep" placeholder="Rep"><input type="number" class="input-kg" placeholder="Kg"></div>`;
    }

    slider.innerHTML = `
        <div class="exercise-card" data-type="${isCardio ? 'cardio' : 'weight'}">
            <img src="${imgSrc}" alt="${ex.name}" onerror="this.src='https://placehold.co/400x300?text=No+Image'"> 
            <h3>${ex.name}</h3>
            ${inputsHtml}
            <button class="add-btn" onclick="addFromCard(this)">เพิ่ม</button>
        </div>
    `;
}

function closeModal(modalId) {
    if(modalId) {
        document.getElementById(modalId).style.display = 'none';
    } else {
        document.getElementById('exercise-modal').style.display = 'none';
    }
}

function addFromCard(btn) {
    const card = btn.closest('.exercise-card');
    const name = card.querySelector('h3').innerText;
    const type = card.getAttribute('data-type'); 

    if (type === 'cardio') {
        const timeVal = card.querySelector('.input-time').value;
        if(timeVal === '') { alert("กรุณาระบุเวลา (นาที)"); return; }
        tempExercises.push({ name: name, type: 'cardio', time: parseInt(timeVal) });
    } else {
        const setVal = card.querySelector('.input-set').value;
        const repVal = card.querySelector('.input-rep').value;
        const kgVal = card.querySelector('.input-kg').value;
        if(setVal === '' || repVal === '') { alert("กรุณากรอก Set และ Rep"); return; }
        tempExercises.push({ name: name, type: 'weight', set: parseInt(setVal), rep: parseInt(repVal), kg: kgVal ? parseInt(kgVal) : 0 });
    }

    renderTempTable(); 
    closeModal('universalModal');
}

function goToMusclePage(muscle) { alert(`(Demo) ไปหน้า: ${muscle}`); }

// ==========================================
// 9. ระบบสรุปผล
// ==========================================
function openSummaryModal() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    let totalExercises = 0;
    let completedExercises = 0;
    for (const [dateKey, data] of Object.entries(scheduleData)) {
        const [dYear, dMonth, dDay] = dateKey.split('-').map(Number);
        if (dYear === year && (dMonth - 1) === month) {
            if (data.isFinished === true && data.exercises && Array.isArray(data.exercises)) {
                totalExercises += data.exercises.length;
                const done = data.exercises.filter(ex => ex.completed).length;
                completedExercises += done;
            }
        }
    }
    let percentage = 0;
    if (totalExercises > 0) { percentage = Math.round((completedExercises / totalExercises) * 100); }
    const circle = document.getElementById('summary-progress-circle');
    const text = document.getElementById('summary-percent-text');
    if (circle && text) {
        circle.style.background = `conic-gradient(#ffb900 ${percentage * 3.6}deg, #eee 0deg)`;
        text.innerText = `${percentage}%`;
    }
    const countText = document.getElementById('summary-text-count');
    if (countText) {
        countText.innerHTML = `คุณทำสำเร็จ <b style="color:#ffb900;">${completedExercises}</b> ท่า จากทั้งหมด <b>${totalExercises}</b> ท่า`;
    }
    document.getElementById('summaryModal').style.display = 'flex';
}

// ==========================================
// 10. ระบบดูประวัติย้อนหลัง
// ==========================================
function openHistoryModal() {
    const historyContainer = document.getElementById('history-list-container');
    if (!historyContainer) return;
    historyContainer.innerHTML = "";
    const sortedKeys = Object.keys(scheduleData).sort((a, b) => new Date(b) - new Date(a)); 
    if (sortedKeys.length === 0) {
        historyContainer.innerHTML = "<p style='text-align:center; color:#888; margin-top:20px;'>ยังไม่มีประวัติการฝึก</p>";
        document.getElementById('historyModal').style.display = 'flex';
        return;
    }
    let currentGroup = "";
    sortedKeys.forEach(key => {
        const data = scheduleData[key];
        const dateObj = new Date(key);
        const monthName = monthNames[dateObj.getMonth()];
        const yearBE = dateObj.getFullYear() + 543;
        const groupLabel = `${monthName} ${yearBE}`;
        if (groupLabel !== currentGroup) {
            historyContainer.innerHTML += `<div class="history-month-title">${groupLabel}</div>`;
            currentGroup = groupLabel;
        }
        const day = dateObj.getDate();
        const isDone = data.isFinished === true;
        const statusClass = isDone ? 'status-done' : 'status-pending';
        const statusText = isDone ? 'เสร็จสิ้น' : 'รอดำเนินการ';
        historyContainer.innerHTML += `<div class="history-item"><div><div class="history-date">วันที่ ${day}</div><div class="history-name">${data.name}</div></div><span class="history-status ${statusClass}">${statusText}</span></div>`;
    });
    document.getElementById('historyModal').style.display = 'flex';
}

// ==========================================
// 11. ระบบ Backup & Restore (ปรับให้ Restore ขึ้น Firebase)
// ==========================================
function exportData() {
    // Export ยังใช้ตรรกะเดิมได้ (ดึงจากตัวแปรใน JS แล้ว Download ลงเครื่อง)
    const backupData = {
        schedule: scheduleData,
        templates: userTemplates
    };
    
    const dataStr = JSON.stringify(backupData, null, 2); 
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `Gym_Backup_${currentUsername}_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;
    if (!confirm("⚠️ คำเตือน: การกู้คืนข้อมูลจะทับข้อมูลปัจจุบันบน Cloud ทั้งหมด\nคุณแน่ใจหรือไม่?")) {
        inputElement.value = ''; 
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // อัปเดตตัวแปร
            if (data.schedule) scheduleData = data.schedule;
            if (data.templates) userTemplates = data.templates;

            // 🔥 บันทึกทับลง Firebase
            saveDataToFirebase();
            saveTemplatesToFirebase();

            alert("✅ กู้คืนข้อมูลสำเร็จ! ระบบจะรีเฟรชหน้าเว็บ");
            window.location.reload(); 
        } catch (error) {
            alert("❌ ไฟล์ไม่ถูกต้อง หรือเกิดข้อผิดพลาด");
            console.error(error);
        }
    };
    reader.readAsText(file);
}

// ==========================================
// 12. ระบบ Export PDF
// ==========================================
function exportToPDF() {
    const content = document.createElement('div');
    content.style.padding = '20px';
    content.style.fontFamily = 'Sarabun, sans-serif';
    let html = `<h1 style="text-align:center; color:#ffb900;">ตารางออกกำลังกาย</h1><h3 style="text-align:center; color:#333;">ของ: ${currentUsername}</h3><p style="text-align:center; color:#666;">พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH')}</p><hr style="border:1px solid #ddd; margin: 20px 0;">`;
    
    userTemplates.forEach((temp, index) => {
        html += `<div style="margin-bottom: 20px; border: 1px solid #eee; border-radius: 10px; padding: 15px; background: #fff;"><h3 style="margin: 0 0 10px 0; color: #ffb900;">${index + 1}. ${temp.name}</h3><table style="width:100%; border-collapse: collapse;"><tr style="background:#f9f9f9; text-align:left;"><th style="padding:8px; border-bottom:1px solid #ddd;">ท่าฝึก</th><th style="padding:8px; border-bottom:1px solid #ddd;">รายละเอียด</th></tr>`;
        temp.exercises.forEach(ex => {
            html += `<tr><td style="padding:8px; border-bottom:1px solid #eee;">${ex.name}</td><td style="padding:8px; border-bottom:1px solid #eee;">${ex.details}</td></tr>`;
        });
        html += `</table></div>`;
    });
    content.innerHTML = html;
    const opt = { margin: 10, filename: `Fitness_Plan_${currentUsername}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(opt).from(content).save().then(() => { alert("ดาวน์โหลด PDF เรียบร้อยครับ! 📄"); });
}

// ==========================================
// 13. ระบบ Rest Timer
// ==========================================
let timerInterval = null;
let timeLeft = 60; 

function startRestTimer(duration) {
    timeLeft = duration;
    updateTimerDisplay();
    document.getElementById('timerModal').style.display = 'flex';
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            playBeep();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    document.getElementById('timerModal').style.display = 'none';
}

function adjustTimer(seconds) {
    timeLeft += seconds;
    if (timeLeft < 0) timeLeft = 0;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const el = document.getElementById('timer-display');
    if(el) el.innerText = display;
}

function playBeep() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine"; 
    osc.frequency.value = 880; 
    gain.gain.value = 0.1;
    osc.start();
    setTimeout(() => osc.stop(), 500); 
}

// ==========================================
// 14. ระบบล้างข้อมูล (Clear Data)
// ==========================================
function clearAllData() {
    if(confirm("⚠️ อันตราย! ข้อมูลตารางฝึกและประวัติทั้งหมดจะหายไป\nคุณต้องการเริ่มใหม่ทั้งหมดใช่หรือไม่?")) {
        
        // 🔥 ลบข้อมูลใน Firebase
        db.ref('users/' + currentUsername + '/schedule').remove();
        db.ref('users/' + currentUsername + '/templates').remove();

        alert("ล้างข้อมูลเรียบร้อย!");
        // ไม่ต้อง reload ก็ได้เพราะ Realtime จะสั่ง clear หน้าจอเอง แต่ reload เพื่อความชัวร์
        window.location.reload();
    }
}

// --- ส่วนเสริมสำหรับส่งงาน Java Backend ---
async function testJavaBackend() {
    const statusText = document.getElementById('java-status');
    if(statusText) statusText.innerText = "กำลังเชื่อมต่อกับ Java Server...";

    try {
        // ✅ แก้ไข: ดึงข้อมูลจากตัวแปร global ที่ sync กับ Firebase แล้ว
        // (แทนการดึงจาก LocalStorage ซึ่งอาจจะว่างเปล่าในระบบนี้)
        const currentData = scheduleData || {};
        let count = 0;

        // 2. วนลูปส่งข้อมูลไป Java
        const dateKeys = Object.keys(currentData);
        if(dateKeys.length === 0) {
            // ถ้าไม่มีข้อมูลเลย ให้สร้างข้อมูลหลอกส่งไปเทส
            await fetch('/api/add', { method: 'POST', body: "Weight|Test Bench Press|4|12|40.0" });
            await fetch('/api/add', { method: 'POST', body: "Cardio|Test Running|30" });
        } else {
            for (const dateKey of dateKeys) {
                const dayData = currentData[dateKey];
                if (dayData.exercises) {
                    for (const ex of dayData.exercises) {
                        let bodyStr = "";
                        if (ex.details.includes('นาที')) {
                            const min = ex.details.match(/\d+/) ? ex.details.match(/\d+/)[0] : 30;
                            bodyStr = `Cardio|${ex.name}|${min}`;
                        } else {
                            bodyStr = `Weight|${ex.name}|4|12|10.0`; // ค่าสมมติถ้าแกะไม่ได้
                        }
                        await fetch('/api/add', { method: 'POST', body: bodyStr });
                        count++;
                    }
                }
            }
        }

        // 3. ดึงข้อมูลที่ Sort แล้วกลับมาโชว์
        const response = await fetch('/api/exercises');
        const sortedData = await response.json();
        
        console.log("Java Server Response:", sortedData);
        if(statusText) statusText.innerHTML = `✅ สำเร็จ! Java บันทึกลงไฟล์แล้ว <br>และ Sort ข้อมูลกลับมา ${sortedData.length} รายการ (ดูใน Console)`;
        alert("Java Backend ทำงานถูกต้อง!\n- บันทึกไฟล์ schedule_data.txt เรียบร้อย\n- เรียงลำดับข้อมูล (Sorting) เรียบร้อย");

    } catch (error) {
        console.error(error);
        if(statusText) statusText.innerText = "❌ เชื่อมต่อไม่ได้ (รัน Java หรือยัง?)";
        alert("เชื่อมต่อ Java ไม่ได้\nกรุณารันไฟล์ FitnessAppServer.java ก่อนครับ");
    }
}

// ==========================================
// 15. ระบบรางวัลความสำเร็จ (Achievements)
// ==========================================

function openAchievementModal() {
    calculateAchievements(); // คำนวณก่อนแสดง
    document.getElementById('achievementModal').style.display = 'flex';
}

function calculateAchievements() {
    let totalFinishedDays = 0;
    let totalCardioMinutes = 0;
    
    // ✅ เพิ่มตัวแปรนับดาวที่ได้
    let earnedStars = 0;
    const maxStars = 8; // มีทั้งหมด 8 ภารกิจ

    // --- 1. วนลูปนับสถิติรวม (Cumulative) ---
    Object.values(scheduleData).forEach(dayData => {
        // นับวันที่สำเร็จ (ติ๊กถูกเขียวในปฏิทิน)
        if (dayData.isFinished === true) {
            totalFinishedDays++;
        }

        // นับเวลาคาร์ดิโอ (รวมทั้งหมดที่มีการติ๊กถูก)
        if (dayData.exercises) {
            dayData.exercises.forEach(ex => {
                // เช็คว่าเป็น Cardio หรือไม่ (ดูจากคำว่า 'นาที' ใน details)
                if (ex.completed && ex.details.includes('นาที')) {
                    const timeMatch = ex.details.match(/(\d+)/);
                    if (timeMatch) {
                        totalCardioMinutes += parseInt(timeMatch[0]);
                    }
                }
            });
        }
    });

    // --- 2. คำนวณสถิติรายวัน (Daily Quest) ของ "วันนี้" ---
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayKey = `${y}-${m}-${d}`;
    
    const todayData = scheduleData[todayKey];
    
    let todayWeightCount = 0;
    let todayCardioMins = 0;
    let isTodayAllFinished = false;
    let totalExercisesToday = 0;
    let completedExercisesToday = 0;

    if (todayData && todayData.exercises) {
        totalExercisesToday = todayData.exercises.length;
        todayData.exercises.forEach(ex => {
            if (ex.completed) {
                completedExercisesToday++;
                if (ex.details.includes('นาที')) {
                    const t = ex.details.match(/(\d+)/);
                    if(t) todayCardioMins += parseInt(t[0]);
                } else {
                    // ถือเป็น Weight Training
                    todayWeightCount++;
                }
            }
        });

        if (totalExercisesToday > 0 && completedExercisesToday === totalExercisesToday) {
            isTodayAllFinished = true;
        }
    }

    // --- 3. คำนวณดาว (Logic) ---
    // หมวดสะสมวัน
    if (totalFinishedDays >= 10) earnedStars++;
    if (totalFinishedDays >= 25) earnedStars++;
    if (totalFinishedDays >= 50) earnedStars++;

    // หมวดคาร์ดิโอ
    if (totalCardioMinutes >= 100) earnedStars++;
    if (totalCardioMinutes >= 300) earnedStars++;

    // หมวดรายวัน
    // 1. เวท 3 ท่า
    if (todayWeightCount >= 3) earnedStars++;
    
    // 2. Combo
    let comboProgress = 0;
    if (todayWeightCount >= 5) comboProgress += 50;
    if (todayCardioMins >= 30) comboProgress += 50;
    if (comboProgress >= 100) earnedStars++;

    // 3. ครบทุกท่า
    if (isTodayAllFinished) earnedStars++;


    // ✅ --- 4. อัปเดต UI หน้าแรก (ตัวเลขข้างนอก) ---
    const mainStarLabel = document.getElementById('main-star-count');
    if (mainStarLabel) {
        mainStarLabel.innerHTML = `สะสมแล้ว <b style="color:#e96b04">${earnedStars}/${maxStars}</b> ดวง`;
    }


    // --- 5. อัปเดต UI ใน Modal (หลอดพลัง) ---

    // Helper ในการอัปเดตหลอดและดาว
    const updateUI = (idSuffix, current, target, isCount = true) => {
        const percent = Math.min(100, Math.round((current / target) * 100));
        const bar = document.getElementById(`bar-${idSuffix}`);
        const label = document.getElementById(`label-${idSuffix}`);
        const star = document.getElementById(`star-${idSuffix}`);

        if(bar) {
            bar.style.width = `${percent}%`;
            if(percent >= 100) bar.classList.add('completed');
            else bar.classList.remove('completed');
        }
        
        if(label) {
            if(isCount) label.innerText = `${current}/${target} ${idSuffix.includes('cardio') ? 'นาที' : 'วัน'}`;
            else label.innerText = (percent >= 100) ? "สำเร็จ!" : `${percent}%`;
        }

        if(star) {
            if(percent >= 100) star.classList.add('unlocked');
            else star.classList.remove('unlocked');
        }
    };

    // === อัปเดตหมวด: สะสมวัน ===
    updateUI('days-10', totalFinishedDays, 10);
    updateUI('days-25', totalFinishedDays, 25);
    updateUI('days-50', totalFinishedDays, 50);

    // === อัปเดตหมวด: สะสมคาร์ดิโอ ===
    updateUI('cardio-100', totalCardioMinutes, 100);
    updateUI('cardio-300', totalCardioMinutes, 300);

    // === อัปเดตหมวด: รายวัน ===
    
    // 1. ยกเวทครบ 3 ท่า
    const percentDaily3 = Math.min(100, (todayWeightCount / 3) * 100);
    document.getElementById('bar-daily-3').style.width = `${percentDaily3}%`;
    document.getElementById('label-daily-3').innerText = `${todayWeightCount}/3 ท่า`;
    if(todayWeightCount >= 3) {
        document.getElementById('bar-daily-3').classList.add('completed');
        document.getElementById('star-daily-3').classList.add('unlocked');
    }

    // 2. Combo: เวท 5 ท่า + คาร์ดิโอ 30 นาที
    
    document.getElementById('bar-daily-combo').style.width = `${comboProgress}%`;
    // แก้ไขข้อความให้เป็นภาษาไทย
    document.getElementById('label-daily-combo').innerText = 
        `เวท ${todayWeightCount}/5, คาร์ดิโอ ${todayCardioMins}/30`;
    
    if(comboProgress >= 100) {
        document.getElementById('bar-daily-combo').classList.add('completed');
        document.getElementById('star-daily-combo').classList.add('unlocked');
    }

    // 3. เก็บครบทุกท่า (All Finished)
    const percentAll = isTodayAllFinished ? 100 : Math.round((completedExercisesToday/totalExercisesToday)*100) || 0;
    document.getElementById('bar-daily-all').style.width = `${percentAll}%`;
    document.getElementById('label-daily-all').innerText = isTodayAllFinished ? "ครบถ้วน!" : `${completedExercisesToday}/${totalExercisesToday}`;
    
    if(isTodayAllFinished) {
        document.getElementById('bar-daily-all').classList.add('completed');
        document.getElementById('star-daily-all').classList.add('unlocked');
    }
}