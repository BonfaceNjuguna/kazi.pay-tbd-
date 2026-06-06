<?php
/**
 * Early-access form handler.
 *
 *   POST application/x-www-form-urlencoded OR application/json
 *   Required fields: email
 *   Honeypot field: company (must be empty)
 *
 * Sends a notification to the configured mailbox via authenticated SMTP
 * and appends the entry to a CSV for future export. Replies JSON.
 */

declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailerException;

require __DIR__ . '/phpmailer/Exception.php';
require __DIR__ . '/phpmailer/PHPMailer.php';
require __DIR__ . '/phpmailer/SMTP.php';

// ───────────────────────────────────────────────────────────────────
// Plumbing
// ───────────────────────────────────────────────────────────────────

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}

function client_ip(): string
{
    // Trust REMOTE_ADDR only — anything from X-Forwarded-* is spoofable on
    // shared hosting unless DirectAdmin is fronted by a known proxy.
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function log_line(string $msg): void
{
    // Silent best-effort — never let logging kill the response.
    @file_put_contents(
        __DIR__ . '/submit.log',
        '[' . date('c') . '] ' . $msg . "\n",
        FILE_APPEND | LOCK_EX
    );
}

// First thing we do — proves PHP reached this file at all. If submit.log
// stays missing after a form submit, the request never got here (PHP not
// enabled, wrong path, or .htaccess intercept).
log_line(($_SERVER['REQUEST_METHOD'] ?? '?') . ' from ' . client_ip()
    . ' origin=' . ($_SERVER['HTTP_ORIGIN'] ?? '-')
    . ' referer=' . ($_SERVER['HTTP_REFERER'] ?? '-'));

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'METHOD_NOT_ALLOWED']);
}

$configPath = __DIR__ . '/config.php';
if (!is_readable($configPath)) {
    log_line('config.php missing or unreadable');
    respond(500, ['ok' => false, 'error' => 'SERVER_NOT_CONFIGURED']);
}
$config = require $configPath;

// ───────────────────────────────────────────────────────────────────
// Origin check (CSRF defence — same idea as the backend's csrfOriginCheck)
// ───────────────────────────────────────────────────────────────────

$allowedOrigins = $config['allowed_origins'] ?? [];
$origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
if ($origin !== '') {
    $parsed = parse_url($origin);
    $originRoot = isset($parsed['scheme'], $parsed['host'])
        ? $parsed['scheme'] . '://' . $parsed['host'] . (isset($parsed['port']) ? ':' . $parsed['port'] : '')
        : '';
    if ($originRoot === '' || !in_array($originRoot, $allowedOrigins, true)) {
        log_line('blocked origin: ' . $origin);
        respond(403, ['ok' => false, 'error' => 'ORIGIN_NOT_ALLOWED']);
    }
} else {
    // Browsers always set Origin on cross-origin fetch and on form POSTs in
    // modern engines — a missing header is almost always a curl/script.
    log_line('missing origin header from ' . client_ip());
    respond(403, ['ok' => false, 'error' => 'ORIGIN_REQUIRED']);
}

// ───────────────────────────────────────────────────────────────────
// Parse body (accept both form-encoded and JSON)
// ───────────────────────────────────────────────────────────────────

$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
$input = [];
if (stripos($contentType, 'application/json') !== false) {
    $raw = file_get_contents('php://input') ?: '';
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        $input = $decoded;
    }
} else {
    $input = $_POST;
}

$email   = trim((string)($input['email']   ?? ''));
$honeypot = trim((string)($input['company'] ?? ''));

// ───────────────────────────────────────────────────────────────────
// Honeypot — bots fill every field
// ───────────────────────────────────────────────────────────────────

if ($honeypot !== '') {
    log_line('honeypot triggered from ' . client_ip());
    // 200 + ok=true so the bot moves on without retrying.
    respond(200, ['ok' => true]);
}

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(400, ['ok' => false, 'error' => 'INVALID_EMAIL']);
}
if (strlen($email) > 254) {
    respond(400, ['ok' => false, 'error' => 'INVALID_EMAIL']);
}

