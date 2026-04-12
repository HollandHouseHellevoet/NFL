/* ============================================
   NFL Health System Sponsorship Map
   The Rojas Report — nfl.rojasreport.com
   ============================================ */

(function () {
  'use strict';

  // --- State ---

  var teams = [];
  var filteredTeams = [];
  var expandedIndex = null;
  var currentSort = 'az';

  // --- City-to-state map ---

  var cityStateMap = {
    'Buffalo': 'New York',
    'Miami': 'Florida',
    'Foxborough': 'Massachusetts',
    'East Rutherford': 'New Jersey',
    'Baltimore': 'Maryland',
    'Cincinnati': 'Ohio',
    'Cleveland': 'Ohio',
    'Pittsburgh': 'Pennsylvania',
    'Houston': 'Texas',
    'Indianapolis': 'Indiana',
    'Jacksonville': 'Florida',
    'Nashville': 'Tennessee',
    'Denver': 'Colorado',
    'Kansas City': 'Missouri',
    'Las Vegas': 'Nevada',
    'Los Angeles': 'California',
    'Arlington': 'Texas',
    'Philadelphia': 'Pennsylvania',
    'Landover': 'Virginia',
    'Chicago': 'Illinois',
    'Detroit': 'Michigan',
    'Green Bay': 'Wisconsin',
    'Minneapolis': 'Minnesota',
    'Atlanta': 'Georgia',
    'Charlotte': 'North Carolina',
    'New Orleans': 'Louisiana',
    'Tampa': 'Florida',
    'Glendale': 'Arizona',
    'Santa Clara': 'California',
    'Seattle': 'Washington'
  };

  // --- DOM refs ---

  var grid = document.getElementById('team-grid');
  var noResults = document.getElementById('no-results');
  var counter = document.getElementById('data-counter');
  var searchInput = document.getElementById('search-input');
  var filterConference = document.getElementById('filter-conference');
  var filterDivision = document.getElementById('filter-division');
  var filterPartnerType = document.getElementById('filter-partner-type');
  var filterCon = document.getElementById('filter-con');
  var sortBtn = document.getElementById('sort-toggle');
  var hamburger = document.getElementById('nav-hamburger');
  var navLinks = document.getElementById('nav-links');
  var shareX = document.getElementById('share-x');

  // --- Data loading ---

  function loadData() {
    fetch('data/teams.json')
      .then(function (resp) {
        if (!resp.ok) throw new Error('Failed to load');
        return resp.json();
      })
      .then(function (data) {
        teams = data;
        teams.forEach(function (t) {
          t._state = cityStateMap[t.city] || '';
        });
        applyFilters();
      })
      .catch(function () {
        grid.innerHTML = '<p style="padding:28px;opacity:0.5;">Error loading team data.</p>';
      });
  }

  // --- Filtering ---

  function applyFilters() {
    var query = searchInput.value.trim().toLowerCase();
    var conf = filterConference.value;
    var div = filterDivision.value;
    var pType = filterPartnerType.value;
    var con = filterCon.value;

    filteredTeams = teams.filter(function (t) {
      if (query) {
        var haystack = [t.team, t.city, t.healthSystemPartner || '', t._state, t.notes || ''].join(' ').toLowerCase();
        if (haystack.indexOf(query) === -1) return false;
      }
      if (conf !== 'all' && t.conference !== conf) return false;
      if (div !== 'all' && t.division !== div) return false;
      if (pType !== 'all') {
        if (!t.partnerType || t.partnerType !== pType) return false;
      }
      if (con !== 'all') {
        if (t.conState !== (con === 'true')) return false;
      }
      return true;
    });

    expandedIndex = null;
    sortTeams();
    renderGrid();
    updateCounter();
  }

  // --- Sorting ---

  function sortTeams() {
    filteredTeams.sort(function (a, b) {
      if (currentSort === 'az') return a.team.localeCompare(b.team);
      if (currentSort === 'za') return b.team.localeCompare(a.team);
      var c = a.conference.localeCompare(b.conference);
      if (c !== 0) return c;
      var d = a.division.localeCompare(b.division);
      if (d !== 0) return d;
      return a.team.localeCompare(b.team);
    });
  }

  function cycleSort() {
    if (currentSort === 'az') currentSort = 'za';
    else if (currentSort === 'za') currentSort = 'division';
    else currentSort = 'az';

    var labels = { az: 'A \u2192 Z', za: 'Z \u2192 A', division: 'By Division' };
    sortBtn.textContent = 'Sort: ' + labels[currentSort];
    applyFilters();
  }

  // --- Rendering ---

  function renderGrid() {
    grid.innerHTML = '';

    if (filteredTeams.length === 0) {
      noResults.hidden = false;
      return;
    }
    noResults.hidden = true;

    var frag = document.createDocumentFragment();

    filteredTeams.forEach(function (team, idx) {
      var card = document.createElement('article');
      card.className = 'team-card' + (team.healthSystemPartner ? '' : ' team-card--no-partner');
      if (expandedIndex === idx) card.className += ' is-expanded';
      card.dataset.index = idx;
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'View details for ' + team.team);

      // Team name
      var nameEl = document.createElement('h3');
      nameEl.className = 'team-card__name';
      nameEl.textContent = team.team;
      card.appendChild(nameEl);

      // City, State
      var cityEl = document.createElement('div');
      cityEl.className = 'team-card__city';
      cityEl.textContent = team.city + (team._state ? ', ' + team._state : '');
      card.appendChild(cityEl);

      // Partner name
      var partnerEl = document.createElement('div');
      if (team.healthSystemPartner) {
        partnerEl.className = 'team-card__partner';
        partnerEl.textContent = team.healthSystemPartner;
      } else {
        partnerEl.className = 'team-card__partner team-card__partner--none';
        partnerEl.textContent = 'No confirmed partner';
      }
      card.appendChild(partnerEl);

      // Badges
      var badgesEl = document.createElement('div');
      badgesEl.className = 'team-card__badges';

      if (team.partnerType) {
        var ptBadge = document.createElement('span');
        ptBadge.className = 'badge';
        ptBadge.textContent = team.partnerType;
        badgesEl.appendChild(ptBadge);
      }

      if (team.conState) {
        var conBadge = document.createElement('span');
        conBadge.className = 'badge badge--con';
        conBadge.textContent = 'CON State';
        badgesEl.appendChild(conBadge);
      }

      card.appendChild(badgesEl);

      // Partnership type as text
      if (team.partnershipType && team.partnershipType.length > 0) {
        var ptText = document.createElement('div');
        ptText.className = 'team-card__partnership-type';
        ptText.textContent = team.partnershipType.join(' \u00b7 ');
        card.appendChild(ptText);
      }

      // Division
      var divEl = document.createElement('div');
      divEl.className = 'team-card__division';
      divEl.textContent = team.conference + ' ' + team.division;
      card.appendChild(divEl);

      // Expanded content
      var expanded = document.createElement('div');
      expanded.className = 'team-card__expanded';

      if (team.notes) {
        var notesEl = document.createElement('p');
        notesEl.className = 'team-card__notes';
        notesEl.textContent = team.notes;
        expanded.appendChild(notesEl);
      }

      if (team.additionalHealthcareSponsors && team.additionalHealthcareSponsors.length > 0) {
        var addTitle = document.createElement('div');
        addTitle.className = 'team-card__additional-title';
        addTitle.textContent = 'Additional Healthcare Sponsors';
        expanded.appendChild(addTitle);

        var addList = document.createElement('ul');
        addList.className = 'team-card__additional-list';

        team.additionalHealthcareSponsors.forEach(function (s) {
          var li = document.createElement('li');
          li.innerHTML = '<span class="team-card__additional-name">' + esc(s.name) +
            '</span> <span class="team-card__additional-type">\u2014 ' + esc(s.type) + '</span>';
          addList.appendChild(li);
        });

        expanded.appendChild(addList);
      }

      card.appendChild(expanded);
      frag.appendChild(card);
    });

    grid.appendChild(frag);
  }

  // --- Counter ---

  function updateCounter() {
    counter.textContent = 'Showing ' + filteredTeams.length + ' of 32 teams';
  }

  // --- Card expansion (event delegation) ---

  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.team-card');
    if (!card) return;
    var idx = parseInt(card.dataset.index, 10);
    toggleExpand(idx);
  });

  grid.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var card = e.target.closest('.team-card');
    if (!card) return;
    e.preventDefault();
    var idx = parseInt(card.dataset.index, 10);
    toggleExpand(idx);
  });

  function toggleExpand(idx) {
    if (expandedIndex === idx) {
      expandedIndex = null;
    } else {
      expandedIndex = idx;
    }
    renderGrid();
  }

  // --- Mobile nav ---

  hamburger.addEventListener('click', function () {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('is-open');
  });

  // Close on outside click
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav') && navLinks.classList.contains('is-open')) {
      hamburger.classList.remove('active');
      navLinks.classList.remove('is-open');
    }
  });

  // Close nav on anchor click
  navLinks.addEventListener('click', function (e) {
    if (e.target.classList.contains('nav-link') && e.target.getAttribute('href').startsWith('#')) {
      hamburger.classList.remove('active');
      navLinks.classList.remove('is-open');
    }
  });

  // --- Search (debounced) ---

  var searchTimer;
  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 200);
  });

  // --- Filter dropdowns ---

  filterConference.addEventListener('change', applyFilters);
  filterDivision.addEventListener('change', applyFilters);
  filterPartnerType.addEventListener('change', applyFilters);
  filterCon.addEventListener('change', applyFilters);

  // --- Sort toggle ---

  sortBtn.addEventListener('click', cycleSort);

  // --- X share button ---

  shareX.addEventListener('click', function (e) {
    e.preventDefault();
    var text = encodeURIComponent(
      '27 of 32 NFL teams have a nonprofit health system sponsor. $176 million in healthcare sponsorship in 2024. Not one dollar funds independent physician practice. https://nfl.rojasreport.com'
    );
    window.open('https://x.com/intent/tweet?text=' + text, '_blank', 'width=550,height=420');
  });

  // --- Utility ---

  function esc(str) {
    var el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  // --- Init ---

  document.addEventListener('DOMContentLoaded', loadData);

})();
