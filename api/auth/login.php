<?php
declare(strict_types=1);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once dirname(__DIR__) . '/bootstrap.php';

$body = readJsonBody();
$u = isset($body['username']) ? trim((string) $body['username']) : '';
$p = isset($body['password']) ? (string) $body['password'] : '';

if ($u === '' || $p === '') {
    jsonResponse(['ok' => false, 'error' => 'Username dan password wajib.'], 400);
}

$st = db()->prepare('SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1');
$st->execute([$u]);
$row = $st->fetch();

if (!$row || !password_verify($p, (string) $row['password_hash'])) {
    jsonResponse(['ok' => false, 'error' => 'User atau password salah.'], 401);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $row['id'];
$_SESSION['username'] = (string) $row['username'];

jsonResponse([
    'ok'   => true,
    'user' => ['id' => (int) $row['id'], 'username' => (string) $row['username']],
]);