// ───────────────────────────────────────────────────────────────────
// Rate limit (filesystem-backed, per-IP)
// ───────────────────────────────────────────────────────────────────

$rlDir = __DIR__ . '/rate_limit';
if (!is_dir($rlDir)) {
    @mkdir($rlDir, 0700, true);
}
$ip = client_ip();
$rlFile = $rlDir . '/' . hash('sha256', $ip) . '.json';

$now = time();
$state = ['last' => 0, 'today' => date('Y-m-d'), 'count' => 0];
if (is_readable($rlFile)) {
    $existing = json_decode((string)@file_get_contents($rlFile), true);
    if (is_array($existing)) {
        $state = array_merge($state, $existing);
    }
}

$gap = (int)($config['rate_limit_seconds'] ?? 30);
$dailyCap = (int)($config['rate_limit_per_day'] ?? 5);

if ($now - (int)$state['last'] < $gap) {
    respond(429, ['ok' => false, 'error' => 'TOO_FAST']);
}
if ($state['today'] !== date('Y-m-d')) {
    $state['today'] = date('Y-m-d');
    $state['count'] = 0;
}
if ((int)$state['count'] >= $dailyCap) {
    respond(429, ['ok' => false, 'error' => 'DAILY_LIMIT']);
}

$state['last']  = $now;
$state['count'] = (int)$state['count'] + 1;
@file_put_contents($rlFile, json_encode($state), LOCK_EX);

// ───────────────────────────────────────────────────────────────────
// Persist subscriber to CSV — email-keyed, merge on resubmit.
//
// Held under an exclusive flock on a sibling .lock file so two concurrent
// submits can't race and clobber each other's count update. The actual
// rewrite is temp-file + rename, atomic on the DirectAdmin filesystem.
// ───────────────────────────────────────────────────────────────────

$csvPath  = __DIR__ . '/subscribers.csv';
$lockPath = __DIR__ . '/subscribers.lock';
$ua       = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500);
$now      = date('c');

$lockFh = @fopen($lockPath, 'cb');
$gotLock = $lockFh && @flock($lockFh, LOCK_EX);

$subs = load_subscribers($csvPath);
$key  = strtolower($email);

if (isset($subs[$key])) {
    $subs[$key]['last']  = $now;
    $subs[$key]['count'] = (int)$subs[$key]['count'] + 1;
    $subs[$key]['ip']    = $ip;
    $subs[$key]['ua']    = $ua;
} else {
    $subs[$key] = [
        'first' => $now,
        'last'  => $now,
        'email' => $email,
        'count' => 1,
        'ip'    => $ip,
        'ua'    => $ua,
    ];
}

save_subscribers($csvPath, $subs);

if ($gotLock) @flock($lockFh, LOCK_UN);
if ($lockFh)  @fclose($lockFh);

// ───────────────────────────────────────────────────────────────────
// Send the notification (to the team) + auto-reply (to the subscriber).
//
// Both go through the same authenticated SMTP session — SMTPKeepAlive
// reuses the TCP connection so we don't pay the TLS handshake twice.
// The team notification is required (returns 502 on failure). The
// auto-reply is best-effort: a failed send is logged but the user still
// gets {ok:true} since the CSV row is the source of truth.
// ───────────────────────────────────────────────────────────────────

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host          = (string)$config['smtp_host'];
    $mail->Port          = (int)$config['smtp_port'];
    $mail->SMTPAuth      = true;
    $mail->Username      = (string)$config['smtp_user'];
    $mail->Password      = (string)$config['smtp_pass'];
    $mail->SMTPSecure    = (string)$config['smtp_encrypt'] === 'ssl'
        ? PHPMailer::ENCRYPTION_SMTPS
        : PHPMailer::ENCRYPTION_STARTTLS;
    $mail->CharSet       = 'UTF-8';
    $mail->Timeout       = 15;
    $mail->SMTPKeepAlive = true;

    // ── 1. Team notification ──────────────────────────────────────
    $mail->setFrom((string)$config['notify_from'], (string)($config['notify_name'] ?? 'Perxli'));
    $mail->addAddress((string)$config['notify_to']);
    $mail->addReplyTo($email);

    $mail->Subject = 'New early-access signup: ' . $email;
    $mail->Body =
        "New Perxli early-access signup.\n\n" .
        "Email:      " . $email . "\n" .
        "Timestamp:  " . date('c') . "\n" .
        "IP:         " . $ip . "\n" .
        "User-Agent: " . (string)($_SERVER['HTTP_USER_AGENT'] ?? '') . "\n";

    $mail->send();
} catch (MailerException $e) {
    log_line('team notify SMTP failure: ' . $mail->ErrorInfo);
    respond(502, ['ok' => false, 'error' => 'EMAIL_DELIVERY_FAILED']);
}

