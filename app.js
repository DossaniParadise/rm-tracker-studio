// ============================================================
// APP.JS - Repair & Maintenance Tracker
// ============================================================

const stores = [
    {id:"BK22027",name:"Burger King Alvord 22027",code:"BK22027",type:"fastfood",brand:"bk",lat:33.3925543,lng:-97.7297886,address:"8417 N.US Hwy 287, Alvord, TX 76225"},
    {id:"BK27082",name:"Burger King Alliance/TMS 27082",code:"BK27082",type:"fastfood",brand:"bk",lat:33.0252883,lng:-97.2760128,address:"15933 North Freeway, Fort Worth, TX 76177"},
    {id:"BK27083",name:"Burger King Azle 27083",code:"BK27083",type:"fastfood",brand:"bk",lat:32.9103543,lng:-97.5440232,address:"1001 Boyd Road, Azle, TX 76020"},
    {id:"BK28626",name:"Burger King Bailey Boswell 28626",code:"BK28626",type:"fastfood",brand:"bk",lat:32.8804702,lng:-97.3928522,address:"4541 W. Bailey Boswell, Fort Worth, TX 76179"},
    {id:"BK11460",name:"Burger King Bonham 11460",code:"BK11460",type:"fastfood",brand:"bk",lat:33.5930631,lng:-96.192829,address:"1801 North, TX-121, Bonham, TX 75418"},
    {id:"BK26924",name:"Burger King Corinth 26924",code:"BK26924",type:"fastfood",brand:"bk",lat:33.1323896,lng:-97.0414887,address:"8001 S. Interstate 35 E, Corinth, TX 76210"},
    {id:"BK23613",name:"Burger King Corsicana 23613",code:"BK23613",type:"fastfood",brand:"bk",lat:32.0869344,lng:-96.5141699,address:"3620 W State Hwy 31, Corsicana, TX, 75110"}, 
    {id:"PQS01",name:"Paradise QS #01 - Sun Valley",code:"PQS01",type:"cstore",brand:"pqs",lat:32.6795074,lng:-97.2398344,address:"5401 Sun Valley Dr., Fort Worth, TX 76119"},
    {id:"PQS02",name:"Paradise QS #02 - Lewisville",code:"PQS02",type:"cstore",brand:"pqs",lat:32.9906715,lng:-96.9780407,address:"521 E. Hwy 121, Lewisville, TX 75057"},
    {id:"CW001",name:"Scarborough Car Wash",code:"CW001",type:"carwash",brand:"cw",lat:32.3741146,lng:-96.8662758,address:"1448 FM 66, Waxahachie, TX 75167"}
];

const firebaseConfig = {
    apiKey: "AIzaSyDf0W5a8UPpuZbo873nWfed6VvNExL4BjM",
    authDomain: "dossani-paradise-rm-tracker.firebaseapp.com",
    databaseURL: "https://dossani-paradise-rm-tracker-default-rtdb.firebaseio.com",
    projectId: "dossani-paradise-rm-tracker",
    storageBucket: "dossani-paradise-rm-tracker.firebasestorage.app",
    messagingSenderId: "328034984226",
    appId: "1:328034984226:web:2b2ddb58d935bec201857b"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let currentUser = null;
let selectedStore = null;

auth.onAuthStateChanged(async (user) => {
    if (user) {
        loadUserData(user);
    } else {
        showScreen('loginScreen');
    }
});

async function loadUserData(user) {
    const snap = await db.ref(`users/${user.uid}`).once('value');
    let data = snap.val();
    if (!data) {
        // Handle new user logic...
        showToast('Account pending setup...', 'error');
        auth.signOut();
        return;
    }
    currentUser = data;
    showApp();
}

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    routeToLanding();
}

function routeToLanding() {
    if (currentUser.role === 'Manager') {
        showScreen('managerLanding');
    } else if (currentUser.role === 'Technician') {
        showScreen('techDashboard');
    } else {
        showScreen('storeSelection');
    }
}

function showScreen(id) {
    const screens = ['loginScreen', 'appContainer', 'managerLanding', 'techDashboard', 'storeSelection', 'newIssueScreen', 'existingIssuesScreen'];
    screens.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.toggle('hidden', s !== id && s !== 'appContainer');
    });
}

function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + type;
    setTimeout(() => t.classList.remove('show'), 3000);
}

// Global scope functions for HTML handlers
window.sendSignInLink = async function() {
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) return;
    try {
        await auth.sendSignInLinkToEmail(email, { url: window.location.href, handleCodeInApp: true });
        window.localStorage.setItem('emailForSignIn', email);
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('emailSentMessage').classList.remove('hidden');
        document.getElementById('sentToEmail').textContent = email;
    } catch (e) {
        showToast('Failed to send link', 'error');
    }
};

// ... existing code ...

window.showNewIssueScreen = () => {
    if (!selectedStore) {
        showToast('Select a store first', 'error');
        return;
    }
    showScreen('newIssueScreen');
};

window.showExistingIssuesScreen = () => {
    if (!selectedStore) {
        showToast('Select a store first', 'error');
        return;
    }
    showScreen('existingIssuesScreen');
    loadTickets();
};

async function loadTickets() {
    const listEl = document.getElementById('ticketsList');
    if (!listEl) return;
    listEl.innerHTML = '<div class="empty-state">Loading tickets...</div>';

    try {
        const snap = await db.ref('tickets').orderByChild('storeCode').equalTo(selectedStore.code).once('value');
        const tickets = [];
        snap.forEach(child => {
            tickets.push({ ...child.val(), _key: child.key });
        });
        renderTickets(tickets);
    } catch (e) {
        showToast('Error loading tickets', 'error');
    }
}

function renderTickets(tickets) {
    const listEl = document.getElementById('ticketsList');
    if (tickets.length === 0) {
        listEl.innerHTML = '<div class="empty-state">No tickets found.</div>';
        return;
    }
    listEl.innerHTML = tickets.map(t => `
        <div class="ticket-card" onclick="openTicketDetail('${t._key}')">
            <div style="padding:15px">
                <div style="display:flex;justify-content:space-between">
                    <strong>${t.id}</strong>
                    <span class="status-badge">${t.status}</span>
                </div>
                <p style="margin-top:10px">${t.description.substring(0, 100)}...</p>
            </div>
        </div>
    `).join('');
}

window.selectStore = () => {
    const id = document.getElementById('storeSelect').value;
    selectedStore = stores.find(s => s.id === id);
    if (selectedStore) {
        document.getElementById('actionButtons')?.classList.remove('hidden');
    }
};

function init() {
    const sel = document.getElementById('storeSelect');
    if (sel) {
        stores.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            sel.appendChild(opt);
        });
    }
}

document.addEventListener('DOMContentLoaded', init);
