// Canada Learning Bond eligibility tool: what each child is missing so far, then the
// additional programs. Every Bond rule and amount below was checked on official pages on
// 2026-11-04. Update the income limits each July (ESDC publishes a new notice).
// Names stay in the browser: they are never sent or stored.
(function () {
  // CLB income limits, July 1, 2026 to June 30, 2027 (ESDC Notice #1138).
  // 1 to 3 children: "less than or equal to"; 4 or more: "less than".
  var LIMITS = { 1: 58523, 2: 58523, 3: 58523, 4: 66036, 5: 73577, 6: 81117, 7: 88658, 8: 96198,
    9: 103739, 10: 111279, 11: 118820, 12: 126360, 13: 133901, 14: 141442, 15: 148982, 16: 156523 };

  // Canada Learning Bond: $500 for the first eligible year, then $100 a year up to and
  // including age 15, lifetime maximum $2,000. Must be requested before age 21.
  function bond(age) {
    var years = Math.min(age, 15) + 1;
    return Math.min(500 + 100 * (years - 1), 2000);
  }

  // B.C. Training and Education Savings Grant: $1,200, no contributions needed, applied for
  // between the child's 6th birthday and the day before they turn 9.
  function bctesg(age) { return age >= 6 && age <= 8 ? 1200 : 0; }

  // What the Bond could be worth at 18 if it grows at a yearly rate: the amount collected now
  // grows from today, and each $100 paid on a later birthday grows from that birthday.
  // For illustration only.
  function worthAt18(age, now, rate) {
    var v = now * Math.pow(1 + rate, 18 - age);
    for (var k = age + 1; k <= 15; k++) v += 100 * Math.pow(1 + rate, 18 - k);
    return Math.round(v);
  }

  // Advantage Plus example for one child at a set monthly amount on 20-year payment: the
  // coverage that amount buys, then the projected cash value and death benefit at 65.
  // Same method as Todd's calculator: price = rate per $1,000 x amount / 1,000 x 0.09 (the band
  // with the highest "from" at or below the amount), values scaled from $100,000 illustrations
  // and interpolated by policy year between the illustrated ages. Minimum coverage $25,000.
  var AP_ANCH = [0, 3, 6, 9, 12, 15, 18];
  function apRate(bands, amt) {
    var r = null, b = -1;
    bands.forEach(function (x) { if (amt >= x[0] && amt <= x[1] && x[0] > b) { b = x[0]; r = x[2]; } });
    return r;
  }
  function apExample(code, sex, age, monthly) {
    var bands = AP_BANDS[age + sex][code], face = 0;
    bands.forEach(function (x) {
      var a = monthly * 1000 / (0.09 * x[2]);
      if (a >= 25000 && apRate(bands, a) === x[2]) face = Math.max(face, a);
    });
    if (!face) return null;
    var a0 = AP_ANCH.filter(function (a) { return a <= age; }).pop(), a1 = AP_ANCH.filter(function (a) { return a >= age; })[0];
    var w = a1 === a0 ? 0 : (age - a0) / (a1 - a0), v0 = AP_CV[code + '|' + sex + '|' + a0], v1 = AP_CV[code + '|' + sex + '|' + a1];
    var t = 65 - age, k = face / 100000;
    function at(i) {
      var y0 = v0[t - 1][i];
      if (t <= v1.length) return (1 - w) * y0 + w * v1[t - 1][i];
      var L = v1.length; return (1 - w) * y0 + w * v1[L - 1][i] * (v0[L - 1][i] ? y0 / v0[L - 1][i] : 1);
    }
    var proj = at(0) * k;
    return { face: face, paid: monthly * 12 * 20, cv: Math.round(proj), db: Math.round(Math.max(at(1), at(0)) * k) };
  }
  // Whichever product projects the higher cash value at 65.
  function apBest(sex, age, monthly) {
    var e = apExample('120Y23', sex, age, monthly), w = apExample('120Y31', sex, age, monthly);
    if (!e || !w) return e || w;
    return w.cv >= e.cv ? w : e;
  }

  // Canada Education Savings Grant (CESG), checked on canada.ca on 2026-11-14: 20% of personal
  // contributions (at most $500 a year at these amounts), lifetime $7,200, paid on contributions
  // up to the end of the year the child turns 17. At 16 and 17 it is paid only if at least $2,000
  // was contributed before the end of the year the child turned 15, or $100 a year in at least
  // four years before then. Only the basic 20% is shown: we do not know how far above the
  // Bond limit the family's income is.
  // What saving each month from today could be worth at 18: deposits and CESG at the end of each
  // month, growing at 6% a year. For illustration only.
  function respSave(age, monthly) {
    var r = Math.pow(1.06, 1 / 12) - 1, months = 12 * (18 - age), dep = 0, cesg = 0, fv = 0;
    var late = monthly * 12 * (16 - age) >= 2000 || 16 - age >= 4;
    for (var m = 0; m < months; m++) {
      var at = age + Math.floor(m / 12);
      var g = (at <= 15 || late) ? Math.min(0.2 * monthly, 7200 - cesg) : 0;
      dep += monthly; cesg += g;
      fv = fv * (1 + r) + monthly + g;
    }
    return { dep: dep, cesg: Math.round(cesg), growth: Math.round(fv - dep - cesg), total: Math.round(fv) };
  }
  var RESP_MONTHLY = [50, 100, 150];

  var AP_MONTHLY = [50, 75, 100];
  // Each child's chart has its own base colour, in four shades from light to dark.
  var SHADES = [
    ['#9fb3c8', '#54769b', '#275590', '#1f4a87'],  // blue
    ['#c9bce6', '#9b85d0', '#7458b6', '#553d97'],  // purple
    ['#f0c897', '#e09c52', '#c4742b', '#9e581c'],  // amber
    ['#ebb5c5', '#d67d99', '#b65170', '#8e3754']   // rose
  ];
  var GROUPS = ['Bond deposits', '6% a year', '8% a year', '10% a year'];

  // One child's chart: what their Bond deposits could be worth at 18.
  function chartFor(vals, shades) {
    var top = vals[3];
    return '<div class="growth"><h4>What it could be worth at 18</h4><div class="gplot">' + vals.map(function (v, gi) {
      var h = Math.max(v / top * 82, 3).toFixed(1);
      return '<div class="gcol" style="--h:' + h + '%;--d:' + (gi * 0.45) + 's"><span class="gamt" data-v="' + v + '" data-d="' + gi + '">$0</span><div class="gbar" style="background:' + shades[gi] + '"></div></div>';
    }).join('') + '</div><div class="gaxis">' + GROUPS.map(function (g) { return '<span>' + g + '</span>'; }).join('') + '</div></div>';
  }

  var money = function (n) { return '$' + n.toLocaleString('en-CA'); };
  var esc = function (t) { return t.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // Children aged 18 to 20 are asked about the years before they turned 16, not today's income.
  // For each age, the lowest and highest yearly limit for a family with 1 to 3 children across
  // the benefit years (July to June) that child could have qualified in, as of November 2026:
  // from the year they could have been born to the year they could have turned 15. The limit rose
  // every year. 2017-18 on: ESDC notices #702, #772, #819, #870, #905, #948, #1000, #1044 (a family
  // with 1 to 3 children). 2005-06 to 2008-09: the income at which the National Child Benefit
  // Supplement reached zero for a two-child family, which was then the Bond test (Notice #702),
  // from the National Child Benefit Progress Reports 2005 to 2008. Shift these each July.
  var PAST = { 18: [37178, 53359], 19: [36378, 50197], 20: [35595, 49020] };

  var form = document.getElementById('quiz');
  var province = document.getElementById('province');
  var kids = document.getElementById('kids');
  var adultsQ = document.getElementById('adults-q'), adultsSel = document.getElementById('adults');
  var see = document.getElementById('see');
  var result = document.getElementById('result');
  var kidsQ = document.getElementById('kids-q'), kidRows = document.getElementById('kid-rows');
  var respQ = document.getElementById('resp-q-box'), respRows = document.getElementById('resp-rows');
  var pastQs = document.getElementById('past-qs');
  // Children under 18 first, then children aged 18 to 20.
  var answers = {}, minors = [], adults = [];
  function all() { return minors.concat(adults); }

  var minorAges = '<option value="">Age</option><option value="0">Under 1</option>';
  for (var i = 1; i <= 17; i++) minorAges += '<option value="' + i + '">' + i + '</option>';
  var adultAges = '<option value="">Age</option><option value="18">18</option><option value="19">19</option><option value="20">20</option>';
  var opts = '<option value="">Select a number…</option><option value="0">None</option>';
  for (i = 1; i <= 16; i++) opts += '<option value="' + i + '">' + i + '</option>';
  kids.innerHTML = opts;
  opts = '<option value="">Select a number…</option>';
  for (i = 1; i <= 6; i++) opts += '<option value="' + i + '">' + i + '</option>';
  adultsSel.innerHTML = opts;

  function nameOf(c, i) { return c.name || 'Child ' + (i + 1); }
  function sized(list, n) {
    while (list.length < n) list.push({ name: '', age: '', sex: '', resp: '', past: '' });
    list.length = n;
  }
  function pick(group, b) {
    group.querySelectorAll('.quiz-opt').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
  }

  // One row per child: first name, age, gender. Rows keep their answers when the numbers change.
  function buildKids() {
    sized(minors, +kids.value || 0);
    sized(adults, answers.adults === 'yes' ? +adultsSel.value || 0 : 0);
    function row(c, i, ages) {
      return '<div class="kid-row" data-i="' + i + '">' +
        '<input class="kid-name" type="text" maxlength="30" autocomplete="off" placeholder="First name" aria-label="Child ' + (i + 1) + ' first name" value="' + esc(c.name) + '">' +
        '<select class="select kid-age" aria-label="Child ' + (i + 1) + ' age">' + ages + '</select>' +
        '<div class="mf" role="group" aria-label="Child ' + (i + 1) + ' gender">' +
        ['M', 'F'].map(function (g) { return '<button type="button" class="quiz-opt" data-value="' + g + '" aria-pressed="' + (c.sex === g) + '">' + g + '</button>'; }).join('') +
        '</div></div>';
    }
    var html = minors.map(function (c, i) { return row(c, i, minorAges); }).join('');
    if (adults.length && minors.length) html += '<p class="kid-sub">Aged 18 to 20</p>';
    html += adults.map(function (c, j) { return row(c, minors.length + j, adultAges); }).join('');
    kidRows.innerHTML = html;
    var list = all();
    kidRows.querySelectorAll('.kid-row').forEach(function (row) {
      var c = list[+row.dataset.i];
      row.querySelector('.kid-age').value = c.age;
      row.querySelector('.kid-name').addEventListener('input', function (e) { c.name = e.target.value.trim(); buildResp(); buildPast(); });
      row.querySelector('.kid-age').addEventListener('change', function (e) { c.age = e.target.value; update(); });
      row.querySelectorAll('.mf .quiz-opt').forEach(function (b) {
        b.addEventListener('click', function () { pick(row.querySelector('.mf'), b); c.sex = b.dataset.value; update(); });
      });
    });
    kidsQ.hidden = !list.length;
  }

  // The RESP question lists each child by name, with Yes and No beside it.
  function buildResp() {
    var list = all().map(function (c, i) { return [c, i]; }).filter(function (x) { return x[0].age !== ''; });
    respRows.innerHTML = list.map(function (x) {
      var c = x[0], i = x[1];
      return '<div class="resp-row" data-i="' + i + '"><span class="resp-name">' + esc(nameOf(c, i)) + '</span><div class="quiz-options">' +
        ['yes', 'no'].map(function (v) { return '<button type="button" class="quiz-opt" data-value="' + v + '" aria-pressed="' + (c.resp === v) + '">' + (v === 'yes' ? 'Yes' : 'No') + '</button>'; }).join('') +
        '</div></div>';
    }).join('');
    var all_ = all();
    respRows.querySelectorAll('.resp-row').forEach(function (row) {
      var c = all_[+row.dataset.i];
      row.querySelectorAll('.quiz-opt').forEach(function (b) {
        b.addEventListener('click', function () { pick(row, b); c.resp = b.dataset.value; update(true); });
      });
    });
    respQ.hidden = !list.length;
  }

  // One income question for each child aged 18 to 20, about the years before they turned 16.
  // "Not sure" is offered only here.
  function buildPast() {
    var list = all();
    pastQs.innerHTML = adults.map(function (c, j) {
      var i = minors.length + j, r = PAST[c.age];
      if (!r) return '';
      return '<div class="quiz-q past-q" data-i="' + i + '"><p class="q" id="past-' + i + '">While ' + esc(nameOf(c, i)) + ' was 15 or younger, was your <strong>family net income</strong> at or below the limit in at least one year?</p>' +
        '<p class="hint">Eligibility for the Canada Learning Bond is based on your family\'s income during the years before your child turned 16, not your current income.</p>' +
        '<p class="hint">For families with one to three children, the annual income limit during those years ranged from ' + money(r[0]) + ' to ' + money(r[1]) + '.</p>' +
        '<div class="quiz-options" role="group" aria-labelledby="past-' + i + '">' +
        [['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']].map(function (o) { return '<button type="button" class="quiz-opt" data-value="' + o[0] + '" aria-pressed="' + (c.past === o[0]) + '">' + o[1] + '</button>'; }).join('') +
        '</div></div>';
    }).join('');
    pastQs.querySelectorAll('.past-q').forEach(function (q) {
      var c = list[+q.dataset.i];
      q.querySelectorAll('.quiz-opt').forEach(function (b) {
        b.addEventListener('click', function () { pick(q, b); c.past = b.dataset.value; update(true); });
      });
    });
  }

  // The income question shows that family's limit (by the number of children under 18) in the
  // two answers. A new number of children clears the earlier answer.
  var incomeQ = form.querySelector('[data-key="income"]');
  function incomeQuestion() {
    var k = +kids.value, limit = money(LIMITS[k] || 0);
    document.getElementById('income-below').textContent = k <= 3 ? limit + ' or less' : 'Less than ' + limit;
    document.getElementById('income-above').textContent = k <= 3 ? 'More than ' + limit : limit + ' or more';
    incomeQ.querySelectorAll('.quiz-opt').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
    delete answers.income;
  }

  function update(keep) {
    if (!keep) { buildResp(); buildPast(); }
    var list = all();
    incomeQ.hidden = !minors.length;
    document.getElementById('adults-count').hidden = answers.adults !== 'yes';
    document.getElementById('none-note').hidden = !(kids.value === '0' && answers.adults === 'no');
    var adultsDone = answers.adults === 'no' || (answers.adults === 'yes' && adultsSel.value);
    var kidsDone = list.length && list.every(function (c) { return c.age !== '' && c.sex && c.resp; });
    see.disabled = !(province.value && adultsDone && kidsDone && (!minors.length || answers.income) &&
      adults.every(function (c) { return c.past; }));
  }

  incomeQ.querySelectorAll('.quiz-opt').forEach(function (b) {
    b.addEventListener('click', function () { pick(incomeQ, b); answers.income = b.dataset.value; update(true); });
  });
  adultsQ.querySelectorAll(':scope > .quiz-options .quiz-opt').forEach(function (b) {
    b.addEventListener('click', function () {
      pick(b.parentNode, b); answers.adults = b.dataset.value; buildKids(); update();
    });
  });
  adultsSel.addEventListener('change', function () { buildKids(); update(); });
  province.addEventListener('change', function () { update(true); });
  kids.addEventListener('change', function () { incomeQuestion(); buildKids(); update(); });

  function show() {
    var under = answers.income === 'yes', bcProv = province.value === 'BC';
    var blocks = [], notes = [], charts = 0, eligible = false, anyBond = false, claimKids = 0;
    var overLimit = minors.length && !under;

    all().forEach(function (c, i) {
      var nm = esc(nameOf(c, i)), a = +c.age;
      // 18 to 20: based on the family's income in the years before they turned 16.
      if (a >= 18) {
        if (c.past === 'no') {
          blocks.push('<div class="kid-result"><h3>' + nm + '</h3><p class="kid-line">Not eligible for the Canada Learning Bond.</p></div>');
          return;
        }
        eligible = anyBond = true;
        if (c.past === 'yes') claimKids++;
        blocks.push('<div class="kid-result"><h3>' + nm + (c.past === 'yes' ? ' could collect up to' : ' may be able to collect up to') + '</h3><p class="result-total">' + money(bond(a)) + '</p>' +
          '<ul class="amounts"><li><span class="name">Today<span class="sub">Based on the years before ' + nm + ' turned 16.</span></span><span class="amt">' + money(bond(a)) + '</span></li></ul></div>');
        notes.push('At 18 to 20, ' + nm + ' requests the Learning Bond themselves, before they turn 21.');
        if (c.resp === 'yes') notes.push('Some of this may already have been paid into ' + nm + '\'s RESP.');
        return;
      }
      var bc = bcProv ? bctesg(a) : 0, now = under ? bond(a) : 0, later = under ? 2000 - now : 0;
      if (!now && !later && !bc) {
        blocks.push('<div class="kid-result"><h3>' + nm + '</h3><p class="kid-line">Not eligible for the Canada Learning Bond.</p></div>');
        return;
      }
      eligible = true;
      if (now) { anyBond = true; claimKids++; }
      var rows = [];
      if (now) rows.push(['Today', '', now]);
      if (later) rows.push(['Going forward', '$100 a year until age 15.', later]);
      if (bc) rows.push(['B.C. Training and Education Savings Grant', 'For children aged 6 to 8.', bc]);
      var list = rows.map(function (r) {
        return '<li><span class="name">' + r[0] + (r[1] ? '<span class="sub">' + r[1] + '</span>' : '') + '</span><span class="amt">' + money(r[2]) + '</span></li>';
      }).join('');
      if (rows.length > 1) list += '<li class="total"><span class="name">Total</span><span class="amt">' + money(now + later + bc) + '</span></li>';
      var chart = '';
      if (a < 18) {
        chart = chartFor([now + later + bc].concat([0.06, 0.08, 0.10].map(function (r) {
          return (under ? worthAt18(a, now, r) : 0) + Math.round(bc * Math.pow(1 + r, 18 - a));
        })), SHADES[charts % SHADES.length]);
        charts++;
      }
      blocks.push('<div class="kid-result"><h3>' + nm + ' could collect up to</h3><p class="result-total">' + money(now + later + bc) + '</p><ul class="amounts">' + list + '</ul>' + chart + '</div>');
      if (c.resp === 'yes') notes.push('Some of this may already have been paid into ' + nm + '\'s RESP.');
    });

    var panel = '';
    if (overLimit) panel = '<div class="result-panel fail"><p>Your family net income exceeds the qualifications for the Canada Learning Bond.</p></div>';
    if (anyBond) notes.unshift('These amounts are estimates provided for illustration purposes. The actual amount may vary depending on your family\'s net income during each year of eligibility.');

    // The growth note is said once, under the last chart.
    var growth = charts ? '<p class="hint growth-note">If this money grows at these average yearly rates until your child turns 18. For illustration only; growth is not guaranteed.</p>' : '';
    // A reminder that the Bond is federal money already there for them to claim.
    if (claimKids) growth += '<p class="claim-note">This is free money from the federal government. It is already there for your ' + (claimKids > 1 ? 'children' : 'child') + '. You just need to claim it.</p>';

    // Above the income limit: what an RESP is, then for each child under 16 with no RESP, what
    // saving $50, $100 or $150 a month could be worth at 18.
    var resp = '';
    if (overLimit) {
      var kidsResp = [], shade = charts;
      minors.forEach(function (c, i) {
        var a = +c.age, nm = esc(nameOf(c, i));
        if (c.resp === 'yes') { kidsResp.push('<div class="resp-kid"><h4>' + nm + '</h4><p class="done"><span aria-hidden="true">&#10003;</span> Already has an RESP.</p></div>'); return; }
        if (a >= 16) { kidsResp.push('<div class="resp-kid"><h4>' + nm + '</h4><p>Because ' + nm + ' is over 15, ' + nm + ' cannot receive the CESG. For children aged 16 and 17, the CESG is only paid if saving started before the end of the year they turned 15.</p></div>'); return; }
        var sh = SHADES[shade++ % SHADES.length], cols = [sh[0], sh[1], sh[3]];
        var ex = RESP_MONTHLY.map(function (m) { return respSave(a, m); });
        var top = ex[2].total;
        var plot = ex.map(function (e, bi) {
          var parts = [e.dep, e.cesg, e.growth], base = 0, d0 = bi * 0.3;
          var segs = parts.map(function (v, si) {
            var h = v / top * 82, seg = '<div class="seg' + (si === 2 ? ' top' : '') + '" style="bottom:' + base.toFixed(2) + '%;--sh:' + h.toFixed(2) + '%;--sd:' + (d0 + si * 0.8).toFixed(2) + 's;background:' + cols[si] + '"></div>';
            base += h; return seg;
          }).join('');
          return '<div class="gcol" style="--h:' + base.toFixed(2) + '%;--d:' + (d0 + 2.4).toFixed(2) + 's"><span class="gamt" data-v="' + e.total + '" data-ms="' + Math.round(d0 * 1000) + '">$0</span>' + segs + '</div>';
        }).join('');
        function row(label, f) { return '<span class="ap-label">' + label + '</span>' + ex.map(function (e) { return '<span class="ap-num">' + money(f(e)) + '</span>'; }).join(''); }
        kidsResp.push('<div class="resp-kid"><h4>' + nm + '</h4><div class="growth stack"><h5>What saving could be worth at 18</h5>' +
          '<ul class="skey">' + ['Your deposits', 'CESG', 'Growth'].map(function (t, si) { return '<li><i style="background:' + cols[si] + '"></i>' + t + '</li>'; }).join('') + '</ul>' +
          '<div class="gplot three">' + plot + '</div><div class="gaxis three">' + RESP_MONTHLY.map(function (m) { return '<span>' + money(m) + ' a month</span>'; }).join('') + '</div></div>' +
          '<div class="ap-grid">' + row('Your deposits', function (e) { return e.dep; }) + row('CESG', function (e) { return e.cesg; }) + row('Growth', function (e) { return e.growth; }) + row('Total at 18', function (e) { return e.total; }) + '</div></div>');
      });
      if (kidsResp.length) resp = '<div class="resp-box"><h3>What is an RESP?</h3>' +
        '<p>A Registered Education Savings Plan (RESP) is a savings account for your child\'s education after high school. When you deposit money into it, the federal government adds 20% through the Canada Education Savings Grant (CESG), up to $500 a year for each child and $7,200 in total.</p>' +
        '<p>The money you put in is always yours. If your child does not continue their education, your deposits are returned to you.</p>' +
        kidsResp.join('') +
        '<p class="hint">If this money grows at an average of 6% a year until your child turns 18. For illustration only; growth is not guaranteed.</p></div>';
    }

    // Advantage Plus examples for each child aged 18 and under.
    var short = false;
    document.getElementById('ap-kids').innerHTML = all().map(function (c, i) {
      var a = +c.age;
      if (a > 18) return '';
      var ex = AP_MONTHLY.map(function (m) { return apBest(c.sex, a, m); });
      if (!ex[0]) short = true;
      function row(label, f) {
        return '<span class="ap-label">' + label + '</span>' + ex.map(function (e, k) { return '<span class="ap-num">' + (e ? f(e, k) : '&ndash;') + '</span>'; }).join('');
      }
      return '<div class="ap-kid"><h4>' + esc(nameOf(c, i)) + '</h4><div class="ap-grid">' +
        '<span class="ap-label">Monthly</span>' + AP_MONTHLY.map(function (m) { return '<span class="ap-num ap-head">' + money(m) + '</span>'; }).join('') +
        row('Fully paid after 20 years', function (e) { return money(e.paid); }) +
        row('Projected cash value at 65', function (e) { return money(e.cv); }) +
        row('Projected death benefit at 65', function (e) { return money(e.db); }) +
        '</div></div>';
    }).join('') + (short ? '<p class="hint">&ndash; $50 a month is below the minimum at this age.</p>' : '');

    document.getElementById('result-panel').innerHTML = panel;
    document.getElementById('kid-results').innerHTML = blocks.join('');
    document.getElementById('growth').innerHTML = growth;
    document.getElementById('resp-section').innerHTML = resp;
    document.getElementById('result-notes').innerHTML = notes.map(function (t) { return '<p>' + t + '</p>'; }).join('');
    render(eligible);
  }

  // In each chart the bars grow one after another and their amounts count up, once that
  // chart is on screen.
  function animateGrowth() {
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('#result .growth').forEach(function (chart) {
      function run() {
        chart.classList.add('on');
        chart.querySelectorAll('.gamt').forEach(function (el) {
          var v = +el.dataset.v;
          if (still) { el.textContent = money(v); return; }
          var delay = el.dataset.ms ? +el.dataset.ms : +el.dataset.d * 450, dur = el.dataset.ms ? 2400 : 2000, t0 = null;
          function step(t) {
            if (t0 === null) t0 = t;
            var p = Math.min(Math.max((t - t0 - delay) / dur, 0), 1);
            el.textContent = money(Math.round(v * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        });
      }
      // Already on screen (or no observer support): start now. Otherwise start when scrolled to.
      var r = chart.getBoundingClientRect();
      if (!('IntersectionObserver' in window) || r.top < window.innerHeight * 0.8) return run();
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { io.disconnect(); run(); }
      }, { threshold: 0.4 });
      io.observe(chart);
    });
  }

  var more = document.getElementById('more'), programs = document.getElementById('programs');

  function render(eligible) {
    // Every family is asked about the additional programs, whatever their income. Booking a call happens only through Advantage Plus; for the Bond itself, everyone
    // is sent to the Government of Canada page on opening an RESP and applying.
    more.hidden = false;
    more.querySelectorAll('.quiz-opt').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
    programs.hidden = true;
    programs.classList.remove('open');
    document.getElementById('next-gov').hidden = !eligible;
    document.querySelector('.page-intro').hidden = true;
    form.hidden = true;
    result.hidden = false;
    result.focus();
    window.scrollTo(0, 0);
    animateGrowth();
  }

  // Yes opens the two programs underneath; No closes them.
  more.querySelectorAll('.quiz-opt').forEach(function (b) {
    b.addEventListener('click', function () {
      more.querySelectorAll('.quiz-opt').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      var yes = b.dataset.value === 'yes';
      programs.hidden = !yes;
      programs.classList.toggle('open', yes);
      if (yes) programs.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  form.addEventListener('submit', function (e) { e.preventDefault(); if (!see.disabled) show(); });
  document.getElementById('restart').addEventListener('click', function () {
    document.querySelector('.page-intro').hidden = false;
    result.hidden = true;
    form.hidden = false;
    window.scrollTo(0, 0);
  });
  update();
})();
