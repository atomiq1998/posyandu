<?php
declare(strict_types=1);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once dirname(__DIR__) . '/bootstrap.php';
requireAuth();

$body = readJsonBody();
$cur = isset($body['current_password']) ? (string) $body['current_password'] : '';
$new = isset($body['new_password']) ? (string) $body['new_password'] : '';

if ($cur === '' || $new === '') {
    jsonResponse(['ok' => false, 'error' => 'Password lama dan password baru wajib.'], 400);
}

if (strlen($new) < 8) {
    jsonResponse(['ok' => false, 'error' => 'Password baru minimal 8 karakter.'], 400);
}

$uid = (int) $_SESSION['user_id'];
$st = db()->prepare('SELECT id, password_hash FROM users WHERE id = ? LIMIT 1');
$st->execute([$uid]);
$row = $st->fetch();
if (!$row) {
    jsonResponse(['ok' => false, 'error' => 'Pengguna tidak ditemukan.'], 404);
}

if (!password_verify($cur, (string) $row['password_hash'])) {
    jsonResponse(['ok' => false, 'error' => 'Password lama salah.'], 400);
}

$hash = password_hash($new, PASSWORD_BCRYPT);
$up = db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
$up->execute([$hash, $uid]);

jsonResponse(['ok' => true]);
