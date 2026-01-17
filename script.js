let products = [];
let categories = [];
let apiBuffer = []; 
let pieChartInstance = null;
let barChartInstance = null;

// --- 1. INITIALISATION ---
window.onload = () => {
    syncAndRefresh();
    fetchAPIData(); 
};

function syncAndRefresh() {
    products = JSON.parse(localStorage.getItem("products")) || [];
    categories = JSON.parse(localStorage.getItem("categories")) || ["Informatique", "Accessoires"];
    renderCategories();
    renderProducts();
    updateDashboard();
}

async function fetchAPIData() {
    try {
        const res = await fetch("https://fakestoreapi.com/products");
        apiBuffer = await res.json();
    } catch (e) {
        console.warn("API Offline, suggestions indisponibles");
    }
}

// --- 2. LOGIQUE AUTOFILL (API) ---
function suggestFromAPI(val) {
    const box = document.getElementById("apiSuggestions");
    if (!val || val.length < 2) {
        box.style.display = "none";
        return;
    }

    const matches = apiBuffer.filter(p => 
        p.title.toLowerCase().includes(val.toLowerCase())
    );

    if (matches.length > 0) {
        box.innerHTML = matches.map(p => `
            <div class="list-group-item list-group-item-action py-2" style="cursor:pointer"
                 onclick="applyAutofill('${p.title.replace(/'/g, "\\'")}', ${p.price}, '${p.category.replace(/'/g, "\\'")}')">
                <div class="d-flex justify-content-between align-items-center">
                    <span class="small fw-bold text-truncate" style="max-width:80%">${p.title}</span>
                    <span class="badge bg-primary">${p.price}€</span>
                </div>
            </div>
        `).join('');
        box.style.display = "block";
    } else {
        box.style.display = "none";
    }
}

function applyAutofill(name, price, cat) {
    document.getElementById("pname").value = name;
    document.getElementById("pprice").value = price;
    
    if (!categories.includes(cat)) {
        categories.push(cat);
        localStorage.setItem("categories", JSON.stringify(categories));
        renderCategories();
    }
    document.getElementById("pcat").value = cat;
    document.getElementById("apiSuggestions").style.display = "none";
}

// --- 3. CRUD PRODUITS ---
document.getElementById("productForm").onsubmit = e => {
    e.preventDefault();
    const id = document.getElementById("pid").value || Date.now();
    
    const newProduct = {
        id: id,
        name: document.getElementById("pname").value,
        price: parseFloat(document.getElementById("pprice").value),
        qty: parseInt(document.getElementById("pqty").value),
        cat: document.getElementById("pcat").value
    };

    const idx = products.findIndex(x => x.id == id);
    if (idx > -1) products[idx] = newProduct;
    else products.push(newProduct);

    localStorage.setItem("products", JSON.stringify(products));
    e.target.reset();
    document.getElementById("pid").value = "";
    syncAndRefresh();
};

function renderProducts(filter = "") {
    const list = document.getElementById("productList");
    if(!list) return;
    list.innerHTML = "";

    products
        .filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)) 
        .forEach(p => {
            list.innerHTML += `
            <tr onclick="viewDetails(${p.id})">
                <td><div class="fw-bold">${p.name}</div><div class="small text-muted">${p.cat}</div></td>
                <td>${p.price.toFixed(2)} €</td>
                <td><span class="badge ${p.qty < 5 ? 'bg-danger':'bg-success'} rounded-pill">${p.qty}</span></td>
                <td>
                    <button class="btn btn-sm btn-light text-primary" onclick="event.stopPropagation(); editProduct(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-light text-danger" onclick="event.stopPropagation(); delProduct(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });
}

// --- 4. NAVIGATION ---
function showModule(id, el) {
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    if(el) el.classList.add('active');
    if(id === 'dashboard') updateDashboard();
}

function viewDetails(id) {
    const p = products.find(x => x.id == id);
    if(!p) return;
    document.getElementById("detailName").innerText = p.name;
    document.getElementById("detailCat").innerText = p.cat;
    document.getElementById("detailPrice").innerText = p.price.toFixed(2) + " €";
    document.getElementById("detailQty").innerText = p.qty;
    showModule('productDetail');
}

// --- 5. CATEGORIES & DASHBOARD ---
function addCategory(e) {
    e.preventDefault();
    const val = document.getElementById("catName").value;
    if(!categories.includes(val)) {
        categories.push(val);
        localStorage.setItem("categories", JSON.stringify(categories));
        e.target.reset();
        syncAndRefresh();
    }
}

function renderCategories() {
    const sel = document.getElementById("pcat");
    const ul = document.getElementById("catList");
    if(!sel || !ul) return;
    sel.innerHTML = ""; ul.innerHTML = "";
    categories.forEach((c, i) => {
        sel.innerHTML += `<option value="${c}">${c}</option>`;
        ul.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">${c} 
            <button class="btn btn-sm text-danger" onclick="delCat(${i})"><i class="fas fa-trash"></i></button></li>`;
    });
}

function delCat(i) {
    categories.splice(i, 1);
    localStorage.setItem("categories", JSON.stringify(categories));
    syncAndRefresh();
}

function updateDashboard() {
    const totalStock = products.reduce((s,p)=> s + p.qty, 0);
    const totalVal = products.reduce((s,p)=> s + (p.qty * p.price), 0);
    document.getElementById("kpiProducts").innerText = products.length;
    document.getElementById("kpiStock").innerText = totalStock;
    document.getElementById("kpiValue").innerText = totalVal.toLocaleString() + " €";

    const dataMap = {};
    products.forEach(p => dataMap[p.cat] = (dataMap[p.cat] || 0) + p.qty);
    const labels = Object.keys(dataMap);
    const values = Object.values(dataMap);

    const total = values.reduce((a, b) => a + b, 0);
    const percentValues = values.map(v => ((v / total) * 100).toFixed(1));

    const ctxPie = document.getElementById("pieChart").getContext('2d');
    if(pieChartInstance) pieChartInstance.destroy();
    pieChartInstance = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: percentValues, backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444'], borderWidth: 0 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.label}: ${ctx.parsed}%`
                    }
                }
            }
        }
    });

    const ctxBar = document.getElementById("barChart").getContext('2d');
    if(barChartInstance) barChartInstance.destroy();
    barChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'Stock (%)', data: percentValues, backgroundColor: '#6366f1' }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    ticks: {
                        callback: v => v + '%'
                    },
                    max: 100
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.parsed.y + '%'
                    }
                }
            }
        }
    });
}

function editProduct(id) {
    const p = products.find(x => x.id == id);
    document.getElementById("pid").value = p.id;
    document.getElementById("pname").value = p.name;
    document.getElementById("pprice").value = p.price;
    document.getElementById("pqty").value = p.qty;
    document.getElementById("pcat").value = p.cat;
    showModule('products');
}

function delProduct(id) {
    if(confirm("Supprimer?")) {
        products = products.filter(x => x.id != id);
        localStorage.setItem("products", JSON.stringify(products));
        syncAndRefresh();
    }
}

// Fermer suggestions si clic extérieur
window.onclick = (e) => {
    if (!e.target.matches('#pname')) {
        document.getElementById("apiSuggestions").style.display = "none";
    }
}
