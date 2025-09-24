// checkout.js
const PRODUCT_QTY = {
  "ISRIB A15": ["50 mg", "100 mg", "250 mg", "500 mg", "1 g", "Other (>1 g)"],
  "ISRIB (Original)": ["50 mg", "100 mg", "250 mg", "500 mg", "1 g", "Other (>1 g)"],
  "ZZL-7": ["50 mg", "100 mg", "250 mg", "500 mg", "1 g", "Other (>1 g)"],
  "MPEP Oxalate": ["100 mg", "250 mg", "500 mg", "1 g", "Other (>1 g)"]
};

function $(s){return document.querySelector(s);}

function fillQuantityOptions(product) {
  const qtySel = $("#quantity");
  const wrapOther = $("#quantity-other-wrap");
  const inputOther = $("#quantity-other");

  qtySel.innerHTML = '<option value="" disabled selected>Select quantity</option>';
  (PRODUCT_QTY[product] || []).forEach(v => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    qtySel.appendChild(o);
  });
  wrapOther.style.display = "none";
  inputOther.value = "";
}

function maybeToggleOther() {
  const val = $("#quantity").value;
  const wrapOther = $("#quantity-other-wrap");
  const inputOther = $("#quantity-other");
  const show = val === "Other (>1 g)";
  wrapOther.style.display = show ? "block" : "none";
  inputOther.required = show;
  if (!show) inputOther.value = "";
}

function updateChannelUI() {
  const method = document.querySelector('input[name="channel"]:checked')?.value || "Email";
  const wrap = $("#channel-handle-wrap");
  const label = $("#channel-handle-label");
  const input = $("#channel_handle");
  if (method === "Email") {
    wrap.style.display = "none";
    input.required = false;
    input.value = "";
  } else {
    wrap.style.display = "block";
    input.required = true;
    label.textContent = method + " contact";
    input.placeholder = method === "Telegram" ? "@your_handle" : "Full phone incl. country code";
  }
}

function prefillFromURL() {
  const params = new URLSearchParams(location.search);
  const p = params.get("product"); // значення мають збігатися з варіантами у select
  const q = params.get("qty");     // напр. "1 g" або "500 mg" або число >1 (г)

  if (p && $("#product")) {
    $("#product").value = p;
    fillQuantityOptions(p);
  }
  if (q && $("#quantity")) {
    const opts = Array.from($("#quantity").options).map(o => o.value.toLowerCase());
    const normalized = q.toLowerCase().replace("mg"," mg").replace("g"," g");
    const idx = opts.indexOf(normalized);
    if (idx >= 0) {
      $("#quantity").selectedIndex = idx;
      maybeToggleOther();
    } else {
      const grams = parseFloat(q);
      if (!Number.isNaN(grams) && grams > 1) {
        $("#quantity").value = "Other (>1 g)";
        maybeToggleOther();
        $("#quantity-other").value = grams;
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // форма може бути відсутня на інших сторінках — просто виходимо
  const form = document.querySelector("#checkout-form");
  if (!form) return;

  // init
  document.querySelector("#product")?.addEventListener("change", e => fillQuantityOptions(e.target.value));
  document.querySelector("#quantity")?.addEventListener("change", maybeToggleOther);
  document.querySelectorAll('input[name="channel"]').forEach(r => r.addEventListener("change", updateChannelUI));

  updateChannelUI();
  prefillFromURL();

  // сабміт
  const status = $("#checkout-status");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter || form.querySelector('button[type="submit"]');
    btn.disabled = true;
    status.textContent = "Sending…";

    // зібрати quantity
    let quantity = $("#quantity").value;
    if (quantity === "Other (>1 g)") {
      const g = parseFloat($("#quantity-other").value);
      if (!g || g <= 1) {
        status.textContent = "Please enter valid grams (≥ 1.0 g).";
        btn.disabled = false;
        return;
      }
      quantity = `${g} g`;
    }

    // payload
    const payload = {
      product: $("#product").value,
      quantity,
      full_name: $("#full_name").value.trim(),
      email: $("#email").value.trim(),
      channel: document.querySelector('input[name="channel"]:checked')?.value || "Email",
      channel_handle: $("#channel_handle").value.trim(),
      notes: $("#notes").value.trim(),
      source: "checkout",
      url: location.href
    };

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        status.textContent = "Thanks! We’ll contact you within 4–8 hours.";
        form.reset();
        document.querySelector("#quantity-other-wrap").style.display = "none";
        updateChannelUI();
      } else {
        status.textContent = "Submission failed. Please try again or email isrib.shop@protonmail.com";
      }
    } catch (err) {
      status.textContent = "Network error. Please try again.";
    } finally {
      btn.disabled = false;
    }
  });
});
