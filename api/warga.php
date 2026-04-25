<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
requireAuth();

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$q = isset($_GET['q']) ? trim((string) $_GET['q']) : '';

function normalizeWargaInput(array $b, ?array $existing = null): array
{
    $o = $existing ? $existing : [
        'alamat' => '', 'no_kk' => null, 'nama' => '', 'nik' => '',
        'tempat_lahir' => null, 'tanggal_lahir' => null,
        'jenis_kelamin' => 'L', 'agama' => null, 'warga_negara' => 'WNI',
        'hubungan_keluarga' => null, 'status_nikah' => null,
        'pendidikan' => null, 'pekerjaan' => null, 'status' => 'aktif',
    ];
    foreach (['alamat', 'no_kk', 'nama', 'nik', 'tempat_lahir', 'agama', 'warga_negara', 'hubungan_keluarga', 'status_nikah', 'pendidikan', 'pekerjaan', 'status'] as $k) {
        if (array_key_exists($k, $b)) {
            $v = $b[$k];
            $o[$k] = $v === null || $v === '' ? (in_array($k, ['no_kk', 'tempat_lahir', 'agama', 'hubungan_keluarga', 'status_nikah', 'pendidikan', 'pekerjaan'], true) ? null : (string) $v) : trim((string) $v);
        }
    }
    if (array_key_exists('tanggal_lahir', $b)) {
        $o['tanggal_lahir'] = (string) $b['tanggal_lahir'];
    }
    if (array_key_exists('jenis_kelamin', $b)) {
        $jk = (string) $b['jenis_kelamin'];
        $o['jenis_kelamin'] = strtoupper($jk) === 'P' ? 'P' : 'L';
    }
    if ($o['warga_negara'] === null || $o['warga_negara'] === '') {
        $o['warga_negara'] = 'WNI';
    }
    if ($o['status'] === null || $o['status'] === '') {
        $o['status'] = 'aktif';
    }
    return $o;
}

function validateWargaForSave(array $o, bool $isNew): ?string
{
    $o['nik'] = preg_replace('/\D/', '', (string) ($o['nik'] ?? ''));
    if ($o['nama'] === '') {
        return 'Nama wajib diisi.';
    }
    $nik = (string) $o['nik'];
    if (strlen($nik) < 10 || strlen($nik) > 16) {
        return 'NIK harus 10–16 digit angka.';
    }
    $o['nik'] = $nik;
    if (empty($o['tanggal_lahir'])) {
        return 'Tanggal lahir wajib diisi.';
    }
    $d = DateTime::createFromFormat('Y-m-d', (string) $o['tanggal_lahir']);
    if (!$d || $d->format('Y-m-d') !== (string) $o['tanggal_lahir']) {
        return 'Tanggal lahir tidak valid (format YYYY-MM-DD).';
    }
    return null;
}

if ($method === 'GET' && $id < 1) {
    if ($q !== '') {
        $s = $pdo->prepare('SELECT * FROM warga WHERE nama LIKE ? OR nik LIKE ? ORDER BY nama');
        $like = '%' . $q . '%';
        $s->execute([$like, $like]);
    } else {
        $s = $pdo->query('SELECT * FROM warga ORDER BY nama');
    }
    $rows = $s->fetchAll();
    jsonResponse(['ok' => true, 'warga' => $rows]);
}

if ($method === 'GET' && $id > 0) {
    $st = $pdo->prepare('SELECT * FROM warga WHERE id = ?');
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row) {
        jsonResponse(['ok' => false, 'error' => 'Warga tidak ditemukan.'], 404);
    }
    jsonResponse(['ok' => true, 'warga' => $row]);
}

