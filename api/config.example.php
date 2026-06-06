<?php
/**
 * Coming-soon form configuration.
 *
 * Copy this file to `config.php` and fill in the real values. `config.php`
 * is git-ignored — never commit credentials. On DirectAdmin: upload via
 * FTP/File Manager only, then chmod 600 so other accounts on the same
 * shared host cannot read it.
 */

return [
    // SMTP — your DirectAdmin mailbox. Same value for username + the
    // From address; replying-to the subscriber lands in this inbox.
    'smtp_host'     => 'mail.perxli.com',
    'smtp_port'     => 587,
    'smtp_encrypt'  => 'tls',           // STARTTLS on 587 (use 'ssl' for 465)
    'smtp_user'     => 'hello@perxli.com',
    'smtp_pass'     => 'CHANGE_ME',

    // Where notifications land. Usually same mailbox as smtp_user so
    // server's own auth covers SPF/DKIM and Gmail accepts it cleanly.
    'notify_to'     => 'hello@perxli.com',
    'notify_from'   => 'hello@perxli.com',
    'notify_name'   => 'Perxli',

    // Hosts allowed to POST this form. Origin/Referer must match.
    'allowed_origins' => [
        'https://perxli.com',
        'https://www.perxli.com',
    ],

    // Anti-spam.
    'rate_limit_seconds'  => 30,    // min gap between submits per IP
    'rate_limit_per_day'  => 5,     // max submits per IP per 24h

    // HTTP Basic Auth for api/view.php. Pick a strong password; this is
    // what protects the subscriber list from any walk-by who guesses the
    // URL. Comparison is constant-time (hash_equals).
    'admin_user'          => 'admin',
    'admin_pass'          => 'CHANGE_ME',
];
