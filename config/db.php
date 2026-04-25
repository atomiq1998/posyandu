<?php
declare(strict_types=1);


/**
 * Sesuaikan host, nama database, user, dan password MySQL lokal XAMPP.
 */
const DB_HOST = 'ttki1b.h.filess.io';
const DB_NAME = 'posyandu_dependcame';
const DB_USER = 'posyandu_dependcame';
const DB_PORT = "61031";
const DB_PASS = '[Credentials]';
const DB_CHARSET = 'utf8mb4';


function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

