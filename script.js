// --- 1. STATE MANAGEMENT ---
// These variables act as our "Source of Truth"
let products = [];
let categories = [];
let pieChartInstance = null;
let barChartInstance = null;

/**
 * The "Brain" of the app: Pulls from LocalStorage and refreshes every UI component
 */
function syncAndRefresh() {
    products = JSON.parse(localStorage.getItem("products")) || [];
    categories = JSON.parse(localStorage.getItem("categories")) || ["Informatique", "Accessoires"];
    
    // Update all UI modules
    renderCategories();
    renderProducts(); 
    updateDashboard();
}

// Listen for changes from other tabs/windows automatically
window.addEventListener('storage', (e) => {
    if (e.key === 'products' || e.key === 'categories') {
        syncAndRefresh();
    }
});

// --- 2. NAVIGATION ---
function showModule(id, el) {
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    if(el) el.classList.add('active');
    
    // Ensure charts resize correctly when tab is switched
    if(id === 'dashboard') updateDashboard();
}

// --- 3. CATEGORY LOGIC ---
function renderCategories() {
    const sel = document.getElementById("pcat");
    const ul = document.getElementById("catList");
    if(!sel || !ul) return;
    
    sel.innerHTML = ""; 
    ul.innerHTML = "";
    
    categories.forEach((c, i) => {
        sel.innerHTML += `<option value="${c}">${c}</option>`;
        ul.innerHTML += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                ${c}
                <button class="btn btn-sm text-danger" onclick="delCat(${i})">
                    <i class="fas fa-trash"></i>
                </button>
            </li>`;
    });
}

function addCategory(e) {
    e.preventDefault();
    const input = document.getElementById("catName");
    const val = input.value.trim();
    if(val && !categories.includes(val)) {
        categories.push(val);
        localStorage.setItem("categories", JSON.stringify(categories));
        input.value = "";
        syncAndRefresh(); // Automatic Update
    }
}

function delCat(i) {
    categories.splice(i, 1);
    localStorage.setItem("categories", JSON.stringify(categories));
    syncAndRefresh(); // Automatic Update
}

// --- 4. PRODUCT LOGIC ---
document.getElementById("productForm").onsubmit = e => {
    e.preventDefault();
    const id = document.getElementById("pid").value || Date.now();
    const p = {
        id: id,
        name: document.getElementById("pname").value,
        price: parseFloat(document.getElementById("pprice").value),
        qty: parseInt(document.getElementById("pqty").value),
        cat: document.getElementById("pcat").value
    };

    const idx = products.findIndex(x => x.id == id);
    idx > -1 ? products[idx] = p : products.push(p);
    
    localStorage.setItem("products", JSON.stringify(products));
    e.target.reset();
    document.getElementById("pid").value = "";
    syncAndRefresh(); // Automatic Update
};

function renderProducts(filter = "") {
    const list = document.getElementById("productList");
    if(!list) return;
    list.innerHTML = "";

    products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
    .forEach(p => {
        list.innerHTML += `
            <tr>
                <td><div class="fw-bold">${p.name}</div><div class="small text-muted">${p.cat}</div></td>
                <td>${p.price.toFixed(2)} €</td>
                <td><span class="badge ${p.qty < 5 ? 'bg-danger':'bg-success'} rounded-pill">${p.qty}</span></td>
                <td>
                    <button class="btn btn-sm btn-light text-primary me-2" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-light text-danger" onclick="delProduct(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });
}

function editProduct(id) {
    const p = products.find(x => x.id == id);
    document.getElementById("pid").value = p.id;
    document.getElementById("pname").value = p.name;
    document.getElementById("pprice").value = p.price;
    document.getElementById("pqty").value = p.qty;
    document.getElementById("pcat").value = p.cat;
    showModule('products', document.querySelector('[onclick*="products"]'));
}

function delProduct(id) {
    if(confirm("Supprimer ce produit ?")) {
        products = products.filter(x => x.id != id);
        localStorage.setItem("products", JSON.stringify(products));
        syncAndRefresh(); // Automatic Update
    }
}

// --- 5. DASHBOARD CHARTS (ENHANCED) ---
function updateDashboard() {
    const kpiP = document.getElementById("kpiProducts");
    if(!kpiP) return;

    // Calculations
    const totalStock = products.reduce((s,p)=> s + p.qty, 0);
    const totalVal = products.reduce((s,p)=> s + (p.qty * p.price), 0);

    // Update Text KPIs
    kpiP.innerText = products.length;
    document.getElementById("kpiStock").innerText = totalStock;
    document.getElementById("kpiValue").innerText = totalVal.toLocaleString() + " €";

    // Prepare Chart Data
    const dataMap = {};
    products.forEach(p => dataMap[p.cat] = (dataMap[p.cat] || 0) + p.qty);
    const labels = Object.keys(dataMap);
    const values = Object.values(dataMap);
    const percentages = values.map(v => totalStock > 0 ? ((v / totalStock) * 100).toFixed(1) : 0);

    // 1. DOUGHNUT CHART (Improved Look)
    const ctxPie = document.getElementById("pieChart").getContext('2d');
    if(pieChartInstance) pieChartInstance.destroy();
    pieChartInstance = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: labels.map((l, i) => `${l} (${percentages[i]}%)`),
            datasets: [{
                data: values,
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // 2. BAR CHART (Improved Look)
    const ctxBar = document.getElementById("barChart").getContext('2d');
    if(barChartInstance) barChartInstance.destroy();
    barChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantité en Stock',
                data: values,
                backgroundColor: '#6366f1',
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// --- 6. API SYNC ---
async function initAPI() {
    const badge = document.getElementById("apiStatus");
    try {
        const res = await fetch("https://fakestoreapi.com/products");
        if(!res.ok) throw new Error();
        const category = await res.json()
        category.forEach(c => {
            if (!categories.includes(c.category)) {
                categories.push(c.category)
            }
        });
        localStorage.setItem("categories", JSON.stringify(categories));
    } catch (e) {
       
    }
}

// --- 7. INITIALIZE ---
window.onload = () => {
    syncAndRefresh();
    initAPI();
};

// Auto-check API every 1 minute
setInterval(initAPI, 60000);