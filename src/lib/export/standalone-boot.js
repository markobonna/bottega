/* Standalone export renderer. Classic script, no dependencies: the
 * /api/export-app route inlines this file into the downloaded HTML, where
 * it renders the spec with localStorage-backed records. AI blocks run
 * bring-your-own-key against the Meta API straight from the browser, or
 * fall back to the same manual modes the workshop uses without a key.
 *
 * Render functions are pure (spec/records in, HTML strings out) so the
 * .test.ts beside this file can check them in node. Only boot() and the
 * action handlers touch the DOM, and they never run outside a browser.
 */
(function () {
  "use strict";

  var NS = {};
  var META_BASE = "https://api.meta.ai/v1";
  var SPARK_MODEL = "muse-spark-1.3-contributor";
  var VOICE_MODEL = "muse-voice-transcribe-1.0";
  var IMAGE_MODEL = "muse-image-1.0";

  /* ---------- pure helpers ---------- */

  NS.esc = function (v) {
    return String(v === null || v === undefined ? "" : v).replace(
      /[&<>"']/g,
      function (c) {
        return (
          { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
            c
          ] || c
        );
      },
    );
  };

  NS.collById = function (spec, id) {
    for (var i = 0; i < spec.collections.length; i++) {
      if (spec.collections[i].id === id) return spec.collections[i];
    }
    return null;
  };

  NS.fieldById = function (coll, id) {
    if (!coll) return null;
    for (var i = 0; i < coll.fields.length; i++) {
      if (coll.fields[i].id === id) return coll.fields[i];
    }
    return null;
  };

  NS.recordsFor = function (recordsByColl, collId) {
    return (recordsByColl && recordsByColl[collId]) || [];
  };

  NS.fmtDate = function (iso) {
    if (!iso) return "";
    var d = new Date(String(iso) + "T00:00:00");
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  NS.recordLabel = function (coll, rec) {
    if (!coll) return "Record";
    for (var i = 0; i < coll.fields.length; i++) {
      var f = coll.fields[i];
      if (f.type === "text") {
        var v = rec.data[f.id];
        if (v !== null && v !== undefined && String(v) !== "")
          return String(v);
        break;
      }
    }
    return "Record";
  };

  NS.isPhotoData = function (v) {
    return typeof v === "string" && v.indexOf("data:image/") === 0;
  };

  NS.cellHtml = function (field, value) {
    if (field && field.type === "photo") {
      if (NS.isPhotoData(value)) {
        return (
          '<img class="sa-thumb" src="' +
          NS.esc(value) +
          '" alt="" loading="lazy">'
        );
      }
      return '<span class="sa-ph" aria-hidden="true"></span>';
    }
    if (field && field.type === "choice" && value !== "") {
      return '<span class="sa-chip">' + NS.esc(value) + "</span>";
    }
    if (field && field.type === "date") {
      return "<span>" + NS.esc(NS.fmtDate(value)) + "</span>";
    }
    if (field && field.type === "bool") {
      return "<span>" + (value ? "Yes" : "No") + "</span>";
    }
    if (typeof value === "number") {
      return "<span>" + NS.esc(String(value)) + "</span>";
    }
    if (value === null || value === undefined || value === "") {
      return '<span class="sa-dim">—</span>';
    }
    return "<span>" + NS.esc(value) + "</span>";
  };

  NS.sortRecords = function (records, sort) {
    var out = records.slice();
    if (sort && sort.field) {
      var dir = sort.dir === "asc" ? 1 : -1;
      out.sort(function (a, b) {
        var av = a.data[sort.field];
        var bv = b.data[sort.field];
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        return (av < bv ? -1 : 1) * dir;
      });
    } else {
      out.sort(function (a, b) {
        if (a.id === b.id) return 0;
        return b.id < a.id ? -1 : 1;
      });
    }
    return out;
  };

  NS.uid = function () {
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 10)
    );
  };

  /* ---------- nav + frame ---------- */

  NS.renderNav = function (spec, activeId) {
    var h = '<nav class="sa-tabs" aria-label="Screens">';
    for (var i = 0; i < spec.screens.length; i++) {
      var s = spec.screens[i];
      var on = s.id === activeId;
      h +=
        '<button type="button" data-act="nav" data-id="' +
        NS.esc(s.id) +
        '"' +
        (on ? ' aria-current="page" class="on"' : "") +
        ">" +
        NS.esc(s.icon) +
        " " +
        NS.esc(s.title) +
        "</button>";
    }
    return h + "</nav>";
  };

  NS.frame = function (title, inner) {
    return (
      '<section class="sa-block"><h3>' +
      NS.esc(title) +
      "</h3>" +
      inner +
      "</section>"
    );
  };

  NS.note = function (text) {
    return '<p class="sa-note">' + NS.esc(text) + "</p>";
  };

  NS.err = function (text) {
    if (!text) return "";
    return '<p class="sa-err" role="alert">' + NS.esc(text) + "</p>";
  };

  NS.keyBox = function (blockId, hasKey) {
    if (hasKey) return "";
    return (
      '<form class="sa-key" data-keyform="' +
      NS.esc(blockId) +
      '">' +
      "<label>Meta API key, to run this block here " +
      '<input type="password" name="key" autocomplete="off" ' +
      'placeholder="Paste key — stays in this browser"></label> ' +
      '<button type="submit">Use key</button>' +
      "</form>"
    );
  };

  /* ---------- list ---------- */

  NS.renderList = function (block, coll, records, ui) {
    if (!coll) return NS.frame(block.title, NS.note("Collection gone."));
    var rows = NS.sortRecords(records, block.sort);
    if (rows.length === 0) {
      return NS.frame(block.title, NS.note("Nothing here yet."));
    }
    var h = '<ol class="sa-list">';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var open = ui && ui.expanded === r.id;
      h += '<li><button type="button" data-act="expand" data-id="' +
        NS.esc(block.id) + ":" + NS.esc(r.id) + '" aria-expanded="' +
        (open ? "true" : "false") + '">';
      for (var k = 0; k < block.show.length; k++) {
        var f = NS.fieldById(coll, block.show[k]);
        h +=
          '<span class="sa-cell">' +
          NS.cellHtml(f, r.data[block.show[k]]) +
          "</span>";
      }
      h += "</button>";
      if (open) {
        h += '<dl class="sa-full">';
        for (var j = 0; j < coll.fields.length; j++) {
          var cf = coll.fields[j];
          h += "<dt>" + NS.esc(cf.name) + "</dt><dd>" +
            NS.cellHtml(cf, r.data[cf.id]) + "</dd>";
        }
        h += "</dl>";
        h +=
          '<button type="button" class="sa-danger" data-act="del" data-id="' +
          NS.esc(coll.id) + ":" + NS.esc(r.id) + '">Delete</button>';
      }
      h += "</li>";
    }
    return NS.frame(block.title, h + "</ol>");
  };

  /* ---------- form ---------- */

  NS.fieldInput = function (coll, field, value) {
    var name = 'name="' + NS.esc(field.id) + '"';
    var v = value === null || value === undefined ? "" : value;
    if (field.type === "number") {
      return (
        '<input type="number" step="any" inputmode="decimal" ' +
        name + ' value="' + NS.esc(v) + '">'
      );
    }
    if (field.type === "date") {
      return '<input type="date" ' + name + ' value="' + NS.esc(v) + '">';
    }
    if (field.type === "choice") {
      var h = "<select " + name + '><option value="">—</option>';
      for (var i = 0; i < (field.options || []).length; i++) {
        var o = field.options[i];
        h += '<option value="' + NS.esc(o) + '"' +
          (v === o ? " selected" : "") + ">" + NS.esc(o) + "</option>";
      }
      return h + "</select>";
    }
    if (field.type === "bool") {
      return (
        '<input type="checkbox" ' + name + (v ? " checked" : "") + ">"
      );
    }
    if (field.type === "photo") {
      var prev = NS.isPhotoData(v)
        ? '<img class="sa-thumb" src="' + NS.esc(v) + '" alt="">'
        : "";
      return (
        prev +
        '<input type="file" accept="image/*" data-photo="' +
        NS.esc(field.id) + '">'
      );
    }
    return (
      '<input type="text" ' + name + ' value="' + NS.esc(v) + '">'
    );
  };

  NS.renderForm = function (block, coll, ui) {
    if (!coll) return NS.frame(block.title, NS.note("Collection gone."));
    var values = (ui && ui.values) || {};
    var h = '<form data-form="' + NS.esc(block.id) + '" data-coll="' +
      NS.esc(coll.id) + '">';
    for (var i = 0; i < block.fields.length; i++) {
      var f = NS.fieldById(coll, block.fields[i]);
      if (!f) continue;
      h += '<label class="sa-field"><span>' + NS.esc(f.name) + "</span>" +
        NS.fieldInput(coll, f, values[f.id]) + "</label>";
    }
    h += '<button type="submit">' + NS.esc(block.submitLabel) + "</button>";
    if (ui && ui.saved) h += '<p class="sa-ok">Saved.</p>';
    return NS.frame(block.title, h + NS.err(ui && ui.error) + "</form>");
  };

  /* ---------- stat ---------- */

  NS.statValue = function (records, field, agg) {
    if (agg === "count") return records.length;
    var nums = [];
    for (var i = 0; i < records.length; i++) {
      var n = Number(records[i].data[field]);
      if (!isNaN(n)) nums.push(n);
    }
    if (nums.length === 0) return null;
    if (agg === "sum") {
      var s = 0;
      for (var k = 0; k < nums.length; k++) s += nums[k];
      return s;
    }
    if (agg === "avg") {
      var t = 0;
      for (var m = 0; m < nums.length; m++) t += nums[m];
      return Math.round((t / nums.length) * 100) / 100;
    }
    return nums[nums.length - 1];
  };

  NS.sparkPath = function (values, w, h) {
    if (values.length === 0) return "";
    var min = values[0];
    var max = values[0];
    for (var i = 1; i < values.length; i++) {
      if (values[i] < min) min = values[i];
      if (values[i] > max) max = values[i];
    }
    var span = max - min || 1;
    var pts = [];
    for (var k = 0; k < values.length; k++) {
      var x = values.length === 1
        ? w / 2
        : 8 + (k / (values.length - 1)) * (w - 16);
      var y = h - 8 - ((values[k] - min) / span) * (h - 16);
      pts.push(x.toFixed(1) + "," + y.toFixed(1));
    }
    return pts.join(" ");
  };

  NS.renderStat = function (block, coll, records) {
    if (!coll) return NS.frame(block.title, NS.note("Collection gone."));
    var val = NS.statValue(records, block.field, block.agg);
    var big = val === null ? "—" : String(val);
    var h = '<p class="sa-big">' + NS.esc(big) + "</p>";
    if (block.chart === "line") {
      var nums = [];
      var rows = NS.sortRecords(records, null).reverse().slice(-14);
      for (var i = 0; i < rows.length; i++) {
        var n = Number(rows[i].data[block.field]);
        if (!isNaN(n)) nums.push(n);
      }
      if (nums.length > 0) {
        h +=
          '<svg class="sa-spark" viewBox="0 0 320 90" role="img" aria-label="From ' +
          NS.esc(String(nums[0])) + " to " +
          NS.esc(String(nums[nums.length - 1])) +
          '"><polyline points="' + NS.sparkPath(nums, 320, 90) +
          '" fill="none" stroke-width="2.5"/></svg>';
      }
    }
    return NS.frame(block.title, h);
  };

  /* ---------- price ---------- */

  NS.quote = function (rec, lines) {
    var items = [];
    var total = 0;
    for (var i = 0; i < lines.length; i++) {
      var qty = Number((rec && rec.data && rec.data[lines[i].field]) || 0);
      if (!qty) continue;
      var cents = Math.round(Number(lines[i].rate) * 100) * qty;
      total += cents;
      items.push({
        label: lines[i].label,
        qty: qty,
        rate: Number(lines[i].rate),
        unit: lines[i].unit,
        cents: cents,
      });
    }
    return { items: items, total: total };
  };

  NS.money = function (cents, currency) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
      }).format(cents / 100);
    } catch (e) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(cents / 100);
    }
  };

  NS.renderPrice = function (block, coll, records, ui) {
    if (!coll) return NS.frame(block.title, NS.note("Collection gone."));
    var rows = NS.sortRecords(records, null);
    if (rows.length === 0) {
      return NS.frame(block.title, NS.note("Nothing here yet."));
    }
    var sel = (ui && ui.sel) || rows[0].id;
    var rec = rows[0];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id === sel) rec = rows[i];
    }
    var q = NS.quote(rec, block.lines);
    var h = '<label class="sa-field"><span>Record</span><select data-chg="sel:' +
      NS.esc(block.id) + '">';
    for (var k = 0; k < rows.length; k++) {
      h += '<option value="' + NS.esc(rows[k].id) + '"' +
        (rows[k].id === rec.id ? " selected" : "") + ">" +
        NS.esc(NS.recordLabel(coll, rows[k])) + "</option>";
    }
    h += "</select></label>";
    h +=
      '<table class="sa-table"><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>';
    for (var m = 0; m < q.items.length; m++) {
      var it = q.items[m];
      h += "<tr><td>" + NS.esc(it.label) + "</td><td>" +
        NS.esc(String(it.qty)) + "</td><td>" +
        NS.esc(NS.money(Math.round(it.rate * 100), block.currency)) + " " +
        NS.esc(it.unit) + "</td><td>" +
        NS.esc(NS.money(it.cents, block.currency)) + "</td></tr>";
    }
    h += "</tbody></table>";
    h += '<p class="sa-big">' + NS.esc(NS.money(q.total, block.currency)) +
      "</p>";
    h +=
      '<button type="button" data-act="copy" data-id="' +
      NS.esc(block.id) + ":" + NS.esc(rec.id) + '">Copy quote</button>';
    if (ui && ui.copied) h += '<p class="sa-ok">Copied.</p>';
    h += NS.note("Rates change in your Bottega workshop.");
    return NS.frame(block.title, h);
  };

  /* ---------- compare ---------- */

  NS.photoImg = function (value, alt) {
    if (NS.isPhotoData(value)) {
      return (
        '<img class="sa-photo" src="' + NS.esc(value) + '" alt="' +
        NS.esc(alt) + '" loading="lazy">'
      );
    }
    return '<span class="sa-ph sa-ph-lg" aria-hidden="true"></span>';
  };

  NS.renderCompare = function (block, coll, records, ui) {
    if (!coll) return NS.frame(block.title, NS.note("Collection gone."));
    var rows = NS.sortRecords(records, null);
    if (rows.length === 0) {
      return NS.frame(block.title, NS.note("Nothing here yet."));
    }
    var sel = (ui && ui.sel) || rows[0].id;
    var rec = rows[0];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id === sel) rec = rows[i];
    }
    var h = '<label class="sa-field"><span>Record</span><select data-chg="sel:' +
      NS.esc(block.id) + '">';
    for (var k = 0; k < rows.length; k++) {
      h += '<option value="' + NS.esc(rows[k].id) + '"' +
        (rows[k].id === rec.id ? " selected" : "") + ">" +
        NS.esc(NS.recordLabel(coll, rows[k])) + "</option>";
    }
    h += "</select></label>";
    var cap = block.caption ? rec.data[block.caption] : "";
    if (cap) h += "<h4>" + NS.esc(cap) + "</h4>";
    h += '<div class="sa-pair"><figure><figcaption>Before</figcaption>' +
      NS.photoImg(rec.data[block.before], "Before") +
      "</figure><figure><figcaption>After</figcaption>" +
      NS.photoImg(rec.data[block.after], "After") + "</figure></div>";
    h += NS.note("Photos added in the workshop stay there; new photos attach here.");
    return NS.frame(block.title, h);
  };

  /* ---------- see (manual counts: the real no-key fallback) ---------- */

  NS.renderSee = function (block, ui) {
    var st = ui || {};
    var h = "";
    if (st.photo) {
      h += NS.photoImg(st.photo, "Counted photo");
    }
    h += '<label class="sa-field"><span>Take or choose a photo</span>' +
      '<input type="file" accept="image/*" data-photo-block="' +
      NS.esc(block.id) + '"></label>';
    for (var i = 0; i < block.nouns.length; i++) {
      var n = block.nouns[i];
      var c = st.counts && st.counts[n] !== undefined ? st.counts[n] : "";
      h += '<label class="sa-field"><span>' + NS.esc(n) +
        '</span><input type="number" min="0" step="1" data-count="' +
        NS.esc(block.id) + ":" + NS.esc(n) + '" value="' + NS.esc(c) +
        '"></label>';
    }
    if (block.saveTo) {
      h += '<button type="button" data-act="savesee" data-id="' +
        NS.esc(block.id) + '">Save counts</button>';
    }
    if (st.saved) h += '<p class="sa-ok">Saved.</p>';
    h += NS.err(st.error);
    h += NS.note(
      "Counting by eye in this file — the camera counting runs in your Bottega workshop.",
    );
    return NS.frame(block.title, h);
  };

  /* ---------- hear ---------- */

  NS.renderHear = function (block, coll, ui) {
    if (!coll) return NS.frame(block.title, NS.note("Collection gone."));
    var st = ui || {};
    var h = '<p class="sa-hint">' + NS.esc(block.hint) + "</p>";
    h += NS.keyBox(block.id, !!st.hasKey);
    if (st.hasKey) {
      h +=
        '<button type="button" data-act="talk" data-id="' +
        NS.esc(block.id) + '" aria-pressed="' + (st.rec ? "true" : "false") +
        '">' + (st.rec ? "Stop" : "Hold to talk") + "</button>";
      if (st.rec) h += '<p class="sa-note">Listening…</p>';
    }
    if (st.transcript) {
      h += "<blockquote>" + NS.esc(st.transcript) + "</blockquote>";
    }
    h += NS.err(st.error);
    var inner = NS.renderForm(
      {
        id: block.id,
        title: block.title,
        type: "form",
        collection: block.collection,
        fields: block.fields,
        submitLabel: "Save",
      },
      coll,
      { values: st.values || {}, saved: st.saved },
    );
    // renderForm wraps its own section; reuse just the form half.
    var cut = inner.indexOf("<form");
    var formOnly = cut >= 0 ? inner.slice(cut, inner.lastIndexOf("</section>")) : inner;
    h += formOnly;
    if (!st.hasKey) {
      h += NS.note(
        "Voice runs with a Meta key above, or type it in — same form either way.",
      );
    }
    return NS.frame(block.title, h);
  };

  /* ---------- draw ---------- */

  NS.drawPrompt = function (template, rec) {
    return (
      String(template).replace(/\{([^{}]+)\}/g, function (_, fid) {
        var v = rec.data[fid.trim()];
        if (v === null || v === undefined) return "";
        return String(v).replace(/[{}\n]/g, " ").slice(0, 120);
      }) + ", no text, no logos, no people's faces"
    );
  };

  NS.renderDraw = function (block, coll, records, ui) {
    if (!coll) return NS.frame(block.title, NS.note("Collection gone."));
    var st = ui || {};
    var rows = NS.sortRecords(records, null).slice(0, 6);
    var h = NS.keyBox(block.id, !!st.hasKey) + NS.err(st.error);
    h += '<div class="sa-grid">';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var title = r.data[block.titleField] || "Untitled";
      h += '<div class="sa-card">' + NS.photoImg(r.data[block.imageField], title);
      h += "<strong>" + NS.esc(title) + "</strong>";
      if (st.hasKey) {
        h +=
          '<button type="button" data-act="draw" data-id="' +
          NS.esc(block.id) + ":" + NS.esc(r.id) + '"' +
          (st.busy === r.id ? " disabled" : "") + ">" +
          (st.busy === r.id ? "Drawing…" : r.data[block.imageField] ? "Draw again" : "Draw it") +
          "</button>";
      }
      h += "</div>";
    }
    h += "</div>";
    if (!st.hasKey) {
      h += NS.note("Pictures draw with a Meta key above.");
    }
    return NS.frame(block.title, h);
  };

  /* ---------- teach / make: workshop-only, stated plainly ---------- */

  NS.renderTeach = function (block) {
    var h = "<p><strong>" + NS.esc(block.question) + "</strong></p>";
    h += '<p class="sa-note">“' + NS.esc(block.labels[0]) + "” or “" +
      NS.esc(block.labels[1]) + "” — judged on ";
    var dims = [];
    for (var i = 0; i < block.dims.length; i++) dims.push(block.dims[i].name);
    h += NS.esc(dims.join(", ")) + ".</p>";
    h += NS.note(
      "This block trains in your Bottega workshop. This file carries your data, not the trainer.",
    );
    return NS.frame(block.title, h);
  };

  NS.renderMake = function (block) {
    var d = block.defaults || {};
    var h = '<dl class="sa-full">';
    var keys = ["width", "height", "depth", "shelves", "thickness"];
    for (var i = 0; i < keys.length; i++) {
      h += "<dt>" + NS.esc(keys[i]) + "</dt><dd>" +
        NS.esc(String(d[keys[i]] === undefined ? "—" : d[keys[i]])) +
        (keys[i] === "shelves" ? "" : " mm") + "</dd>";
    }
    h += "</dl>";
    h += NS.note(
      "The shelf planner lives in your Bottega workshop; these are the saved dimensions.",
    );
    return NS.frame(block.title, h);
  };

  NS.renderUnknown = function (block) {
    return NS.frame(
      block.title,
      NS.note("This block isn't in this file (" + block.type + ")."),
    );
  };

  /* ---------- dispatch ---------- */

  NS.renderBlock = function (block, ctx) {
    var coll = block.collection ? NS.collById(ctx.spec, block.collection) : null;
    var recs = coll ? NS.recordsFor(ctx.records, coll.id) : [];
    var ui = (ctx.ui && ctx.ui[block.id]) || {};
    if (block.type === "see" && block.saveTo) {
      coll = NS.collById(ctx.spec, block.saveTo.collection);
    }
    switch (block.type) {
      case "list":
        return NS.renderList(block, coll, recs, ui);
      case "form":
        return NS.renderForm(block, coll, ui);
      case "stat":
        return NS.renderStat(block, coll, recs);
      case "see":
        return NS.renderSee(block, ui);
      case "hear":
        return NS.renderHear(block, coll, ui);
      case "price":
        return NS.renderPrice(block, coll, recs, ui);
      case "compare":
        return NS.renderCompare(block, coll, recs, ui);
      case "teach":
        return NS.renderTeach(block);
      case "draw":
        return NS.renderDraw(block, coll, recs, ui);
      case "make":
        return NS.renderMake(block);
      default:
        return NS.renderUnknown(block);
    }
  };

  NS.renderScreen = function (spec, screenId, ctx) {
    var screen = spec.screens[0] || null;
    for (var i = 0; i < spec.screens.length; i++) {
      if (spec.screens[i].id === screenId) screen = spec.screens[i];
    }
    if (!screen) return NS.note("No screens.");
    var h = "";
    for (var k = 0; k < screen.blocks.length; k++) {
      h += NS.renderBlock(screen.blocks[k], ctx);
    }
    return h;
  };

  NS.renderApp = function (spec, activeId, ctx) {
    return NS.renderNav(spec, activeId) + NS.renderScreen(spec, activeId, ctx);
  };

  /* ---------- wav encode (port of src/lib/wav.ts) ---------- */

  NS.downmix = function (channels) {
    if (channels.length === 0) return new Float32Array(0);
    var out = new Float32Array(channels[0].length);
    for (var i = 0; i < out.length; i++) {
      var sum = 0;
      for (var c = 0; c < channels.length; c++) sum += channels[c][i] || 0;
      out[i] = sum / channels.length;
    }
    return out;
  };

  NS.encodeWav = function (samples, sampleRate) {
    var dataLen = samples.length * 2;
    var buf = new ArrayBuffer(44 + dataLen);
    var view = new DataView(buf);
    var text = function (at, s) {
      for (var i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
    };
    text(0, "RIFF");
    view.setUint32(4, 36 + dataLen, true);
    text(8, "WAVE");
    text(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, "data");
    view.setUint32(40, dataLen, true);
    for (var i = 0; i < samples.length; i++) {
      var s = samples[i] < -1 ? -1 : samples[i] > 1 ? 1 : samples[i];
      view.setInt16(44 + i * 2, Math.round(s * 32767), true);
    }
    return new Uint8Array(buf);
  };

  /* Sniff base64 magic for a data-URL mime; the image model returns
   * WebP bytes, and browsers need the true type. Defaults to png. */
  NS.sniffDataUrl = function (b64) {
    var bin = "";
    try {
      bin = atob(b64.slice(0, 24));
    } catch (e) {
      return "data:image/png;base64," + b64;
    }
    if (bin.slice(0, 4) === "RIFF" && bin.slice(8, 12) === "WEBP") {
      return "data:image/webp;base64," + b64;
    }
    if (bin.charCodeAt(0) === 0xff && bin.charCodeAt(1) === 0xd8) {
      return "data:image/jpeg;base64," + b64;
    }
    return "data:image/png;base64," + b64;
  };

  /* ---------- browser state + actions (never run in node) ---------- */

  var BROWSER =
    typeof document !== "undefined" && typeof window !== "undefined";
  var SPEC = null;
  var APP_ID = "";
  var VERSION = 1;
  var records = {};
  var UI = {};
  var API_KEY = "";
  var ACTIVE = null;
  var PENDING_PHOTOS = {};
  var RECORDER = null;

  function storeKey(suffix) {
    return "bottega-sa-" + APP_ID + ":" + suffix;
  }

  function loadPersisted(seed) {
    try {
      var raw = window.localStorage.getItem(storeKey("records"));
      if (raw) {
        records = JSON.parse(raw);
        API_KEY = window.localStorage.getItem(storeKey("key")) || "";
        return;
      }
    } catch (e) {
      /* fall through to seed */
    }
    records = seed || {};
    API_KEY = "";
  }

  function saveRecords() {
    try {
      window.localStorage.setItem(storeKey("records"), JSON.stringify(records));
    } catch (e) {
      /* storage full or blocked: the file still works this session */
    }
  }

  function saveKey() {
    try {
      window.localStorage.setItem(storeKey("key"), API_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function blockUi(id) {
    if (!UI[id]) UI[id] = {};
    return UI[id];
  }

  function findBlock(id) {
    for (var s = 0; s < SPEC.screens.length; s++) {
      var blocks = SPEC.screens[s].blocks;
      for (var b = 0; b < blocks.length; b++) {
        if (blocks[b].id === id) return blocks[b];
      }
    }
    return null;
  }

  function ctx() {
    var ui = {};
    for (var s = 0; s < SPEC.screens.length; s++) {
      var blocks = SPEC.screens[s].blocks;
      for (var b = 0; b < blocks.length; b++) {
        var id = blocks[b].id;
        ui[id] = UI[id] || {};
        if (blocks[b].type === "hear" || blocks[b].type === "draw") {
          ui[id].hasKey = !!API_KEY;
        }
      }
    }
    return { spec: SPEC, records: records, ui: ui };
  }

  function draw() {
    var root = document.getElementById("sa-root");
    if (!root || !SPEC) return;
    root.innerHTML = NS.renderApp(SPEC, ACTIVE, ctx());
  }

  function setScreen(id) {
    ACTIVE = id;
    try {
      window.location.hash = "s=" + encodeURIComponent(id);
    } catch (e) {
      /* ignore */
    }
    draw();
  }

  function addRecord(collId, data) {
    if (!records[collId]) records[collId] = [];
    var rec = { id: NS.uid(), data: data };
    records[collId].push(rec);
    saveRecords();
    return rec;
  }

  function apiError(err, ui) {
    if (err && err.status === 401) {
      ui.error = "That key didn't work. Check it and try again.";
    } else if (err && err.status === 429) {
      ui.error = "Too many requests at once. Try again in a moment.";
    } else {
      ui.error =
        "The model API refused the browser call (network or CORS). " +
        "This block runs fully in your Bottega workshop.";
    }
  }

  function metaFetch(path, body, isForm) {
    var headers = { Authorization: "Bearer " + API_KEY };
    if (!isForm) headers["Content-Type"] = "application/json";
    var ctrl = new AbortController();
    var timer = window.setTimeout(function () {
      ctrl.abort();
    }, 55000);
    return window
      .fetch(META_BASE + path, {
        method: "POST",
        headers: headers,
        body: isForm ? body : JSON.stringify(body),
        signal: ctrl.signal,
      })
      .then(function (res) {
        window.clearTimeout(timer);
        if (!res.ok) throw { status: res.status };
        return res.json();
      });
  }

  function transcribe(wavBlob) {
    var form = new FormData();
    form.append(
      "request",
      new Blob(
        [
          JSON.stringify({
            model: VOICE_MODEL,
            audioEncoding: "WAV",
            mode: "PUSH_TO_TALK",
          }),
        ],
        { type: "application/json" },
      ),
    );
    form.append("audio", wavBlob, "audio.wav");
    return metaFetch("/asr/transcribe", form, true).then(function (body) {
      if (!body || typeof body.transcript !== "string" || !body.transcript) {
        throw { status: 502 };
      }
      return body.transcript;
    });
  }

  function fillFromSpeech(coll, fieldIds, transcript) {
    var today = new Date().toISOString().slice(0, 10);
    var wanted = fieldIds.join(", ");
    return metaFetch("/chat/completions", {
      model: SPARK_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Fill in the form from what the person said. Use null for anything they didn't say. " +
            "Today is " + today + "; resolve 'tomorrow', 'Friday' to dates. " +
            "Reply with only a JSON object mapping these field ids to values: " +
            wanted + ". No other text.",
        },
        { role: "user", content: transcript },
      ],
      max_tokens: 800,
    }).then(function (body) {
      var content =
        body && body.choices && body.choices[0] &&
        body.choices[0].message && body.choices[0].message.content;
      if (typeof content !== "string" || !content) throw { status: 502 };
      var parsed = JSON.parse(content);
      var values = {};
      for (var i = 0; i < fieldIds.length; i++) {
        var fid = fieldIds[i];
        var f = NS.fieldById(coll, fid);
        var v = parsed[fid];
        if (v === null || v === undefined) {
          values[fid] = "";
          continue;
        }
        if (!f || f.type === "photo") {
          values[fid] = "";
          continue;
        }
        if (f.type === "number") {
          var n = Number(v);
          values[fid] = isNaN(n) ? "" : n;
        } else if (f.type === "bool") {
          values[fid] = v === true || v === "true";
        } else if (f.type === "choice") {
          values[fid] = (f.options || []).indexOf(v) >= 0 ? v : "";
        } else {
          values[fid] = String(v);
        }
      }
      return values;
    });
  }

  function recordWav(blockId) {
    var ui = blockUi(blockId);
    if (RECORDER) {
      try {
        RECORDER.stop();
      } catch (e) {
        /* ignore */
      }
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      ui.error = "This browser can't reach a microphone.";
      draw();
      return;
    }
    ui.error = "";
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        var chunks = [];
        var mr;
        try {
          mr = new MediaRecorder(stream);
        } catch (e) {
          ui.error = "This browser can't record audio.";
          draw();
          return;
        }
        var stopped = false;
        var finish = function () {
          if (stopped) return;
          stopped = true;
          RECORDER = null;
          ui.rec = false;
          try {
            mr.stop();
          } catch (e) {
            /* ignore */
          }
          stream.getTracks().forEach(function (t) {
            t.stop();
          });
        };
        RECORDER = { stop: finish };
        var hardStop = window.setTimeout(finish, 60000);
        mr.onstop = function () {
          window.clearTimeout(hardStop);
          decodeAndUse(blockId, new Blob(chunks), stream);
        };
        mr.ondataavailable = function (ev) {
          if (ev.data && ev.data.size > 0) chunks.push(ev.data);
        };
        ui.rec = true;
        ui.transcript = "";
        ui.values = {};
        draw();
        mr.start();
      })
      .catch(function () {
        ui.error = "Microphone blocked: allow it in the browser settings.";
        draw();
      });
  }

  function decodeAndUse(blockId, blob, stream) {
    var ui = blockUi(blockId);
    ui.busy = true;
    draw();
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      ui.busy = false;
      ui.error = "This browser can't decode audio.";
      draw();
      return;
    }
    blob.arrayBuffer().then(function (buf) {
      var ac = new AC();
      ac.decodeAudioData(
        buf,
        function (decoded) {
          var chans = [];
          for (var c = 0; c < decoded.numberOfChannels; c++) {
            chans.push(decoded.getChannelData(c));
          }
          var mono = NS.downmix(chans);
          if (mono.length === 0) {
            ui.busy = false;
            ui.error = "That recording was empty. Try again.";
            draw();
            return;
          }
          var targetLen = Math.floor((mono.length * 16000) / decoded.sampleRate);
          var off = new OfflineAudioContext(1, targetLen, 16000);
          var src = off.createBufferSource();
          var ob = off.createBuffer(1, mono.length, decoded.sampleRate);
          ob.getChannelData(0).set(mono);
          src.buffer = ob;
          src.connect(off.destination);
          src.start();
          off.startRendering().then(function (rendered) {
            var wav = NS.encodeWav(rendered.getChannelData(0), 16000);
            var wavBlob = new Blob([wav], { type: "audio/wav" });
            var block = findBlock(blockId);
            var coll = block ? NS.collById(SPEC, block.collection) : null;
            transcribe(wavBlob).then(function (transcript) {
              ui.transcript = transcript;
              if (!coll) {
                ui.busy = false;
                draw();
                return;
              }
              fillFromSpeech(coll, block.fields, transcript).then(
                function (values) {
                  ui.busy = false;
                  ui.values = values;
                  draw();
                },
                function (err) {
                  ui.busy = false;
                  apiError(err, ui);
                  draw();
                },
              );
            }, function (err) {
              ui.busy = false;
              apiError(err, ui);
              draw();
            });
          });
        },
        function () {
          ui.busy = false;
          ui.error = "Couldn't read that recording. Try again.";
          draw();
        },
      );
    });
  }

  function drawPicture(blockId, recId) {
    var ui = blockUi(blockId);
    var block = findBlock(blockId);
    var coll = block ? NS.collById(SPEC, block.collection) : null;
    if (!block || !coll) return;
    var recs = NS.recordsFor(records, coll.id);
    var rec = null;
    for (var i = 0; i < recs.length; i++) {
      if (recs[i].id === recId) rec = recs[i];
    }
    if (!rec) return;
    ui.busy = recId;
    ui.error = "";
    draw();
    metaFetch("/images/generations", {
      model: IMAGE_MODEL,
      prompt: NS.drawPrompt(block.promptTemplate, rec),
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    }).then(
      function (body) {
        ui.busy = "";
        var b64 = body && body.data && body.data[0] && body.data[0].b64_json;
        if (typeof b64 !== "string" || !b64) {
          ui.error = "The model didn't send a picture. Try again.";
          draw();
          return;
        }
        rec.data[block.imageField] = NS.sniffDataUrl(b64);
        saveRecords();
        draw();
      },
      function (err) {
        ui.busy = "";
        apiError(err, ui);
        draw();
      },
    );
  }

  function quoteText(block, coll, rec) {
    var q = NS.quote(rec, block.lines);
    var lines = [NS.recordLabel(coll, rec)];
    for (var i = 0; i < q.items.length; i++) {
      var it = q.items[i];
      lines.push(
        it.label + " x" + it.qty + " @ " +
          NS.money(Math.round(it.rate * 100), block.currency) + "/" +
          it.unit + " = " + NS.money(it.cents, block.currency),
      );
    }
    lines.push("Total: " + NS.money(q.total, block.currency));
    return lines.join("\n");
  }

  function coerceForSubmit(coll, form) {
    var data = {};
    var issues = "";
    for (var i = 0; i < coll.fields.length; i++) {
      var f = coll.fields[i];
      var el = form.elements[f.id];
      if (!el) continue;
      if (f.type === "bool") {
        data[f.id] = !!el.checked;
        continue;
      }
      if (f.type === "photo") {
        var pend = PENDING_PHOTOS[form.dataset.form + ":" + f.id];
        data[f.id] = pend || "";
        continue;
      }
      var raw = typeof el.value === "string" ? el.value : "";
      if (raw === "") {
        data[f.id] = null;
        continue;
      }
      if (f.type === "number") {
        var n = Number(raw);
        if (isNaN(n)) {
          issues = f.name + " needs a number.";
          break;
        }
        data[f.id] = n;
        continue;
      }
      if (f.type === "choice" && (f.options || []).indexOf(raw) < 0) {
        issues = f.name + " isn't one of the options.";
        break;
      }
      data[f.id] = raw;
    }
    return { data: data, issues: issues };
  }

  function readFile(file, done) {
    var fr = new FileReader();
    fr.onload = function () {
      done(typeof fr.result === "string" ? fr.result : "");
    };
    fr.onerror = function () {
      done("");
    };
    fr.readAsDataURL(file);
  }

  function onClick(ev) {
    var t = ev.target;
    while (t && t !== document && !t.dataset) t = t.parentNode;
    while (t && t !== document && !t.dataset.act) t = t.parentNode;
    if (!t || t === document) return;
    var act = t.dataset.act;
    var id = t.dataset.id || "";
    if (act === "nav") {
      setScreen(id);
      return;
    }
    if (act === "expand") {
      var parts = id.split(":");
      var lui = blockUi(parts[0]);
      lui.expanded = lui.expanded === parts[1] ? "" : parts[1];
      draw();
      return;
    }
    if (act === "del") {
      var dp = id.split(":");
      var arr = records[dp[0]] || [];
      records[dp[0]] = arr.filter(function (r) {
        return r.id !== dp[1];
      });
      saveRecords();
      draw();
      return;
    }
    if (act === "copy") {
      var cp = id.split(":");
      var block = findBlock(cp[0]);
      var coll = block ? NS.collById(SPEC, block.collection) : null;
      var recs = coll ? NS.recordsFor(records, coll.id) : [];
      var rec = null;
      for (var i = 0; i < recs.length; i++) {
        if (recs[i].id === cp[1]) rec = recs[i];
      }
      if (!block || !coll || !rec) return;
      var text = quoteText(block, coll, rec);
      var cui = blockUi(cp[0]);
      var done = function () {
        cui.copied = true;
        draw();
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } catch (e) {
          /* ignore */
        }
        document.body.removeChild(ta);
        done();
      }
      return;
    }
    if (act === "savesee") {
      var sblock = findBlock(id);
      var sui = blockUi(id);
      if (!sblock || !sblock.saveTo) return;
      var data = {};
      var bad = "";
      for (var n = 0; n < sblock.nouns.length; n++) {
        var noun = sblock.nouns[n];
        // Scan by attribute: nouns with quotes would break a selector.
        var input = null;
        var all = document.querySelectorAll('input[data-count^="' + id + ':"]');
        for (var a = 0; a < all.length; a++) {
          if (all[a].getAttribute("data-count") === id + ":" + noun) {
            input = all[a];
            break;
          }
        }
        var raw = input ? input.value : "";
        var num = raw === "" ? 0 : Number(raw);
        if (isNaN(num) || num < 0) {
          bad = "“" + noun + "” needs a count of 0 or more.";
          break;
        }
        var fid = sblock.saveTo.counts[noun];
        if (fid) data[fid] = num;
      }
      if (bad) {
        sui.error = bad;
        sui.saved = false;
        draw();
        return;
      }
      if (sblock.saveTo.photo) data[sblock.saveTo.photo] = sui.photo || "";
      addRecord(sblock.saveTo.collection, data);
      sui.saved = true;
      sui.error = "";
      draw();
      return;
    }
    if (act === "talk") {
      recordWav(id);
      return;
    }
    if (act === "draw") {
      var drp = id.split(":");
      drawPicture(drp[0], drp[1]);
    }
  }

  function onChange(ev) {
    var t = ev.target;
    if (!t || !t.dataset) return;
    if (t.dataset.chg && t.dataset.chg.indexOf("sel:") === 0) {
      var bid = t.dataset.chg.slice(4);
      blockUi(bid).sel = t.value;
      blockUi(bid).copied = false;
      draw();
      return;
    }
    if (t.dataset.photo && t.files && t.files[0]) {
      var form = t.form;
      var key = (form ? form.dataset.form : "?") + ":" + t.dataset.photo;
      var input = t;
      readFile(t.files[0], function (url) {
        PENDING_PHOTOS[key] = url;
        if (url) {
          var img = document.createElement("img");
          img.className = "sa-thumb";
          img.src = url;
          img.alt = "";
          input.parentNode.insertBefore(img, input);
          input.style.display = "none";
        }
      });
      return;
    }
    if (t.dataset.photoBlock && t.files && t.files[0]) {
      var bui = blockUi(t.dataset.photoBlock);
      readFile(t.files[0], function (url) {
        bui.photo = url;
        bui.saved = false;
        draw();
      });
    }
  }

  function onSubmit(ev) {
    var form = ev.target;
    if (!form || !form.dataset) return;
    if (form.dataset.keyform) {
      ev.preventDefault();
      var key = form.elements.key ? form.elements.key.value.trim() : "";
      if (!key) return;
      API_KEY = key;
      saveKey();
      draw();
      return;
    }
    if (!form.dataset.form) return;
    ev.preventDefault();
    var coll = NS.collById(SPEC, form.dataset.coll);
    if (!coll) return;
    var out = coerceForSubmit(coll, form);
    var fui = blockUi(form.dataset.form);
    if (out.issues) {
      fui.error = out.issues;
      fui.saved = false;
      draw();
      return;
    }
    addRecord(coll.id, out.data);
    for (var k in PENDING_PHOTOS) {
      if (k.indexOf(form.dataset.form + ":") === 0) delete PENDING_PHOTOS[k];
    }
    fui.error = "";
    fui.saved = true;
    fui.values = {};
    fui.transcript = "";
    draw();
  }

  function boot() {
    try {
      SPEC = JSON.parse(document.getElementById("sa-spec").textContent || "{}");
      var seed = JSON.parse(document.getElementById("sa-seed").textContent || "{}");
      var meta = document.getElementById("sa-meta");
      APP_ID = (meta && meta.dataset.app) || "app";
      VERSION = Number((meta && meta.dataset.version) || 1);
      loadPersisted(seed);
      var hash = window.location.hash || "";
      var m = hash.match(/s=([^&]+)/);
      var want = m ? decodeURIComponent(m[1]) : null;
      ACTIVE = want || (SPEC.screens[0] && SPEC.screens[0].id) || null;
      document.addEventListener("click", onClick);
      document.addEventListener("change", onChange);
      document.addEventListener("submit", onSubmit);
      draw();
    } catch (e) {
      var root = document.getElementById("sa-root");
      if (root) root.textContent = "This file didn't load its app data.";
    }
  }

  if (BROWSER) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }

  if (typeof window !== "undefined") window.BottegaStandalone = NS;
  if (typeof module !== "undefined" && module.exports) module.exports = NS;
})();
