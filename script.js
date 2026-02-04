/* -------------------------------
   THEME TOGGLE + CHART TEXT COLOR
--------------------------------*/
const themeBtn = document.getElementById("themeBtn");

function applyChartTheme() {
  const textColor = getComputedStyle(document.body).color;
  Chart.defaults.color = textColor;
}

if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light");
  themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
}
applyChartTheme();

function toggleTheme() {
  document.body.classList.toggle("light");
  localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
  themeBtn.innerHTML = document.body.classList.contains("light")
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';

  applyChartTheme();
  render(); // Re-render charts with new text color
}

themeBtn.onclick = toggleTheme;

/* -------------------------------
   FLOATING LABEL FIX
--------------------------------*/
document.querySelectorAll(".field input, .field select").forEach(el => {
  if (el.value) el.parentElement.classList.add("active");
  el.addEventListener("focus", () => el.parentElement.classList.add("active"));
  el.addEventListener("blur", () => {
    if (!el.value) el.parentElement.classList.remove("active");
  });
});

/* -------------------------------
   GLOBAL STATE
--------------------------------*/
let data = JSON.parse(localStorage.getItem("data")) || [];
let page = 1,
  limit = 5;

let pieChart, barChart;

// Categories
const incomeCats = ["Salary", "Freelance", "Business", "Other Income"];
const expenseCats = ["Food", "Travel", "Rent", "Shopping", "Bills", "Other Expense"];

/* -------------------------------
   CATEGORY AUTO CHANGE
--------------------------------*/
function setCats(type) {
  category.innerHTML = "";
  (type === "expense" ? expenseCats : incomeCats).forEach(c => {
    category.innerHTML += `<option>${c}</option>`;
  });
}
type.onchange = () => setCats(type.value);
setCats("income");

/* -------------------------------
   COMMA FORMAT FOR AMOUNT
--------------------------------*/
amount.oninput = () => {
  amount.value = amount.value
    .replace(/\D/g, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/* -------------------------------
   SUBMIT FORM
--------------------------------*/
form.onsubmit = e => {
  e.preventDefault();
  if (!title.value || !amount.value || !type.value) {
    error.textContent = "Fill all fields";
    return;
  }
  error.textContent = "";

  data.push({
    id: Date.now(),
    title: title.value,
    amount: (type.value === "expense" ? -1 : 1) * parseInt(amount.value.replace(/,/g, "")),
    category: category.value,
    date: date.value ? date.value : new Date().toISOString().slice(0, 10)
  });

  form.reset();
  document.querySelectorAll(".field").forEach(f => f.classList.remove("active"));

  save();
};

/* -------------------------------
   DATE FORMATTING FIX
--------------------------------*/
function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

/* -------------------------------
   FILTER INPUTS
--------------------------------*/
search.oninput =
  monthFilter.onchange =
  typeFilter.onchange =
  categoryFilter.onchange = () => {
    page = 1;
    render();
  };

/* -------------------------------
   RENDER FUNCTION
--------------------------------*/
function render() {
  applyChartTheme();

  let f = data.filter(t =>
    t.title.toLowerCase().includes(search.value.toLowerCase()) &&
    (typeFilter.value === "all" ||
      (typeFilter.value === "income" && t.amount > 0) ||
      (typeFilter.value === "expense" && t.amount < 0)) &&
    (categoryFilter.value === "all" || t.category === categoryFilter.value) &&
    (monthFilter.value === "all" || t.date.slice(0, 7) === monthFilter.value)
  );

  let totalPages = Math.ceil(f.length / limit) || 1;
  page = Math.min(page, totalPages);

  list.innerHTML = "";
  let inc = 0,
    exp = 0,
    cats = {};

  f.forEach(t => {
    t.amount > 0 ? (inc += t.amount) : (exp += t.amount);
    if (t.amount < 0) cats[t.category] = (cats[t.category] || 0) + Math.abs(t.amount);
  });

  f.slice((page - 1) * limit, page * limit).forEach(t => {
    list.innerHTML += `
    <tr>
      <td>${formatDate(t.date)}</td>
      <td>${t.title}</td>
      <td>${t.amount > 0 ? "Income" : "Expense"}</td>
      <td>${t.category}</td>
      <td class="${t.amount > 0 ? "plus" : "minus"}">₹${Math.abs(t.amount).toLocaleString("en-IN")}</td>
      <td>
        <button class="btn delete" onclick="removeTx(${t.id})">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>`;
  });

  balance.textContent = `₹${(inc + exp).toLocaleString("en-IN")}`;
  income.textContent = `₹${inc.toLocaleString("en-IN")}`;
  expense.textContent = `₹${Math.abs(exp).toLocaleString("en-IN")}`;
  pageInfo.textContent = `Page ${page}/${totalPages}`;

  /* -------------------------------
     CHARTS (Theme-Aware)
  --------------------------------*/
  pieChart?.destroy();
  pieChart = new Chart(pie, {
    type: "pie",
    data: {
      labels: Object.keys(cats),
      datasets: [{ data: Object.values(cats) }]
    }
  });

  barChart?.destroy();
  barChart = new Chart(bar, {
    type: "bar",
    data: {
      labels: ["Income", "Expense"],
      datasets: [{ data: [inc, Math.abs(exp)] }]
    },
    options: {
      plugins: { legend: { display: false } }
    }
  });
}

/* -------------------------------
   SAVE + DELETE
--------------------------------*/
function save() {
  localStorage.setItem("data", JSON.stringify(data));
  populateFilters();
  render();
}

function removeTx(id) {
  data = data.filter(t => t.id !== id);
  save();
}

/* -------------------------------
   PAGINATION
--------------------------------*/
function nextPage() {
  page++;
  render();
}
function prevPage() {
  if (page > 1) page--;
  render();
}

/* -------------------------------
   RESET FILTERS
--------------------------------*/
function resetFilters() {
  search.value = "";
  monthFilter.value = "all";
  typeFilter.value = "all";
  categoryFilter.value = "all";
  render();
}

/* -------------------------------
   EXPORT CSV
--------------------------------*/
function exportCSV() {
  let csv = "Date,Title,Type,Category,Amount\n";
  data.forEach(t => {
    csv += `${formatDate(t.date)},${t.title},${t.amount > 0 ? "Income" : "Expense"},${t.category},${t.amount}\n`;
  });

  let a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "expenses.csv";
  a.click();
}

/* -------------------------------
   FILTER OPTIONS POPULATE
--------------------------------*/
function populateFilters() {
  monthFilter.innerHTML = '<option value="all">All Months</option>';
  [...new Set(data.map(t => t.date.slice(0, 7)))].forEach(m => {
    monthFilter.innerHTML += `<option value="${m}">${m}</option>`;
  });

  categoryFilter.innerHTML = '<option value="all">All Categories</option>';
  [...new Set(data.map(t => t.category))].forEach(c => {
    categoryFilter.innerHTML += `<option>${c}</option>`;
  });
}

populateFilters();
render();  