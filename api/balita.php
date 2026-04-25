<?php
declare(strict_types=1);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/bootstrap.php';
requireAuth();

$pdo = db();
$sql = 'SELECT w.*,
  TIMESTAMPDIFF(MONTH, w.tanggal_lahir, CURDATE()) AS umur_bulan,
  TIMESTAMPDIFF(YEAR, w.tanggal_lahir, CURDATE()) AS umur_tahun
  FROM warga w
  WHERE TIMESTAMPDIFF(YEAR, w.tanggal_lahir, CURDATE()) < 5
  ORDER BY w.tanggal_lahir DESC, w.nama';
$st = $pdo->query($sql);
$rows = $st->fetchAll();

jsonResponse(['ok' => true, 'balita' => $rows]);
