(function () {
  'use strict';
  const form = document.getElementById('f-login');
  const err = document.getElementById('e-login');
  const btn = document.getElementById('b-login');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.setAttribute('hidden', '');
    err.textContent = '';
    btn.disabled = true;

    const username = (document.getElementById('u') || {}).value;
    const password = (document.getElementById('p') || {}).value;

    fetch(window.apiPath('auth/login.php'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: username, password: password }),
    })
      .then(function (r) {
        return r.json().then(function (d) {
          return { status: r.status, data: d };
        });
      })
      .then(function (x) {
        if (x.data && x.data.ok) {
          location.replace('app.html');
          return;
        }
        err.textContent = (x.data && x.data.error) || 'Gagal masuk';
        err.removeAttribute('hidden');
      })
      .catch(function () {
        err.textContent = 'Jaringan atau server bermasalah.';
        err.removeAttribute('hidden');
      })
      .then(function () {
        btn.disabled = false;
      });
  });
})();
