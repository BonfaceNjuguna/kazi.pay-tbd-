<?php
/**
 * Diagnostic — visit this in a browser:
 *   https://perxli.com/api/test.php
 *
 * Written for maximum compatibility (PHP 5.6+). Prints whatever
 * goes wrong straight into the page. DELETE AFTER DEBUGGING.
 */

// Force all errors visible — first thing, before any code that could fail.
@ini_set('display_errors', '1');
@ini_set('display_startup_errors', '1');
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');

// Catch fatal-ish things and print them.
set_error_handler(function ($severity, $message, $file, $line) {
    echo "[ERROR] $message at $file:$line (severity=$severity)\n";
    return true;
});
set_exception_handler(function ($e) {
    echo "[EXCEPTION] " . get_class($e) . ': ' . $e->getMessage()
        . ' at ' . $e->getFile() . ':' . $e->getLine() . "\n";
});
register_shutdown_function(function () {
    $err = error_get_last();
    if ($err && in_array($err['type'], array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR))) {
        echo "\n[FATAL] " . $err['message'] . ' at ' . $err['file'] . ':' . $err['line'] . "\n";
    }
});

function row($label, $ok, $detail) {
    echo '[' . ($ok ? 'OK  ' : 'FAIL') . '] ' . $label . ' — ' . $detail . "\n";
}

echo "=== Perxli form diagnostic ===\n\n";
echo 'PHP version:    ' . PHP_VERSION . "\n";
echo 'PHP SAPI:       ' . php_sapi_name() . "\n";
echo 'Script path:    ' . __FILE__ . "\n";
echo 'Server time:    ' . date('c') . "\n";
echo 'Server name:    ' . (isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : '-') . "\n";
echo 'Document root:  ' . (isset($_SERVER['DOCUMENT_ROOT']) ? $_SERVER['DOCUMENT_ROOT'] : '-') . "\n\n";

echo "--- Files ---\n";
$paths = array(
    'config.php'                 => __DIR__ . '/config.php',
    'phpmailer/PHPMailer.php'    => __DIR__ . '/phpmailer/PHPMailer.php',
    'phpmailer/SMTP.php'         => __DIR__ . '/phpmailer/SMTP.php',
    'phpmailer/Exception.php'    => __DIR__ . '/phpmailer/Exception.php',
);
foreach ($paths as $label => $path) {
    $exists = file_exists($path);
    $readable = $exists && is_readable($path);
    row($label, $readable, $exists ? ($readable ? 'readable' : 'exists but UNREADABLE — chmod 644') : 'MISSING — re-upload');
}

echo "\n--- Write permissions ---\n";
$probe = __DIR__ . '/.write-probe';
$wrote = @file_put_contents($probe, 'x');
$writable = $wrote !== false;
if ($writable) @unlink($probe);
row('api/ writable (for log + CSV)', $writable, $writable ? __DIR__ : 'CANNOT WRITE — chmod 755 on api/');

$rlDir = __DIR__ . '/rate_limit';
if (!is_dir($rlDir)) @mkdir($rlDir, 0755, true);
row('rate_limit/ exists', is_dir($rlDir), $rlDir);

echo "\n--- Config ---\n";
$config = null;
if (is_readable(__DIR__ . '/config.php')) {
    $config = require __DIR__ . '/config.php';
}
row('config.php parses to array', is_array($config),
    is_array($config) ? (count($config) . ' keys') : 'NOT AN ARRAY');