// ── 2. Subscriber auto-reply (best-effort) ────────────────────────
try {
    $mail->clearAllRecipients();
    $mail->clearReplyTos();
    $mail->addAddress($email);
    $mail->addReplyTo((string)$config['notify_to'], (string)($config['notify_name'] ?? 'Perxli'));

    $mail->isHTML(true);
    $mail->Subject = "You're on the list — Perxli launches soon";
    $mail->Body    = build_confirmation_html();
    $mail->AltBody = build_confirmation_text();

    $mail->send();
} catch (MailerException $e) {
    // Don't fail the request — owner already got their notification,
    // CSV row is written, subscriber sees success in the UI.
    log_line('subscriber auto-reply SMTP failure: ' . $mail->ErrorInfo);
}

$mail->smtpClose();

respond(200, ['ok' => true]);

// ───────────────────────────────────────────────────────────────────
// Subscribers CSV — email-keyed read/write with legacy-format migration.
// ───────────────────────────────────────────────────────────────────

function load_subscribers($csvPath) {
    // Returns: array<lowercase email, ['first','last','email','count','ip','ua']>
    // If the on-disk header matches the old append-only schema
    // (timestamp_iso, email, ip, user_agent), each row is folded into the
    // new format — multiple rows for the same email collapse into one
    // record with bumped count and widened first/last window.
    $subs = [];
    if (!file_exists($csvPath)) return $subs;

    $fh = @fopen($csvPath, 'rb');
    if (!$fh) return $subs;

    $header = fgetcsv($fh);
    if ($header === false) { fclose($fh); return $subs; }

    $isNewSchema = isset($header[0]) && $header[0] === 'first_seen_iso';

    while (($row = fgetcsv($fh)) !== false) {
        if (!is_array($row) || count($row) < 2) continue;

        if ($isNewSchema) {
            $email = isset($row[2]) ? trim((string)$row[2]) : '';
            if ($email === '') continue;
            $key = strtolower($email);
            $subs[$key] = [
                'first' => isset($row[0]) ? (string)$row[0] : '',
                'last'  => isset($row[1]) ? (string)$row[1] : '',
                'email' => $email,
                'count' => isset($row[3]) ? max(1, (int)$row[3]) : 1,
                'ip'    => isset($row[4]) ? (string)$row[4] : '',
                'ua'    => isset($row[5]) ? (string)$row[5] : '',
            ];
        } else {
            // Legacy: timestamp_iso, email, ip, user_agent
            $email = isset($row[1]) ? trim((string)$row[1]) : '';
            if ($email === '') continue;
            $key  = strtolower($email);
            $ts   = isset($row[0]) ? (string)$row[0] : '';
            $ipL  = isset($row[2]) ? (string)$row[2] : '';
            $uaL  = isset($row[3]) ? (string)$row[3] : '';

            if (isset($subs[$key])) {
                $subs[$key]['count']++;
                if ($ts !== '' && ($subs[$key]['first'] === '' || $ts < $subs[$key]['first'])) {
                    $subs[$key]['first'] = $ts;
                }
                if ($ts !== '' && $ts > $subs[$key]['last']) {
                    $subs[$key]['last'] = $ts;
                    $subs[$key]['ip']   = $ipL;
                    $subs[$key]['ua']   = $uaL;
                }
            } else {
                $subs[$key] = [
                    'first' => $ts,
                    'last'  => $ts,
                    'email' => $email,
                    'count' => 1,
                    'ip'    => $ipL,
                    'ua'    => $uaL,
                ];
            }
        }
    }
    fclose($fh);
    return $subs;
}