if ($method === 'POST') {
    $b = readJsonBody();
    $o = normalizeWargaInput($b, null);
    $err = validateWargaForSave($o, true);
    if ($err !== null) {
        jsonResponse(['ok' => false, 'error' => $err], 400);
    }
    $o['nik'] = preg_replace('/\D/', '', (string) $o['nik']);
    try {
        $st = $pdo->prepare(
            'INSERT INTO warga (alamat, no_kk, nama, nik, tempat_lahir, tanggal_lahir, jenis_kelamin, agama, warga_negara, hubungan_keluarga, status_nikah, pendidikan, pekerjaan, status)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        $st->execute([
            $o['alamat'] ?: null,
            $o['no_kk'],
            $o['nama'],
            $o['nik'],
            $o['tempat_lahir'],
            $o['tanggal_lahir'],
            $o['jenis_kelamin'],
            $o['agama'],
            $o['warga_negara'],
            $o['hubungan_keluarga'],
            $o['status_nikah'],
            $o['pendidikan'],
            $o['pekerjaan'],
            $o['status'],
        ]);
    } catch (PDOException $e) {
        if (str_contains($e->getMessage(), 'warga_nik') || (int) $e->getCode() === 23000) {
            jsonResponse(['ok' => false, 'error' => 'NIK sudah terdaftar.'], 409);
        }
        throw $e;
    }
    $newId = (int) $pdo->lastInsertId();
    $st2 = $pdo->prepare('SELECT * FROM warga WHERE id = ?');
    $st2->execute([$newId]);
    jsonResponse(['ok' => true, 'warga' => $st2->fetch()], 201);
}

if ($method === 'PUT' && $id > 0) {
    $st = $pdo->prepare('SELECT * FROM warga WHERE id = ?');
    $st->execute([$id]);
    $ex = $st->fetch();
    if (!$ex) {
        jsonResponse(['ok' => false, 'error' => 'Warga tidak ditemukan.'], 404);
    }
    $b = readJsonBody();
    $o = normalizeWargaInput($b, $ex);
    $err = validateWargaForSave($o, false);
    if ($err !== null) {
        jsonResponse(['ok' => false, 'error' => $err], 400);
    }
    $o['nik'] = preg_replace('/\D/', '', (string) $o['nik']);
    if ((string) $ex['nik'] !== (string) $o['nik']) {
        $chk = $pdo->prepare('SELECT id FROM warga WHERE nik = ? AND id != ?');
        $chk->execute([$o['nik'], $id]);
        if ($chk->fetch()) {
            jsonResponse(['ok' => false, 'error' => 'NIK sudah dipakai warga lain.'], 409);
        }
    }
    $st = $pdo->prepare(
        'UPDATE warga SET alamat=?, no_kk=?, nama=?, nik=?, tempat_lahir=?, tanggal_lahir=?, jenis_kelamin=?, agama=?, warga_negara=?, hubungan_keluarga=?, status_nikah=?, pendidikan=?, pekerjaan=?, status=? WHERE id=?'
    );
    $st->execute([
        $o['alamat'] ?: null,
        $o['no_kk'],
        $o['nama'],
        $o['nik'],
        $o['tempat_lahir'],
        $o['tanggal_lahir'],
        $o['jenis_kelamin'],
        $o['agama'],
        $o['warga_negara'],
        $o['hubungan_keluarga'],
        $o['status_nikah'],
        $o['pendidikan'],
        $o['pekerjaan'],
        $o['status'],
        $id,
    ]);
    $st2 = $pdo->prepare('SELECT * FROM warga WHERE id = ?');
    $st2->execute([$id]);
    jsonResponse(['ok' => true, 'warga' => $st2->fetch()]);
}

if ($method === 'DELETE' && $id > 0) {
    $st = $pdo->prepare('DELETE FROM warga WHERE id = ?');
    $st->execute([$id]);
    if ($st->rowCount() === 0) {
        jsonResponse(['ok' => false, 'error' => 'Warga tidak ditemukan.'], 404);
    }
    jsonResponse(['ok' => true]);
}

http_response_code(405);
jsonResponse(['ok' => false, 'error' => 'Method not allowed'], 405);