if (is_array($config)) {
    foreach (array('smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'notify_to') as $k) {
        $v = isset($config[$k]) ? $config[$k] : null;
        $present = !empty($v);
        if ($k === 'smtp_pass') {
            $detail = $present ? ('*** ' . strlen((string)$v) . ' chars ***') : '(missing)';
        } else {
            $detail = $present ? (string)$v : '(missing)';
        }
        row('config.' . $k, $present, $detail);
    }
}

echo "\n--- PHP extensions ---\n";
foreach (array('openssl', 'curl', 'mbstring', 'filter', 'sockets') as $ext) {
    row("ext-$ext", extension_loaded($ext), extension_loaded($ext) ? 'loaded' : 'NOT LOADED');
}

echo "\n--- TCP reachability ---\n";
if (is_array($config) && !empty($config['smtp_host'])) {
    $host = (string)$config['smtp_host'];
    $port = isset($config['smtp_port']) ? (int)$config['smtp_port'] : 587;
    $errno = 0; $errstr = '';
    $fp = @stream_socket_client('tcp://' . $host . ':' . $port, $errno, $errstr, 10);
    if ($fp) {
        $greeting = trim((string)fgets($fp, 1024));
        fclose($fp);
        row('TCP ' . $host . ':' . $port, true, 'greeting: ' . $greeting);
    } else {
        row('TCP ' . $host . ':' . $port, false, 'errno=' . $errno . ' errstr=' . $errstr);
    }

    // Also try localhost — DirectAdmin sometimes blocks outbound public SMTP
    // and you must relay through 127.0.0.1.
    $errno = 0; $errstr = '';
    $fp = @stream_socket_client('tcp://127.0.0.1:' . $port, $errno, $errstr, 5);
    if ($fp) {
        $greeting = trim((string)fgets($fp, 1024));
        fclose($fp);
        row('TCP 127.0.0.1:' . $port, true, 'greeting: ' . $greeting);
    } else {
        row('TCP 127.0.0.1:' . $port, false, 'errno=' . $errno . ' errstr=' . $errstr);
    }
}

echo "\n--- SMTP live send ---\n";
if (is_array($config)
    && is_readable(__DIR__ . '/phpmailer/PHPMailer.php')
    && is_readable(__DIR__ . '/phpmailer/SMTP.php')
    && is_readable(__DIR__ . '/phpmailer/Exception.php')
) {
    require_once __DIR__ . '/phpmailer/Exception.php';
    require_once __DIR__ . '/phpmailer/PHPMailer.php';
    require_once __DIR__ . '/phpmailer/SMTP.php';

    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->SMTPDebug = 2;
        $mail->Debugoutput = function ($str, $level) {
            echo '  smtp[' . $level . '] ' . rtrim($str) . "\n";
        };
        $mail->isSMTP();
        $mail->Host       = (string)$config['smtp_host'];
        $mail->Port       = (int)$config['smtp_port'];
        $mail->SMTPAuth   = true;
        $mail->Username   = (string)$config['smtp_user'];
        $mail->Password   = (string)$config['smtp_pass'];
        $encrypt = isset($config['smtp_encrypt']) ? (string)$config['smtp_encrypt'] : 'tls';
        $mail->SMTPSecure = ($encrypt === 'ssl')
            ? PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS
            : PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Timeout    = 15;
        $mail->setFrom((string)$config['notify_from'], 'Perxli');
        $mail->addAddress((string)$config['notify_to']);
        $mail->Subject = 'Perxli diagnostic ' . date('H:i:s');
        $mail->Body    = 'Sent by test.php at ' . date('c');
        $mail->send();
        echo "[OK  ] SMTP send completed — check " . $config['notify_to'] . "\n";
    } catch (Exception $e) {
        echo "[FAIL] PHPMailer exception: " . $e->getMessage() . "\n";
        if (isset($mail) && isset($mail->ErrorInfo)) {
            echo "       ErrorInfo: " . $mail->ErrorInfo . "\n";
        }
    } catch (Error $e) {
        // PHP 7+: Error is a separate hierarchy from Exception.
        echo "[FAIL] PHP Error during SMTP send: " . $e->getMessage() . "\n";
    }
} else {
    echo "skipped — config or PHPMailer not loaded\n";
}

echo "\n=== done ===\nDELETE THIS FILE.\n";
