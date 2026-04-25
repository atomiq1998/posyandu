<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
requireAuth();

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

if ($method === 'GET' && $id < 1) {
    $wid = isset($_GET['warga_id']) ? (int) $_GET['warga_id'] : 0;
    if ($wid < 1) {
        jsonResponse(['ok' => false, 'error' => 'Parameter warga_id wajib.'], 400);
    }
    if (!wargaIdUnderFive($pdo, $wid)) {
        jsonResponse(['ok' => false, 'error' => 'Bukan data balita (usia harus &lt; 5 tahun) atau warga tidak ada.'], 400);
    }
    $st = $pdo->prepare('SELECT p.*, w.nama, w.nik AS warga_nik FROM pemeriksaan_balita p JOIN warga w ON w.id = p.warga_id WHERE p.warga_id = ? ORDER BY p.tanggal ASC, p.id ASC');
    $st->execute([$wid]);
    $rows = $st->fetchAll();
    jsonResponse(['ok' => true, 'pemeriksaan' => $rows]);
}

if ($method === 'GET' && $id > 0) {
    $st = $pdo->prepare('SELECT p.*, w.nama, w.nik AS warga_nik FROM pemeriksaan_balita p JOIN warga w ON w.id = p.warga_id WHERE p.id = ?');
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row) {
        jsonResponse(['ok' => false, 'error' => 'Data tidak ditemukan.'], 404);
    }
    if (!wargaIdUnderFive($pdo, (int) $row['warga_id'])) {
        jsonResponse(['ok' => false, 'error' => 'Tidak dapat mengakses pemeriksaan untuk warga usia 5+ tahun.'], 400);
    }
    jsonResponse(['ok' => true, 'pemeriksaan' => $row]);
}

if ($method === 'POST') {
    $b = readJsonBody();
    $wid = isset($b['warga_id']) ? (int) $b['warga_id'] : 0;
    $tgl = isset($b['tanggal']) ? trim((string) $b['tanggal']) : '';
    $berat = $b['berat_kg'] ?? null;
    $tinggi = $b['tinggi_cm'] ?? null;
    $cat = null;
    if (isset($b['catatan']) && (string) $b['catatan'] !== '') {
        $cat = (string) $b['catatan'];
    }
    if ($wid < 1) {
        jsonResponse(['ok' => false, 'error' => 'warga_id wajib.'], 400);
    }
    if (!wargaIdUnderFive($pdo, $wid)) {
        jsonResponse(['ok' => false, 'error' => 'Bukan data balita (usia harus &lt; 5 tahun).'], 400);
    }
    if ($tgl === '') {
        jsonResponse(['ok' => false, 'error' => 'Tanggal pemeriksaan wajib.'], 400);
    }
    $d = DateTime::createFromFormat('Y-m-d', $tgl);
    if (!$d || $d->format('Y-m-d') !== $tgl) {
        jsonResponse(['ok' => false, 'error' => 'Tanggal tidak valid (YYYY-MM-DD).'], 400);
    }
    if (!is_numeric($berat) || (float) $berat < 0 || (float) $berat > 50) {
        jsonResponse(['ok' => false, 'error' => 'Berat badan tidak valid.'], 400);
    }
    if (!is_numeric($tinggi) || (float) $tinggi < 0 || (float) $tinggi > 200) {
        jsonResponse(['ok' => false, 'error' => 'Tinggi badan tidak valid.'], 400);
    }
    $st = $pdo->prepare('INSERT INTO pemeriksaan_balita (warga_id, tanggal, berat_kg, tinggi_cm, catatan) VALUES (?,?,?,?,?)');
    $st->execute([$wid, $tgl, (float) $berat, (float) $tinggi, $cat]);
    $newId = (int) $pdo->lastInsertId();
    $st2 = $pdo->prepare('SELECT p.*, w.nama, w.nik AS warga_nik FROM pemeriksaan_balita p JOIN warga w ON w.id = p.warga_id WHERE p.id = ?');
    $st2->execute([$newId]);
    jsonResponse(['ok' => true, 'pemeriksaan' => $st2->fetch()], 201);
}

if ($method === 'PUT' && $id > 0) {
    $b = readJsonBody();
    $st0 = $pdo->prepare('SELECT warga_id FROM pemeriksaan_balita WHERE id = ?');
    $st0->execute([$id]);
    $row0 = $st0->fetch();
    if (!$row0) {
        jsonResponse(['ok' => false, 'error' => 'Data tidak ditemukan.'], 404);
    }
    if (!wargaIdUnderFive($pdo, (int) $row0['warga_id'])) {
        jsonResponse(['ok' => false, 'error' => 'Tidak dapat memperbarui.'], 400);
    }
    $tgl = array_key_exists('tanggal', $b) ? trim((string) $b['tanggal']) : null;
    $berat = $b['berat_kg'] ?? null;
    $tinggi = $b['tinggi_cm'] ?? null;
    $cat = array_key_exists('catatan', $b) ? ($b['catatan'] === null || (string) $b['catatan'] === '' ? null : (string) $b['catatan']) : null;

    $st = $pdo->prepare('SELECT p.*, w.nama, w.nik AS warga_nik FROM pemeriksaan_balita p JOIN warga w ON w.id = p.warga_id WHERE p.id = ?');
    $st->execute([$id]);
    $cur = $st->fetch();
    if ($tgl === null) {
        $tgl = (string) $cur['tanggal'];
    } else {
        $d = DateTime::createFromFormat('Y-m-d', $tgl);
        if (!$d || $d->format('Y-m-d') !== $tgl) {
            jsonResponse(['ok' => false, 'error' => 'Tanggal tidak valid (YYYY-MM-DD).'], 400);
        }
    }
    if (!is_numeric($berat) || (float) $berat < 0) {
        $berat = $cur['berat_kg'];
    } else {
        $berat = (float) $berat;
    }
    if (!is_numeric($tinggi) || (float) $tinggi < 0) {
        $tinggi = $cur['tinggi_cm'];
    } else {
        $tinggi = (float) $tinggi;
    }
    if (array_key_exists('catatan', $b) === false) {
        $cat = $cur['catatan'];
    }
    $up = $pdo->prepare('UPDATE pemeriksaan_balita SET tanggal=?, berat_kg=?, tinggi_cm=?, catatan=? WHERE id=?');
    $up->execute([$tgl, $berat, $tinggi, $cat, $id]);
    $st2 = $pdo->prepare('SELECT p.*, w.nama, w.nik AS warga_nik FROM pemeriksaan_balita p JOIN warga w ON w.id = p.warga_id WHERE p.id = ?');
    $st2->execute([$id]);
    jsonResponse(['ok' => true, 'pemeriksaan' => $st2->fetch()]);
}

if ($method === 'DELETE' && $id > 0) {
    $st0 = $pdo->prepare('SELECT warga_id FROM pemeriksaan_balita WHERE id = ?');
    $st0->execute([$id]);
    $row0 = $st0->fetch();
    if (!$row0) {
        jsonResponse(['ok' => false, 'error' => 'Data tidak ditemukan.'], 404);
    }
    if (!wargaIdUnderFive($pdo, (int) $row0['warga_id'])) {
        jsonResponse(['ok' => false, 'error' => 'Tidak dapat menghapus.'], 400);
    }
    $pdo->prepare('DELETE FROM pemeriksaan_balita WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}

http_response_code(405);
jsonResponse(['ok' => false, 'error' => 'Method not allowed'], 405);
