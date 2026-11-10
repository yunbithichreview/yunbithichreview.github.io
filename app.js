// ====== CẤU HÌNH: chỉ cần sửa 2 dòng dưới ======
var SHEET_ID = "1Ank-ihWggfVYQhSVVIehM5MYIdlfFNzstD40FDgebqU"; // ID Google Sheet "SP AFFILIATE"
var SHEET_TAB = "sanpham";                                      // tên tab trong Sheet
// =================================================

var SITE = {
  name: "Yunbi Review",
  tiktok: "https://www.tiktok.com/@yunbireview",
  blurbs: {
    "Skincare cho da nhạy cảm": "Da mình dễ đỏ nên món nào lên đây là đã dùng ít nhất vài tháng.",
    "Nhà có chó": "Bộ đồ giúp nhà nuôi chó trong chung cư vẫn sạch và thơm.",
    "Nhà cửa và giải trí": "Những món nhỏ làm căn phòng nhỏ dễ chịu hơn.",
    "Gợi ý quà tặng": "Quà mình đã tặng thật và được khen."
  }
};

var CSV_URL = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq?tqx=out:csv&sheet=" + encodeURIComponent(SHEET_TAB);

// ---------- tiện ích ----------
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function parseCSV(text) {
  var rows = [], row = [], cell = "", q = false;
  for (var i = 0; i < text.length; i++) {
    var ch = text[i], nx = text[i + 1];
    if (q) {
      if (ch === '"' && nx === '"') { cell += '"'; i++; }
      else if (ch === '"') { q = false; }
      else cell += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\r") { /* bỏ */ }
      else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += ch;
    }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
function splitList(s) {
  return String(s || "").split("|").map(function (x) { return x.trim(); }).filter(Boolean);
}
function imgUrl(v) {
  v = String(v || "").trim();
  if (!v) return "";
  var m = v.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
  if (m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w1200";
  if (/^https?:\/\//i.test(v)) return v;
  return (location.pathname.indexOf("/p/") >= 0 ? "../" : "") + "img/" + v;
}
function slug(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ---------- đọc Sheet ----------
function loadProducts() {
  var src = window.PREVIEW_CSV // chỉ có trong bản xem trước, trang thật luôn đọc Sheet
    ? Promise.resolve(window.PREVIEW_CSV)
    : fetch(CSV_URL, { cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      });
  return src.then(function (text) {
    var rows = parseCSV(text);
    if (rows.length < 2) return [];
    var head = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    function col(name) { // tìm cột theo chữ đầu tiêu đề
      for (var i = 0; i < head.length; i++) if (head[i].indexOf(name) === 0) return i;
      return -1;
    }
    var C = {
      id: col("id"), sec: col("mục"), name: col("tên"), short: col("câu"),
      pros: col("mình thích"), cons: col("lưu ý"), for_: col("hợp"), price: col("giá"),
      link: col("link"), img: col("ảnh"), show: col("hiện")
    };
    var out = [];
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      function g(k) { return C[k] >= 0 ? (r[C[k]] || "").trim() : ""; }
      if (!g("name")) continue;
      var show = g("show").toUpperCase();
      if (show === "FALSE" || show === "0" || show === "KHÔNG") continue;
      out.push({
        id: g("id") || slug(g("name")),
        section: g("sec") || "Khác",
        name: g("name"), short: g("short"),
        pros: splitList(g("pros")), cons: splitList(g("cons")),
        for_: g("for_"), price: g("price"), link: g("link"), image: g("img")
      });
    }
    try { localStorage.setItem("yr_cache", JSON.stringify({ t: Date.now(), p: out })); } catch (e) {}
    return out;
  });
}
function cachedProducts() {
  try {
    var c = JSON.parse(localStorage.getItem("yr_cache") || "null");
    if (c && c.p && c.p.length) return c.p;
  } catch (e) {}
  return null;
}

// ---------- vẽ ----------
function card(p, base) {
  var src = imgUrl(p.image);
  var img = src ? '<img src="' + esc(src) + '" alt="' + esc(p.name) + '" loading="lazy" onerror="this.parentNode.textContent=this.alt">' : esc(p.name);
  return '<a class="card" href="' + base + 'product.html?id=' + encodeURIComponent(p.id) + '">' +
    '<div class="img">' + img + '</div><div class="body"><h3>' + esc(p.name) + '</h3><p>' + esc(p.short) + '</p>' +
    (p.price ? '<span class="price">' + esc(p.price) + '</span>' : "") + '</div></a>';
}

function renderIndex(products) {
  var root = document.getElementById("app");
  if (!products.length) { root.innerHTML = '<p class="empty">Chưa có sản phẩm nào.</p>'; return; }
  var order = [], bySec = {};
  products.forEach(function (p) {
    if (!bySec[p.section]) { bySec[p.section] = []; order.push(p.section); }
    bySec[p.section].push(p);
  });
  var h = '<nav class="sections">';
  order.forEach(function (s) { h += '<a href="#' + slug(s) + '">' + esc(s) + '</a>'; });
  h += "</nav>";
  order.forEach(function (s) {
    h += '<section class="group" id="' + slug(s) + '"><h2>' + esc(s) + "</h2>";
    if (SITE.blurbs[s]) h += '<p class="blurb">' + esc(SITE.blurbs[s]) + "</p>";
    h += '<div class="grid">' + bySec[s].map(function (p) { return card(p, ""); }).join("") + "</div></section>";
  });
  root.innerHTML = h;
}

function renderProduct(products) {
  var root = document.getElementById("app");
  var id = new URLSearchParams(location.search).get("id");
  var p = products.filter(function (x) { return x.id === id; })[0];
  if (!p) { root.innerHTML = '<p class="empty">Không tìm thấy sản phẩm. <a href="index.html">Về trang chủ</a></p>'; return; }
  document.title = p.name + " - review thật từ " + SITE.name;
  var src = imgUrl(p.image);
  var img = src ? '<img src="' + esc(src) + '" alt="' + esc(p.name) + '" onerror="this.parentNode.textContent=this.alt">' : esc(p.name);
  var h = '<a class="back" href="index.html#' + slug(p.section) + '">&larr; ' + esc(p.section) + "</a>";
  h += '<article class="hero"><div class="img">' + img + '</div><div class="body">';
  h += "<h1>" + esc(p.name) + "</h1>";
  if (p.short) h += '<p class="short">' + esc(p.short) + "</p>";
  if (p.price) h += '<div class="price">Giá tham khảo: ' + esc(p.price) + "</div>";
  if (p.link) h += '<a class="btn" href="' + esc(p.link) + '" target="_blank" rel="noopener sponsored">Mua trên Shopee</a>';
  if (SITE.tiktok) h += '<a class="btn ghost" href="' + SITE.tiktok + '" target="_blank" rel="noopener">Xem video review trên TikTok</a>';
  h += '<div class="lists">';
  if (p.pros.length) h += '<h4 class="good">Mình thích</h4><ul>' + p.pros.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
  if (p.cons.length) h += '<h4 class="warn">Lưu ý trước khi mua</h4><ul>' + p.cons.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
  h += "</div>";
  if (p.for_) h += '<p class="for"><strong>Hợp với:</strong> ' + esc(p.for_) + "</p>";
  h += '<p class="note">Đây là trải nghiệm cá nhân của mình, không phải lời khuyên y tế. Da và nhu cầu mỗi người khác nhau.</p>';
  h += "</div></article>";
  var rel = products.filter(function (x) { return x.section === p.section && x.id !== p.id; }).slice(0, 2);
  if (rel.length) h += '<div class="related"><h3>Cùng mục</h3><div class="grid">' + rel.map(function (r) { return card(r, ""); }).join("") + "</div></div>";
  root.innerHTML = h;
}

// ---------- khởi động ----------
(function () {
  var page = document.body.getAttribute("data-page");
  var render = page === "product" ? renderProduct : renderIndex;
  var cached = cachedProducts();
  if (cached) render(cached);
  loadProducts().then(render).catch(function (err) {
    if (!cached) {
      document.getElementById("app").innerHTML =
        '<p class="empty">Chưa đọc được dữ liệu từ Google Sheet. Kiểm tra Sheet đã bật "Bất kỳ ai có đường liên kết" chưa.<br><small>' + esc(err.message) + "</small></p>";
    }
  });
})();
