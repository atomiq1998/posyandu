<?php
declare(strict_types=1);

const APP_BASE = '/psynd/';

$cookiePath = rtrim(APP_BASE, '/');
if ($cookiePath === '') {
    $cookiePath = '/';
} else {
    $cookiePath = $cookiePath . '/';
}

session_set_cookie_params([
    'path'     => $cookiePath,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_name('posyandu');
session_start();

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__) . '/config/db.php';

function jsonResponse(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function requireAuth(): void
{
    if (empty($_SESSION['user_id'])) {
        jsonResponse(['ok' => false, 'error' => 'Unauthorized'], 401);
    }
}

function wargaIdUnderFive(PDO $pdo, int $wargaId): bool
{
    $s = $pdo->prepare('SELECT TIMESTAMPDIFF(YEAR, tanggal_lahir, CURDATE()) AS y FROM warga WHERE id = ?');
    $s->execute([$wargaId]);
    $r = $s->fetch();
    if (!$r) {
        return false;
    }
    return (int) $r['y'] < 5;
}
