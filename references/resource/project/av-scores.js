/* Persistencia y cálculo de rankings. localStorage para invitados;
   aquí conectaría el backend real (REST o Supabase) para usuarios autenticados. */
(function () {
  var KEY = 'arcadevault.scores.v1';

  function fmtDate(d) {
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }

  function add(stored, gameId, name, score) {
    var next = Object.assign({}, stored);
    next[gameId] = (next[gameId] || []).concat([{ name: name, score: score, date: fmtDate(new Date()) }]);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {}
    return next;
  }

  function board(stored, gameId) {
    var seed = ((window.AVData && window.AVData.SEED[gameId]) || []).map(function (s, i) {
      return { name: s[0], score: s[1], date: fmtDate(new Date(2026, 7, 28 - i * 3)), mine: false };
    });
    var mine = ((stored || {})[gameId] || []).map(function (s) {
      return { name: s.name, score: s.score, date: s.date, mine: true };
    });
    return mine.concat(seed).sort(function (a, b) { return b.score - a.score; }).slice(0, 10);
  }

  function best(stored, gameId) {
    var top = board(stored, gameId)[0];
    return top ? top.score.toLocaleString('es-ES') : '—';
  }

  function rankColor(i) {
    return i === 0 ? '#f5ff00' : i === 1 ? '#cfd8dc' : i === 2 ? '#ff8a00' : '#4f5b64';
  }

  window.AVScores = { KEY: KEY, load: load, add: add, board: board, best: best, rankColor: rankColor, fmtDate: fmtDate };
})();
