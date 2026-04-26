(function () {
  'use strict';

  /* Wajib untuk loadWarga: jika core.js gagal dimuat, jangan hentikan sisa app.js. */
  if (typeof window.apiPath !== 'function') {
    window.appPathPrefix = function () {
      const p = location.pathname;
      if (p.endsWith('/')) {
        return p;
      }
      if (p.lastIndexOf('.') > p.lastIndexOf('/')) {
        return p.replace(/\/[^/]+\.[^/]+$/, '/');
      }
      return p + '/';
    };
    window.apiPath = function (sub) {
      return window.appPathPrefix() + 'api/' + (sub || '').replace(/^\//, '');
    };
  }

  const pages = [].slice.call(document.querySelectorAll('.page'));
  const esc = (function () {
    const d = document.createElement('div');
    return function (s) {
      d.textContent = s;
      return d.innerHTML;
    };
  })();

  /** Tampilkan kolom DATE / ISO (…T00:00:00.000Z) sebagai YYYY-MM-DD. */
  function dateOnly(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'object' && v instanceof Date && !Number.isNaN(v.getTime())) {
      return v.toISOString().split('T')[0];
    }
    const s = String(v).trim();
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : s;
  }

  function get(path, opts) {
    return fetch(window.apiPath(path), { credentials: 'include', method: 'GET' }).then(function (r) {
      return r.json().then(function (d) {
        d._status = r.status;
        return d;
      });
    });
  }

  function jsend(method, path, body) {
    const o = { method: method, credentials: 'include' };
    if (body != null) {
      o.headers = { 'Content-Type': 'application/json' };
      o.body = JSON.stringify(body);
    }
    return fetch(window.apiPath(path), o).then(function (r) {
      return r.json().then(function (d) {
        d._status = r.status;
        return d;
      });
    });
  }

  function showPage(name) {
    pages.forEach(function (p) {
      p.hidden = p.getAttribute('data-page') !== name;
    });
    if (name === 'warga') {
      loadWarga();
    }
    if (name === 'balita') {
      loadBalita();
    }
    if (name === 'pemeriksaan') {
      loadBalitaSelect();
      onPmrWargaChange();
    }
  }

  // --- Auth
  get('auth/me.php').then(function (d) {
    if (!d.ok || !d.authenticated) {
      location.replace('login.html');
    }
  });

  (function regLogout() {
    const bLogout = document.getElementById('b-logout');
    if (bLogout) {
      bLogout.addEventListener('click', function () {
        jsend('POST', 'auth/logout.php', null).then(function () {
          location.replace('login.html');
        });
      });
    }
  })();

  (function regChangePassword() {
    const m = document.getElementById('m-cp');
    const bOpen = document.getElementById('b-change-password');
    const bx = document.getElementById('m-cp-x');
    const bok = document.getElementById('m-cp-ok');
    const emsg = document.getElementById('m-cp-e');
    const cur = document.getElementById('cp-cur');
    const nw = document.getElementById('cp-new');
    const n2 = document.getElementById('cp-new2');
    if (!m || !bok) {
      return;
    }
    function showErr(t) {
      if (emsg) {
        emsg.textContent = t || '';
        if (t) emsg.removeAttribute('hidden');
        else emsg.setAttribute('hidden', '');
      }
    }
    function openM() {
      if (cur) cur.value = '';
      if (nw) nw.value = '';
      if (n2) n2.value = '';
      showErr('');
      m.removeAttribute('hidden');
      m.setAttribute('aria-hidden', 'false');
    }
    function closeM() {
      m.setAttribute('hidden', '');
      m.setAttribute('aria-hidden', 'true');
    }
    if (bOpen) {
      bOpen.addEventListener('click', function () { openM(); });
    }
    if (bx) {
      bx.addEventListener('click', function () { closeM(); });
    }
    m.addEventListener('click', function (e) { if (e.target === m) closeM(); });
    bok.addEventListener('click', function () {
      showErr('');
      const a = (nw && nw.value) ? String(nw.value) : '';
      const b = (n2 && n2.value) ? String(n2.value) : '';
      if (a !== b) {
        showErr('Password baru dan ulangan tidak sama.');
        return;
      }
      if (a.length < 8) {
        showErr('Password baru minimal 8 karakter.');
        return;
      }
      const oldPw = (cur && cur.value) ? String(cur.value) : '';
      if (!oldPw) {
        showErr('Isi password lama.');
        return;
      }
      jsend('POST', 'auth/change-password.php', {
        current_password: oldPw,
        new_password: a
      }).then(function (d) {
        if (d._status === 401) {
          location.replace('login.html');
          return;
        }
        if (d._status === 400 && d.error) {
          showErr(d.error);
          return;
        }
        if (d.ok) {
          closeM();
          window.alert('Password berhasil diubah.');
        } else {
          showErr(d.error || 'Gagal mengubah password');
        }
      });
    });
  })();

  [].forEach.call(document.querySelectorAll('[data-to]'), function (b) {
    b.addEventListener('click', function () {
      showPage(b.getAttribute('data-to'));
    });
  });

  // showPage('warga') dipanggil di akhir file, setelah semua listener, agar get() tidak hentikan inisialisasi

  // --- Warga
  const wargaTb = document.getElementById('warga-tb');
  const wargaQ = document.getElementById('warga-q');
  const mW = document.getElementById('m-w');
  let wargaSearchTimer = null;

  function loadWarga() {
    const q = (wargaQ && wargaQ.value) ? wargaQ.value.trim() : '';
    const p = q ? 'warga.php?' + new URLSearchParams({ q: q }) : 'warga.php';
    return get(p).then(function (d) {
      if (d._status === 401) {
        location.replace('login.html');
        return;
      }
      if (!wargaTb) {
        return;
      }
      wargaTb.innerHTML = '';
      (d.warga || []).forEach(function (w) {
        const a = w.alamat || '';
        const shortA = a.length > 50 ? a.slice(0, 50) + '…' : a;
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td><a href="#detail-warga" class="w-link-nik" data-warga-id="' + w.id + '">' + esc(String(w.nik)) + '</a></td>' +
          '<td>' + esc(String(w.nama)) + '</td>' +
          '<td>' + esc(dateOnly(w.tanggal_lahir)) + '</td>' +
          '<td>' + esc(String(w.jenis_kelamin)) + '</td>' +
          '<td class="muted">' + esc(shortA) + '</td>';
        wargaTb.appendChild(tr);
      });
      wargaTb.querySelectorAll('a.w-link-nik').forEach(function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          bukaWargaDetail(parseInt(a.getAttribute('data-warga-id'), 10));
        });
      });
    });
  }

  if (wargaQ) {
    wargaQ.addEventListener('input', function () {
      if (wargaSearchTimer) clearTimeout(wargaSearchTimer);
      wargaSearchTimer = setTimeout(function () { loadWarga(); }, 350);
    });
  }

  function tutupModalWarga() {
    const modal = document.getElementById('m-w') || mW;
    if (!modal) {
      return;
    }
    modal.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('is-open');
    modal.style.removeProperty('display');
  }

  function tampilkanModalW() {
    const modal = document.getElementById('m-w') || mW;
    if (!modal) {
      return;
    }
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    modal.style.setProperty('display', 'flex', 'important');
  }

  function bukaTambahWarga() {
    const mt = document.getElementById('m-w-t');
    if (mt) mt.textContent = 'Tambah warga';
    const wid = document.getElementById('w-id');
    if (wid) wid.value = '';
    const fw = document.getElementById('f-w');
    if (fw) {
      try {
        fw.reset();
      } catch (e1) {
        /* abaikan */
      }
    }
    const wwn = document.getElementById('w-wn');
    if (wwn) wwn.value = 'WNI';
    const merr = document.getElementById('m-w-e');
    if (merr) merr.setAttribute('hidden', '');
    tampilkanModalW();
  }

  window.psyBukaTambahWarga = bukaTambahWarga;

  (function regTambahWarga() {
    const el = document.getElementById('warga-new');
    if (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        bukaTambahWarga();
      });
    } else {
      const shell = document.getElementById('app');
      if (shell) {
        shell.addEventListener('click', function (e) {
          const t = e.target;
          if (!t) {
            return;
          }
          const elNode = t.nodeType === 1 ? t : t.parentElement;
          if (!elNode || !elNode.closest || !elNode.closest('#warga-new')) {
            return;
          }
          e.preventDefault();
          bukaTambahWarga();
        });
      }
    }
  })();

  (function regModalW() {
    const bx = document.getElementById('m-w-x');
    if (bx && mW) {
      bx.addEventListener('click', function () { tutupModalWarga(); });
      mW.addEventListener('click', function (e) {
        if (e.target === mW) tutupModalWarga();
      });
    }
  })();

  var detailWargaId = null;

  function tutupModalDetailW() {
    const m = document.getElementById('m-w-d');
    if (!m) {
      return;
    }
    m.setAttribute('hidden', '');
    m.setAttribute('aria-hidden', 'true');
    m.classList.remove('is-open');
    m.style.removeProperty('display');
    detailWargaId = null;
  }

  function tampilkanModalDetailW() {
    const m = document.getElementById('m-w-d');
    if (!m) {
      return;
    }
    m.removeAttribute('hidden');
    m.setAttribute('aria-hidden', 'false');
    m.classList.add('is-open');
    m.style.setProperty('display', 'flex', 'important');
  }

  function wargaJkLabel(v) {
    if (v === 'P' || v === 'p') {
      return 'Perempuan';
    }
    if (v === 'L' || v === 'l') {
      return 'Laki-laki';
    }
    return v == null || v === '' ? '—' : String(v);
  }

  function setDetWarga(id, v) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = v == null || (typeof v === 'string' && v.trim() === '') ? '—' : String(v);
    }
  }

  function bukaWargaDetail(wid) {
    if (wid < 1) {
      return;
    }
    get('warga.php?id=' + encodeURIComponent(String(wid))).then(function (d) {
      if (d._status === 401) {
        location.replace('login.html');
        return;
      }
      if (d._status === 404 || !d.warga) {
        window.alert('Data warga tidak ditemukan.');
        return;
      }
      const w = d.warga;
      detailWargaId = wid;
      setDetWarga('wd-nik', w.nik);
      setDetWarga('wd-nama', w.nama);
      setDetWarga('wd-kk', w.no_kk);
      setDetWarga('wd-alamat', w.alamat);
      setDetWarga('wd-tl', w.tempat_lahir);
      setDetWarga('wd-tg', dateOnly(w.tanggal_lahir));
      setDetWarga('wd-jk', wargaJkLabel(w.jenis_kelamin));
      setDetWarga('wd-ag', w.agama);
      setDetWarga('wd-wn', w.warga_negara);
      setDetWarga('wd-hb', w.hubungan_keluarga);
      setDetWarga('wd-sn', w.status_nikah);
      setDetWarga('wd-pd', w.pendidikan);
      setDetWarga('wd-pj', w.pekerjaan);
      setDetWarga('wd-st', w.status);
      const meta = document.getElementById('wd-meta');
      if (meta) {
        const cr = w.created_at || '—';
        const up = w.updated_at;
        if (up && up !== w.created_at) {
          meta.textContent = 'Tercatat: ' + cr + ' · Diperbarui: ' + up;
        } else {
          meta.textContent = 'Tercatat: ' + cr;
        }
      }
      const t = document.getElementById('m-w-d-t');
      if (t) {
        t.textContent = 'Detail warga — ' + (w.nama ? String(w.nama) : 'Warga');
      }
      tampilkanModalDetailW();
    });
  }

  (function regModalDetailW() {
    const m = document.getElementById('m-w-d');
    const bt = document.getElementById('m-w-d-tutup');
    const bu = document.getElementById('m-w-d-ubah');
    const bh = document.getElementById('m-w-d-hapus');
    if (bt) {
      bt.addEventListener('click', function () { tutupModalDetailW(); });
    }
    if (bh) {
      bh.addEventListener('click', function () {
        if (!detailWargaId) return;
        if (!window.confirm('Hapus warga ini? Data pemeriksaan balita terkait ikut terhapus.')) return;
        jsend('DELETE', 'warga.php?id=' + encodeURIComponent(String(detailWargaId)), null).then(function (d) {
          if (d._status === 401) location.replace('login.html');
          if (d.ok) {
            tutupModalDetailW();
            loadWarga();
            if (document.querySelector('[data-page="balita"]') && !document.querySelector('[data-page="balita"]').hidden) {
              loadBalita();
            }
            if (document.querySelector('[data-page="pemeriksaan"]') && !document.querySelector('[data-page="pemeriksaan"]').hidden) {
              loadBalitaSelect();
              onPmrWargaChange();
            }
          } else {
            window.alert((d && d.error) || 'Gagal menghapus');
          }
        });
      });
    }
    if (bu) {
      bu.addEventListener('click', function () {
        const id = detailWargaId;
        tutupModalDetailW();
        if (id) {
          openWargaEdit(id);
        }
      });
    }
    if (m) {
      m.addEventListener('click', function (e) {
        if (e.target === m) {
          tutupModalDetailW();
        }
      });
    }
  })();

  function wargaPayload() {
    return {
      alamat: (document.getElementById('w-a') || {}).value,
      no_kk: (document.getElementById('w-kk') || {}).value,
      nama: (document.getElementById('w-nm') || {}).value,
      nik: (document.getElementById('w-nk') || {}).value,
      tempat_lahir: (document.getElementById('w-tl') || {}).value,
      tanggal_lahir: (document.getElementById('w-tg') || {}).value,
      jenis_kelamin: (document.getElementById('w-jk') || {}).value,
      agama: (document.getElementById('w-ag') || {}).value,
      warga_negara: (document.getElementById('w-wn') || {}).value,
      hubungan_keluarga: (document.getElementById('w-hb') || {}).value,
      status_nikah: (document.getElementById('w-sn') || {}).value,
      pendidikan: (document.getElementById('w-pd') || {}).value,
      pekerjaan: (document.getElementById('w-pj') || {}).value,
      status: (document.getElementById('w-st') || {}).value,
    };
  }

  (function regWargaSimpan() {
    const o = document.getElementById('m-w-ok');
    if (o) {
      o.addEventListener('click', function () {
        const err = document.getElementById('m-w-e');
        if (err) err.setAttribute('hidden', '');
        const id = (document.getElementById('w-id') && document.getElementById('w-id').value) ? document.getElementById('w-id').value.trim() : '';
        const p = wargaPayload();
        const pReq = id
          ? jsend('PUT', 'warga.php?id=' + encodeURIComponent(id), p)
          : jsend('POST', 'warga.php', p);
        pReq.then(function (d) {
            if (d._status === 401) location.replace('login.html');
            if (d.ok) {
              tutupModalWarga();
              loadWarga();
              if (document.querySelector('.page[data-page="pemeriksaan"]') && !document.querySelector('.page[data-page="pemeriksaan"]').hidden) {
                loadBalitaSelect();
                onPmrWargaChange();
              }
            } else if (err) {
              err.textContent = d.error || 'Gagal simpan';
              err.removeAttribute('hidden');
            }
          });
      });
    }
  })();

  function openWargaEdit(wid) {
    get('warga.php?id=' + encodeURIComponent(String(wid))).then(function (d) {
      if (d._status === 401) { location.replace('login.html'); return; }
      if (!d.warga) { alert('Tidak ditemukan'); return; }
      const w = d.warga;
      document.getElementById('m-w-t').textContent = 'Ubah warga';
      document.getElementById('w-id').value = String(w.id);
      document.getElementById('w-a').value = w.alamat || '';
      document.getElementById('w-kk').value = w.no_kk || '';
      document.getElementById('w-nm').value = w.nama || '';
      document.getElementById('w-nk').value = w.nik || '';
      document.getElementById('w-tl').value = w.tempat_lahir || '';
      document.getElementById('w-tg').value = dateOnly(w.tanggal_lahir) || '';
      document.getElementById('w-jk').value = w.jenis_kelamin || 'L';
      document.getElementById('w-ag').value = w.agama || '';
      document.getElementById('w-wn').value = w.warga_negara || 'WNI';
      document.getElementById('w-hb').value = w.hubungan_keluarga || '';
      document.getElementById('w-sn').value = w.status_nikah || '';
      document.getElementById('w-pd').value = w.pendidikan || '';
      document.getElementById('w-pj').value = w.pekerjaan || '';
      document.getElementById('w-st').value = w.status || 'aktif';
      document.getElementById('m-w-e').setAttribute('hidden', '');
      tampilkanModalW();
    });
  }

  // --- Balita
  const balitaTb = document.getElementById('balita-tb');
  const pmrW = document.getElementById('pmr-w');
  const pmrN = document.getElementById('pmr-nik');
  const pmrL = document.getElementById('pmr-lahir');
  const pmrForm = document.getElementById('pmr-form-block');
  const pmrTblB = document.getElementById('pmr-tbl-block');
  const pmrChB = document.getElementById('pmr-ch-b');
  const pmrChT = document.getElementById('pmr-ch-t');
  const pmrChartsWrap = document.getElementById('pmr-charts-wrap');
  const pmrBio = document.getElementById('pmr-bio');
  const pmrRiw = document.getElementById('pmr-riwayat-tb');

  let chBb;
  let chTb;

  function loadBalita() {
    return get('balita.php').then(function (d) {
      if (d._status === 401) { location.replace('login.html'); return; }
      balitaTb.innerHTML = '';
      (d.balita || []).forEach(function (w) {
        const a = w.alamat || '';
        const shortA = a.length > 50 ? a.slice(0, 50) + '…' : a;
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td><a href="#detail-warga" class="w-link-nik" data-warga-id="' + w.id + '">' + esc(String(w.nik)) + '</a></td>' +
          '<td>' + esc(String(w.nama)) + '</td>' +
          '<td>' + esc(dateOnly(w.tanggal_lahir)) + '</td>' +
          '<td>' + (w.umur_bulan != null ? esc(String(w.umur_bulan)) : '—') + '</td>' +
          '<td class="muted">' + esc(shortA) + '</td>';
        balitaTb.appendChild(tr);
      });
      balitaTb.querySelectorAll('a.w-link-nik').forEach(function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          bukaWargaDetail(parseInt(a.getAttribute('data-warga-id'), 10));
        });
      });
    });
  }

  function loadBalitaSelect() {
    return get('balita.php').then(function (d) {
      if (d._status === 401) { location.replace('login.html'); return; }
      const v = (pmrW && pmrW.value) || '';
      pmrW.innerHTML = '<option value="">— Pilih balita —</option>';
      (d.balita || []).forEach(function (w) {
        const o = document.createElement('option');
        o.value = w.id;
        o.textContent = w.nik + ' — ' + w.nama;
        pmrW.appendChild(o);
      });
      if (v) pmrW.value = v;
    });
  }

  (function regPmrRefr() {
    const p = document.getElementById('pmr-refresh');
    if (p) {
      p.addEventListener('click', function () { loadBalitaSelect(); onPmrWargaChange(); });
    }
  })();

  function destroyCharts() {
    if (chBb) { chBb.destroy(); chBb = null; }
    if (chTb) { chTb.destroy(); chTb = null; }
  }

  function buildCharts(rows) {
    const labels = rows.map(function (r) { return dateOnly(r.tanggal); });
    const bbs = rows.map(function (r) { return parseFloat(r.berat_kg) || 0; });
    const tbs = rows.map(function (r) { return parseFloat(r.tinggi_cm) || 0; });
    const ctxB = document.getElementById('c-bb') && document.getElementById('c-bb').getContext('2d');
    const ctxT = document.getElementById('c-tb') && document.getElementById('c-tb').getContext('2d');
    if (!ctxB || !ctxT) return;
    if (typeof Chart === 'undefined') return;
    destroyCharts();
    chBb = new Chart(ctxB, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'BB (kg)', data: bbs, borderColor: 'rgb(45, 212, 163)', backgroundColor: 'rgba(45, 212, 163, 0.15)', tension: 0.2, fill: true },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#e6edf3' } } },
        scales: {
          x: { ticks: { color: '#8b9caa' }, grid: { color: '#2c3640' } },
          y: { beginAtZero: true, ticks: { color: '#8b9caa' }, grid: { color: '#2c3640' } },
        },
      },
    });
    chTb = new Chart(ctxT, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'TB (cm)', data: tbs, borderColor: 'rgb(96, 165, 250)', backgroundColor: 'rgba(96, 165, 250, 0.12)', tension: 0.2, fill: true },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#e6edf3' } } },
        scales: {
          x: { ticks: { color: '#8b9caa' }, grid: { color: '#2c3640' } },
          y: { beginAtZero: true, ticks: { color: '#8b9caa' }, grid: { color: '#2c3640' } },
        },
      },
    });
  }

  function onPmrWargaChange() {
    const id = (pmrW && pmrW.value) || '';
    destroyCharts();
    if (!id) {
      pmrBio.setAttribute('hidden', '');
      pmrForm.setAttribute('hidden', '');
      pmrTblB.setAttribute('hidden', '');
      if (pmrChartsWrap) pmrChartsWrap.setAttribute('hidden', '');
      pmrChB.setAttribute('hidden', '');
      pmrChT.setAttribute('hidden', '');
      return;
    }
    const wid = id;
    get('warga.php?id=' + encodeURIComponent(String(wid))).then(function (d) {
      if (d._status === 401) { location.replace('login.html'); return; }
      if (d.warga) {
        pmrN.textContent = d.warga.nik;
        const tl = d.warga.tempat_lahir || '';
        const tgl = dateOnly(d.warga.tanggal_lahir) || '';
        pmrL.textContent = (tl && tgl) ? (tl + ', ' + tgl) : tgl;
        pmrBio.removeAttribute('hidden');
      }
    });
    get('pemeriksaan.php?warga_id=' + encodeURIComponent(String(wid))).then(function (d) {
      if (d._status === 401) { location.replace('login.html'); return; }
      if (d._status === 400 || d._status >= 400 || !d.ok) {
        pmrForm.setAttribute('hidden', '');
        pmrTblB.setAttribute('hidden', '');
        if (pmrChartsWrap) pmrChartsWrap.setAttribute('hidden', '');
        pmrChB.setAttribute('hidden', '');
        pmrChT.setAttribute('hidden', '');
        if (d.error) {
          window.alert(d.error);
        }
        return;
      }
      const list = d.pemeriksaan || [];
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('pmr-tg').value = today;
      document.getElementById('pmr-bb').value = '';
      var pTg = document.getElementById('pmr-tinggi');
      if (pTg) pTg.value = '';
      document.getElementById('pmr-ct').value = '';
      pmrForm.removeAttribute('hidden');
      pmrTblB.removeAttribute('hidden');
      if (list.length) {
        if (pmrChartsWrap) pmrChartsWrap.removeAttribute('hidden');
        pmrChB.removeAttribute('hidden');
        pmrChT.removeAttribute('hidden');
        buildCharts(list);
      } else {
        if (pmrChartsWrap) pmrChartsWrap.setAttribute('hidden', '');
        pmrChB.setAttribute('hidden', '');
        pmrChT.setAttribute('hidden', '');
      }
      if (pmrRiw) {
        pmrRiw.innerHTML = '';
        list.forEach(function (r) {
          const tr = document.createElement('tr');
          tr.innerHTML =
            '<td>' + esc(dateOnly(r.tanggal)) + '</td>' +
            '<td>' + esc(String(r.berat_kg)) + '</td>' +
            '<td>' + esc(String(r.tinggi_cm)) + '</td>' +
            '<td class="muted">' + esc(r.catatan ? String(r.catatan) : '—') + '</td>' +
            '<td><button type="button" class="btn btn-sm p-edit" data-id=\'' + r.id + '\'>Ubah</button> ' +
            '<button type="button" class="btn btn-sm btn-danger p-del" data-id=\'' + r.id + '\'>Hapus</button></td>';
          pmrRiw.appendChild(tr);
        });
        pmrRiw.querySelectorAll('.p-edit').forEach(function (b) {
          b.addEventListener('click', function () { openPmrEdit(parseInt(b.getAttribute('data-id'), 10), list); });
        });
        pmrRiw.querySelectorAll('.p-del').forEach(function (b) {
          b.addEventListener('click', function () {
            if (!confirm('Hapus pemeriksaan ini?')) return;
            jsend('DELETE', 'pemeriksaan.php?id=' + encodeURIComponent(b.getAttribute('data-id'))).then(function (d) {
              if (d._status === 401) location.replace('login.html');
              if (d.ok) onPmrWargaChange();
            });
          });
        });
      }
    });
  }

  if (pmrW) {
    pmrW.addEventListener('change', onPmrWargaChange);
  }

  (function regPmrSimpan() {
    const p = document.getElementById('pmr-save');
    if (p) {
      p.addEventListener('click', function () {
        const wargaId = (pmrW && pmrW.value) || '';
        if (!wargaId) return;
        jsend('POST', 'pemeriksaan.php', {
          warga_id: parseInt(wargaId, 10),
          tanggal: document.getElementById('pmr-tg').value,
          berat_kg: document.getElementById('pmr-bb').value,
          tinggi_cm: (document.getElementById('pmr-tinggi') || { value: '' }).value,
          catatan: document.getElementById('pmr-ct').value || null,
        }).then(function (d) {
          if (d._status === 401) location.replace('login.html');
          if (d.ok) onPmrWargaChange();
          else window.alert(d.error || 'Gagal menyimpan');
        });
      });
    }
  })();

  const mP = document.getElementById('m-p');
  function openPmrEdit(pid, list) {
    if (!mP) return;
    const r = (list || []).find(function (x) { return String(x.id) === String(pid); });
    if (!r) return;
    document.getElementById('e-pid').value = String(r.id);
    document.getElementById('e-ptg').value = dateOnly(r.tanggal) || '';
    document.getElementById('e-pbb').value = r.berat_kg;
    document.getElementById('e-ptb').value = r.tinggi_cm;
    document.getElementById('e-pct').value = r.catatan || '';
    document.getElementById('m-p-e').setAttribute('hidden', '');
    mP.removeAttribute('hidden');
  }
  (function regModalP() {
    if (!mP) return;
    const px = document.getElementById('m-p-x');
    if (px) {
      px.addEventListener('click', function () { mP.setAttribute('hidden', ''); });
    }
    mP.addEventListener('click', function (e) { if (e.target === mP) mP.setAttribute('hidden', ''); });
    const pok = document.getElementById('m-p-ok');
    if (pok) {
      pok.addEventListener('click', function () {
        const pid = document.getElementById('e-pid').value;
        if (!pid) return;
        const em = document.getElementById('m-p-e');
        if (em) em.setAttribute('hidden', '');
        jsend('PUT', 'pemeriksaan.php?id=' + encodeURIComponent(pid), {
          tanggal: document.getElementById('e-ptg').value,
          berat_kg: document.getElementById('e-pbb').value,
          tinggi_cm: document.getElementById('e-ptb').value,
          catatan: document.getElementById('e-pct').value,
        }).then(function (d) {
          if (d._status === 401) location.replace('login.html');
          if (d.ok) {
            mP.setAttribute('hidden', '');
            onPmrWargaChange();
          } else if (em) {
            em.textContent = d.error || 'Gagal';
            em.removeAttribute('hidden');
          }
        });
      });
    }
  })();

  showPage('warga');
})();
