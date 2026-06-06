<?php
/**
 * Subscriber list viewer — HTTP Basic Auth, reads subscribers.csv.
 *
 *   https://perxli.com/api/view.php           — HTML table
 *   https://perxli.com/api/view.php?export=1  — fresh CSV download
 *
 * Auth credentials live in config.php (admin_user + admin_pass). The
 * comparison is constant-time, but rate-limiting isn't built in — pick
 * a long random password and treat this URL as a secret.
 */

declare(strict_types=1);

// ── Config ────────────────────────────────────────────────────────
$configPath = __DIR__ . '/config.php';
if (!is_readable($configPath)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Admin view unavailable: config.php missing.');
}
$config = require $configPath;

$expectUser = isset($config['admin_user']) ? (string)$config['admin_user'] : '';
$expectPass = isset($config['admin_pass']) ? (string)$config['admin_pass'] : '';

if ($expectUser === ''
    || $expectPass === ''
    || $expectPass === 'CHANGE_ME'
    || $expectPass === 'CHANGE_ME_BEFORE_DEPLOY'
) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    exit("Admin view disabled until admin_user + admin_pass are set in api/config.php.\n");
}

// ── Auth (handle FPM-wrapped Authorization header) ────────────────
function read_basic_auth_credentials(): array
{
    $user = $_SERVER['PHP_AUTH_USER'] ?? '';
    $pass = $_SERVER['PHP_AUTH_PW'] ?? '';
    if ($user !== '' || $pass !== '') return [$user, $pass];

    // Some FPM setups deliver the header as HTTP_AUTHORIZATION /
    // REDIRECT_HTTP_AUTHORIZATION instead of decoding PHP_AUTH_*.
    foreach (['HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION'] as $k) {
        if (!empty($_SERVER[$k]) && stripos((string)$_SERVER[$k], 'Basic ') === 0) {
            $raw = base64_decode(trim(substr((string)$_SERVER[$k], 6)), true);
            if ($raw !== false && strpos($raw, ':') !== false) {
                [$u, $p] = explode(':', $raw, 2);
                return [$u, $p];
            }
        }
    }
    return ['', ''];
}

[$user, $pass] = read_basic_auth_credentials();

$authOk = hash_equals($expectUser, $user) && hash_equals($expectPass, $pass);
if (!$authOk) {
    header('WWW-Authenticate: Basic realm="Perxli admin"');
    http_response_code(401);
    header('Content-Type: text/plain; charset=utf-8');
    exit("Authentication required.\n");
}

// ── Load subscribers (same schema as submit.php) ─────────────────
function load_subscribers_view($csvPath): array
{
    $subs = [];
    if (!file_exists($csvPath)) return $subs;
    $fh = @fopen($csvPath, 'rb');
    if (!$fh) return $subs;
    $header = fgetcsv($fh);
    if ($header === false) { fclose($fh); return $subs; }
    $isNew = isset($header[0]) && $header[0] === 'first_seen_iso';

    while (($row = fgetcsv($fh)) !== false) {
        if (!is_array($row) || count($row) < 2) continue;
        if ($isNew) {
            $email = isset($row[2]) ? trim((string)$row[2]) : '';
            if ($email === '') continue;
            $subs[strtolower($email)] = [
                'first' => (string)($row[0] ?? ''),
                'last'  => (string)($row[1] ?? ''),
                'email' => $email,
                'count' => isset($row[3]) ? max(1, (int)$row[3]) : 1,
                'ip'    => (string)($row[4] ?? ''),
                'ua'    => (string)($row[5] ?? ''),
            ];
        } else {
            $email = isset($row[1]) ? trim((string)$row[1]) : '';
            if ($email === '') continue;
            $key = strtolower($email);
            $ts = (string)($row[0] ?? '');
            if (isset($subs[$key])) {
                $subs[$key]['count']++;
                if ($ts !== '' && $ts > $subs[$key]['last']) $subs[$key]['last'] = $ts;
            } else {
                $subs[$key] = [
                    'first' => $ts,
                    'last'  => $ts,
                    'email' => $email,
                    'count' => 1,
                    'ip'    => (string)($row[2] ?? ''),
                    'ua'    => (string)($row[3] ?? ''),
                ];
            }
        }
    }
    fclose($fh);
    return $subs;
}

$csvPath = __DIR__ . '/subscribers.csv';
$subs = load_subscribers_view($csvPath);

// Most-recent first by default.
uasort($subs, function ($a, $b) {
    return strcmp((string)$b['last'], (string)$a['last']);
});

// ── CSV export endpoint ──────────────────────────────────────────
if (isset($_GET['export'])) {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="perxli-subscribers-' . date('Y-m-d') . '.csv"');
    $out = fopen('php://output', 'wb');
    fputcsv($out, ['first_seen_iso', 'last_seen_iso', 'email', 'times_subscribed', 'last_ip', 'last_user_agent']);
    foreach ($subs as $r) {
        fputcsv($out, [$r['first'], $r['last'], $r['email'], $r['count'], $r['ip'], $r['ua']]);
    }
    fclose($out);
    exit;
}

