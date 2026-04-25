<?php
declare(strict_types=1);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once dirname(__DIR__) . '/bootstrap.php';

if (empty($_SESSION['user_id'])) {
    jsonResponse(['ok' => false, 'authenticated' => false], 200);
}

jsonResponse([
    'ok'            => true,
    'authenticated' => true,
    'user'          => [
        'id'       => (int) $_SESSION['user_id'],
        'username' => (string) ($_SESSION['username'] ?? ''),
    ],
]);
