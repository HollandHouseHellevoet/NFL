(function () {
  'use strict';

  // Official NFL primary colors — all 32 teams
  var TEAM_COLORS = {
    'Arizona Cardinals':     '#97233F',
    'Atlanta Falcons':       '#A71930',
    'Baltimore Ravens':      '#241773',
    'Buffalo Bills':         '#00338D',
    'Carolina Panthers':     '#0085CA',
    'Chicago Bears':         '#0B162A',
    'Cincinnati Bengals':    '#FB4F14',
    'Cleveland Browns':      '#FF3C00',
    'Dallas Cowboys':        '#003594',
    'Denver Broncos':        '#FB4F14',
    'Detroit Lions':         '#0076B6',
    'Green Bay Packers':     '#203731',
    'Houston Texans':        '#03202F',
    'Indianapolis Colts':    '#002C5F',
    'Jacksonville Jaguars':  '#006778',
    'Kansas City Chiefs':    '#E31837',
    'Las Vegas Raiders':     '#a0a0a0',
    'Los Angeles Chargers':  '#0080C6',
    'Los Angeles Rams':      '#003594',
    'Miami Dolphins':        '#008E97',
    'Minnesota Vikings':     '#4F2683',
    'New England Patriots':  '#002244',
    'New Orleans Saints':    '#9E8A5B',
    'New York Giants':       '#0B2265',
    'New York Jets':         '#125740',
    'Philadelphia Eagles':   '#004C54',
    'Pittsburgh Steelers':   '#FFB612',
    'San Francisco 49ers':   '#AA0000',
    'Seattle Seahawks':      '#002244',
    'Tampa Bay Buccaneers':  '#D50A0A',
    'Tennessee Titans':      '#0C2340',
    'Washington Commanders': '#5A1414'
  };

  function injectTeamColors() {
    document.querySelectorAll('.team-card').forEach(function (card) {
      var nameEl = card.querySelector('.team-card__name');
      if (!nameEl) return;
      var color = TEAM_COLORS[nameEl.textContent.trim()];
      if (color) card.style.setProperty('--team-color', color);
    });
  }

  function buildStatBar() {
    var hero = document.querySelector('.hero');
    if (!hero || document.querySelector('.hero-stat-bar')) return;

    var stats = [
      { n: '<em>$176</em>M',  l: 'Total sponsorship spend' },
      { n: '27<em>/32</em>',  l: 'Teams with a health system deal' },
      { n: '<em>$2.88</em>M', l: 'Average deal size' },
      { n: '<em>0</em>',      l: 'Deals funding independent physicians' }
    ];

    var bar = document.createElement('div');
    bar.className = 'hero-stat-bar';
    bar.innerHTML = stats.map(function (s) {
      return '<div class="hero-stat-bar__item">' +
               '<div class="hero-stat-bar__number">' + s.n + '</div>' +
               '<div class="hero-stat-bar__label">' + s.l + '</div>' +
             '</div>';
    }).join('');

    hero.appendChild(bar);
  }

  function reorderDivisionLabel() {
    document.querySelectorAll('.team-card').forEach(function (card) {
      var div = card.querySelector('.team-card__division');
      if (div && card.firstChild !== div) card.insertBefore(div, card.firstChild);
    });
  }

  function init() {
    injectTeamColors();
    buildStatBar();
    reorderDivisionLabel();
  }

  // The main app.js re-renders the grid on filter/sort changes,
  // so re-run the card-specific patches whenever the grid updates.
  function watchGrid() {
    var grid = document.getElementById('team-grid');
    if (!grid) return;
    var mo = new MutationObserver(function () {
      injectTeamColors();
      reorderDivisionLabel();
    });
    mo.observe(grid, { childList: true });
  }

  function boot() {
    init();
    watchGrid();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
