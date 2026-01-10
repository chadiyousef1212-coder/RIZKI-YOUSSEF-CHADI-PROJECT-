//DATA MANAGEMENT 
let products = JSON.parse(localStorage.getItem("products")) || [];
let categories = JSON.parse(localStorage.getItem("categories")) || ["Informatique", "Accessoires"];
let chartInstance = null;

 //SPA NAVIGATION
function showModule(id, el) {
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    el.classList.add('active');
    if(id === 'dashboard') updateDashboard();
}

//CATEGORY LOGIC
function renderCategories() {
    const sel = document.getElementById("pcat");
    const ul = document.getElementById("catList");
    sel.innerHTML = ""; ul.innerHTML = "";
    categories.forEach((c, i) => {
        sel.innerHTML += `<option value="${c}">${c}</option>`;
        ul.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">${c}
            <button class="btn btn-sm btn-outline-danger border-0" onclick="delCat(${i})"><i class="fas fa-trash"></i></button></li>`;
    });
    localStorage.setItem("categories", JSON.stringify(categories));
}

function addCategory(e) {
    e.preventDefault();
    const input = document.getElementById("catName");
    if(input.value.trim()) {
        categories.push(input.value.trim());
        input.value = "";
        renderCategories();
    }
}

function delCat(i) {
    categories.splice(i, 1);
    renderCategories();
}

//PRODUCT CRUD 
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
    renderProducts();
};

function renderProducts(filter = "") {
    const list = document.getElementById("productList");
    list.innerHTML = "";
    products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
    .forEach(p => {
        list.innerHTML += `<tr>
            <td><div class="fw-bold">${p.name}</div><div class="small text-muted">${p.cat}</div></td>
            <td>${p.price.toFixed(2)} €</td>
            <td><span class="badge ${p.qty < 5 ? 'bg-danger':'bg-success'} rounded-pill">${p.qty}</span></td>
            <td>
                <button class="btn btn-sm btn-light text-primary" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-light text-danger" onclick="delProduct(${p.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });
    updateDashboard();
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
    if(confirm("Supprimer ?")) {
        products = products.filter(x => x.id != id);
        localStorage.setItem("products", JSON.stringify(products));
        renderProducts();
    }
}

//DASHBOARD LOGIC
function updateDashboard() {
    document.getElementById("kpiProducts").innerText = products.length;
    document.getElementById("kpiStock").innerText = products.reduce((s,p)=> s + p.qty, 0);
    const totalVal = products.reduce((s,p)=> s + (p.qty * p.price), 0);
    document.getElementById("kpiValue").innerText = totalVal.toLocaleString() + " €";

    const dataMap = {};
    products.forEach(p => dataMap[p.cat] = (dataMap[p.cat] || 0) + p.qty);
    
    const ctx = document.getElementById("chart").getContext('2d');
    if(chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(dataMap),
            datasets: [{ label: 'Stock', data: Object.values(dataMap), backgroundColor: '#6366f1', borderRadius: 5 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

//API LOGIC (Asynchronous & Non-Blocking) 
/* --- API LOGIC (Asynchronous & Non-Blocking) --- */
async function initAPI() {
    const statusEl = document.getElementById("apiStatus");
    const infoEl = document.getElementById("apiInfo");

    try {
        const res = await fetch("https://fakestoreapi.com/products?limit=1");
        if (!res.ok) throw new Error("Fetch failed");
        
        const data = await res.json();
        
        // Update UI to show success
        statusEl.innerHTML = `<i class="fas fa-check-circle text-success"></i> API Connectée`;
        statusEl.className = "badge bg-light text-dark border";
        infoEl.innerHTML = `Flux synchronisé.<br>${data.length} produits externes détectés.`;
        
    } catch (e) {
        // Update UI to show error/offline status
        statusEl.innerHTML = `<i class="fas fa-exclamation-triangle text-danger"></i> Offline`;
        infoEl.innerHTML = "Échec de synchronisation. Mode hors-ligne activé.";
        console.error("API Error:", e);
    }
}

/* --- INITIALIZATION --- */
// This runs as soon as the page finishes loading
window.addEventListener('DOMContentLoaded', () => {
    renderCategories();
    renderProducts();
    initAPI();
    
    // Ensure the chart initializes even if empty
    updateDashboard(); 
});