function save_subscribers($csvPath, array $subs) {
    // Temp-file + rename = atomic on the underlying ext4. If anything
    // fails mid-write the original CSV stays intact.
    $tmp = $csvPath . '.tmp';
    $fh  = @fopen($tmp, 'wb');
    if (!$fh) return false;

    fputcsv($fh, ['first_seen_iso', 'last_seen_iso', 'email', 'times_subscribed', 'last_ip', 'last_user_agent']);
    foreach ($subs as $r) {
        fputcsv($fh, [
            isset($r['first']) ? $r['first'] : '',
            isset($r['last'])  ? $r['last']  : '',
            isset($r['email']) ? $r['email'] : '',
            isset($r['count']) ? (int)$r['count'] : 1,
            isset($r['ip'])    ? $r['ip']    : '',
            isset($r['ua'])    ? $r['ua']    : '',
        ]);
    }
    fclose($fh);

    return @rename($tmp, $csvPath);
}

// ───────────────────────────────────────────────────────────────────
// Email body templates — inline so deploy stays one-file-per-upload.
// ───────────────────────────────────────────────────────────────────

function build_confirmation_text() {
    return
        "You're on the list.\n\n" .
        "Asante sana for joining Perxli early access. We launch in 20 days —\n" .
        "you'll be among the first to get the link, plus 3 months of Pro free.\n\n" .
        "While you wait: reply to this email if there's anything you want\n" .
        "us to build in. We read everything.\n\n" .
        "— The Perxli team\n" .
        "hello@perxli.com\n" .
        "https://perxli.com\n";
}

function build_confirmation_html() {
    // Table-based + inline styles — required for Outlook/Yahoo Mail. Dark
    // shell, lime accents, Manrope where available (Helvetica fallback).
    return <<<HTML
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>You're on the list — Perxli</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#f0f0f0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f0f0f;padding:40px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="540" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;width:100%;background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:20px;">

        <!-- Logo -->
        <tr>
          <td style="padding:36px 36px 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;">
                  <div style="width:36px;height:36px;background:#D4F53C;border-radius:9px;text-align:center;line-height:36px;font-weight:900;color:#141414;font-size:18px;font-family:'Manrope',Helvetica,Arial,sans-serif;">P</div>
                </td>
                <td style="padding-left:10px;vertical-align:middle;font-weight:800;font-size:18px;color:#f0f0f0;letter-spacing:-0.5px;">
                  perxli<span style="color:#D4F53C;">.</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Headline -->
        <tr>
          <td style="padding:24px 36px 0;">
            <h1 style="margin:0 0 18px;font-size:32px;font-weight:900;color:#f0f0f0;letter-spacing:-1.5px;line-height:1.1;">
              You're on the list.
            </h1>
            <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#a0a0a0;">
              Asante sana for joining Perxli early access. We launch in <strong style="color:#D4F53C;font-weight:700;">20 days</strong> — you'll be among the first to get the link, plus <strong style="color:#f0f0f0;font-weight:700;">3 months of Pro free</strong>.
            </p>
            <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#a0a0a0;">
              While you wait: reply to this email if there's anything you want us to build in. We read everything.
            </p>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 36px 36px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:#D4F53C;border-radius:11px;">
                  <a href="https://perxli.com" style="display:inline-block;padding:14px 26px;font-size:14px;font-weight:800;color:#141414;text-decoration:none;font-family:'Manrope',Helvetica,Arial,sans-serif;">
                    Visit perxli.com &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 36px;border-top:1px solid rgba(255,255,255,0.07);">
            <p style="margin:0 0 6px;font-size:11px;color:#666;line-height:1.6;">
              You're receiving this because you signed up for Perxli early access at perxli.com.
            </p>
            <p style="margin:0;font-size:11px;color:#666;line-height:1.6;">
              Perxli &middot; Nairobi, Kenya &middot; <a href="mailto:hello@perxli.com" style="color:#a0a0a0;text-decoration:none;">hello@perxli.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
HTML;
}