// ── Stats ────────────────────────────────────────────────────────
$totalSubs    = count($subs);
$totalSubmits = 0;
$repeats      = 0;
foreach ($subs as $r) {
    $totalSubmits += (int)$r['count'];
    if ((int)$r['count'] > 1) $repeats++;
}
$mostRecent = $totalSubs > 0 ? reset($subs)['last'] : '';

function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

function pretty_dt(string $iso): string
{
    if ($iso === '') return '—';
    $ts = strtotime($iso);
    if ($ts === false) return $iso;
    return date('M j, Y · H:i', $ts);
}
?><!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Subscribers — Perxli admin</title>
<meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#141414;--bg2:#1a1a1a;--bg3:#202020;
  --lime:#D4F53C;--purple:#8B5CF6;
  --text:#f0f0f0;--text-muted:#888;--text-dim:#555;
  --border:rgba(255,255,255,0.07);
}
html,body{height:100%}
body{font-family:'Manrope',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;padding:32px 24px 64px}
.wrap{max-width:1100px;margin:0 auto}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:28px}
.logo{display:flex;align-items:center;gap:10px;text-decoration:none}
.logo-mark{width:32px;height:32px;background:var(--lime);border-radius:8px;text-align:center;line-height:32px;font-weight:900;color:#141414;font-size:16px}
.logo-text{font-weight:800;font-size:17px;letter-spacing:-.5px}
.logo-text span{color:var(--lime)}
.logo-sub{font-size:11px;color:var(--text-dim);font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin-left:6px}
.export-btn{background:var(--lime);color:#141414;border:none;padding:11px 20px;border-radius:9px;font-family:inherit;font-weight:800;font-size:13px;text-decoration:none;display:inline-flex;align-items:center;gap:7px;transition:background .2s,transform .15s}
.export-btn:hover{background:#c5e832;transform:translateY(-1px)}
.export-btn svg{width:14px;height:14px}

.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin-bottom:24px}
.stat{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:18px 20px}
.stat-label{font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px}
.stat-val{font-size:30px;font-weight:900;letter-spacing:-1.5px;line-height:1}
.stat-val.lime{color:var(--lime)}.stat-val.pur{color:var(--purple)}
.stat-sub{font-size:11px;color:var(--text-muted);margin-top:8px}

.toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.search{background:var(--bg2);border:1px solid var(--border);border-radius:11px;padding:11px 14px 11px 38px;color:var(--text);font-family:inherit;font-size:13px;font-weight:500;width:320px;max-width:100%;outline:none;transition:border-color .2s}
.search:focus{border-color:var(--lime)}
.search-wrap{position:relative}
.search-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--text-dim);pointer-events:none}
.muted{font-size:12px;color:var(--text-muted)}

.table-wrap{background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden}
.scroll{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px;min-width:780px}
thead th{text-align:left;font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:1.5px;padding:14px 16px;background:var(--bg3);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;white-space:nowrap}
thead th:hover{color:var(--text-muted)}
thead th .arrow{display:inline-block;width:8px;color:var(--lime);opacity:0}
thead th.sorted .arrow{opacity:1}
tbody td{padding:14px 16px;border-bottom:1px solid var(--border);vertical-align:top}
tbody tr:last-child td{border-bottom:none}
tbody tr:hover{background:rgba(255,255,255,0.015)}
td.email{font-weight:600}
td.email a{color:var(--text);text-decoration:none}
td.email a:hover{color:var(--lime)}
td.count{font-weight:800}
td.count .repeat{display:inline-block;background:rgba(212,245,60,.12);color:var(--lime);border:1px solid rgba(212,245,60,.22);padding:2px 8px;border-radius:100px;font-size:11px;font-weight:700}
td.count .single{color:var(--text-muted);font-weight:600;font-size:12px}
td.dt{color:var(--text-muted);white-space:nowrap;font-variant-numeric:tabular-nums}
td.ip{color:var(--text-muted);font-family:'SF Mono',ui-monospace,Menlo,monospace;font-size:12px}
.empty{padding:48px 24px;text-align:center;color:var(--text-muted);font-size:13px}
.empty strong{color:var(--text);font-weight:700;display:block;font-size:15px;margin-bottom:4px}

.foot{margin-top:20px;font-size:11px;color:var(--text-dim);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}

@media (max-width:560px){
  body{padding:20px 14px 40px}
  .search{width:100%}
  .stat-val{font-size:24px}
}
</style>
</head>
<body>

<div class="wrap">

  <div class="top">
    <div class="logo">
      <span class="logo-mark">P</span>
      <span class="logo-text">perxli<span>.</span></span>
      <span class="logo-sub">subscribers</span>
    </div>
    <a class="export-btn" href="?export=1">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
      </svg>
      Export CSV
    </a>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-label">Unique subscribers</div>
      <div class="stat-val lime"><?= h($totalSubs) ?></div>
    </div>
    <div class="stat">
      <div class="stat-label">Total submissions</div>
      <div class="stat-val"><?= h($totalSubmits) ?></div>
      <div class="stat-sub"><?= h($repeats) ?> resubmits</div>
    </div>
    <div class="stat">
      <div class="stat-label">Most recent</div>
      <div class="stat-val pur" style="font-size:17px;line-height:1.3;letter-spacing:-.5px"><?= h(pretty_dt($mostRecent)) ?></div>
    </div>
  </div>

  <?php if ($totalSubs === 0): ?>
    <div class="table-wrap">
      <div class="empty">
        <strong>No signups yet.</strong>
        When someone submits the early-access form, they'll appear here.
      </div>
    </div>
  <?php else: ?>
    <div class="toolbar">
      <div class="search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <input type="text" id="search" class="search" placeholder="Filter by email, IP…" autocomplete="off">
      </div>
      <div class="muted" id="visible-count"><?= h($totalSubs) ?> rows</div>
    </div>
    <div class="table-wrap">
      <div class="scroll">
        <table id="tbl">
          <thead>
            <tr>
              <th data-key="email">Email <span class="arrow">▼</span></th>
              <th data-key="count" data-type="num">Subs <span class="arrow">▼</span></th>
              <th data-key="last" class="sorted" data-type="iso" data-dir="desc">Last seen <span class="arrow">▼</span></th>
              <th data-key="first" data-type="iso">First seen <span class="arrow">▼</span></th>
              <th data-key="ip">Last IP <span class="arrow">▼</span></th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($subs as $r): ?>
            <tr>
              <td class="email"><a href="mailto:<?= h($r['email']) ?>"><?= h($r['email']) ?></a></td>
              <td class="count" data-num="<?= h($r['count']) ?>">
                <?php if ((int)$r['count'] > 1): ?>
                  <span class="repeat">×<?= h($r['count']) ?></span>
                <?php else: ?>
                  <span class="single">1</span>
                <?php endif; ?>
              </td>
              <td class="dt" data-iso="<?= h($r['last']) ?>"><?= h(pretty_dt($r['last'])) ?></td>
              <td class="dt" data-iso="<?= h($r['first']) ?>"><?= h(pretty_dt($r['first'])) ?></td>
              <td class="ip" title="<?= h($r['ua']) ?>"><?= h($r['ip']) ?></td>
            </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>
  <?php endif; ?>

  <div class="foot">
    <div>Sorted by most-recent first · click any column to re-sort</div>
    <div>Perxli admin · loaded <?= h(date('M j H:i')) ?></div>
  </div>

</div>

<script>
(function () {
  var tbl = document.getElementById('tbl');
  if (!tbl) return;

  // ── Search filter ───────────────────────────────────────────────
  var input = document.getElementById('search');
  var counter = document.getElementById('visible-count');
  var rows = Array.prototype.slice.call(tbl.querySelectorAll('tbody tr'));
  var total = rows.length;

  function applyFilter() {
    var q = (input.value || '').trim().toLowerCase();
    var shown = 0;
    rows.forEach(function (r) {
      var text = r.textContent.toLowerCase();
      var match = q === '' || text.indexOf(q) !== -1;
      r.style.display = match ? '' : 'none';
      if (match) shown++;
    });
    counter.textContent = shown === total
      ? total + ' rows'
      : shown + ' of ' + total + ' rows';
  }
  if (input) input.addEventListener('input', applyFilter);

  // ── Column sort ─────────────────────────────────────────────────
  var ths = tbl.querySelectorAll('thead th');
  ths.forEach(function (th) {
    th.addEventListener('click', function () {
      var key = th.getAttribute('data-key');
      var type = th.getAttribute('data-type') || 'string';
      var current = th.getAttribute('data-dir');
      var dir = current === 'desc' ? 'asc' : 'desc';

      ths.forEach(function (t) {
        t.classList.remove('sorted');
        t.removeAttribute('data-dir');
        var a = t.querySelector('.arrow');
        if (a) a.textContent = '▼';
      });
      th.classList.add('sorted');
      th.setAttribute('data-dir', dir);
      var a = th.querySelector('.arrow');
      if (a) a.textContent = dir === 'desc' ? '▼' : '▲';

      var tbody = tbl.querySelector('tbody');
      var sorted = rows.slice().sort(function (a, b) {
        var av = cellValue(a, key, type);
        var bv = cellValue(b, key, type);
        if (type === 'num') {
          return dir === 'desc' ? bv - av : av - bv;
        }
        if (av < bv) return dir === 'desc' ? 1 : -1;
        if (av > bv) return dir === 'desc' ? -1 : 1;
        return 0;
      });
      sorted.forEach(function (r) { tbody.appendChild(r); });
    });
  });

  function cellValue(row, key, type) {
    var cells = row.children;
    // Header order: email, count, last, first, ip
    var idx = { email: 0, count: 1, last: 2, first: 3, ip: 4 }[key];
    if (idx === undefined) return '';
    var td = cells[idx];
    if (type === 'num') return parseInt(td.getAttribute('data-num') || '0', 10) || 0;
    if (type === 'iso') return td.getAttribute('data-iso') || '';
    return (td.textContent || '').trim().toLowerCase();
  }
})();
</script>

</body>
</html>
