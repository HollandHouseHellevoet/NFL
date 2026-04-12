/* ============================================
   NFL Health System Sponsorship Map
   The Rojas Report — nfl.rojasreport.com
   ============================================ */

(function () {
  'use strict';

  // --- State ---

  let teams = [];
  let filteredTeams = [];
  let activePanel = null;

  // --- DOM refs ---

  const grid = document.getElementById('team-grid');
  const noResults = document.getElementById('no-results');
  const searchInput = document.getElementById('search-input');
  const filterConference = document.getElementById('filter-conference');
  const filterDivision = document.getElementById('filter-division');
  const filterPartnerType = document.getElementById('filter-partner-type');
  const filterCon = document.getElementById('filter-con');
  const detailPanel = document.getElementById('detail-panel');
  const detailContent = document.getElementById('detail-content');
  const detailClose = document.getElementById('detail-close');
  const detailOverlay = document.getElementById('detail-overlay');
  const statBoxes = document.querySelectorAll('.stat-box');

  // Store original first stat text so we can restore it
  const originalStatNumber = statBoxes[0] ? statBoxes[0].querySelector('.stat-number').textContent : '';
  const originalStatLabel = statBoxes[0] ? statBoxes[0].querySelector('.stat-label').textContent : '';

  // --- State map (derived from city for search) ---

  const cityStateMap = {
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

  // --- Data loading ---

  async function loadData() {
    try {
      const resp = await fetch('data/teams.json');
      if (!resp.ok) throw new Error('Failed to load data');
      teams = await resp.json();
      teams.forEach(function (t) {
        t._state = cityStateMap[t.city] || '';
      });
      applyFilters();
    } catch (err) {
      grid.innerHTML = '<p style="padding:24px;opacity:0.6;">Error loading team data.</p>';
    }
  }

  // --- Filtering ---

  function applyFilters() {
    var query = searchInput.value.trim().toLowerCase();
    var conf = filterConference.value;
    var div = filterDivision.value;
    var pType = filterPartnerType.value;
    var con = filterCon.value;

    filteredTeams = teams.filter(function (t) {
      // Search: match team, city, partner, state
      if (query) {
        var haystack = [
          t.team,
          t.city,
          t.healthSystemPartner || '',
          t._state
        ].join(' ').toLowerCase();
        if (haystack.indexOf(query) === -1) return false;
      }

      // Conference
      if (conf !== 'all' && t.conference !== conf) return false;

      // Division
      if (div !== 'all' && t.division !== div) return false;

      // Partner type
      if (pType !== 'all') {
        if (!t.partnerType || t.partnerType !== pType) return false;
      }

      // CON state
      if (con !== 'all') {
        var conBool = con === 'true';
        if (t.conState !== conBool) return false;
      }

      return true;
    });

    sortTeams();
    renderGrid();
    updateStats();
  }

  // --- Sorting ---

  var currentSort = 'az';

  function sortTeams() {
    filteredTeams.sort(function (a, b) {
      if (currentSort === 'az') {
        return a.team.localeCompare(b.team);
      }
      if (currentSort === 'za') {
        return b.team.localeCompare(a.team);
      }
      // By conference/division, then team name
      var confCmp = a.conference.localeCompare(b.conference);
      if (confCmp !== 0) return confCmp;
      var divCmp = a.division.localeCompare(b.division);
      if (divCmp !== 0) return divCmp;
      return a.team.localeCompare(b.team);
    });
  }

  function cycleSort() {
    if (currentSort === 'az') currentSort = 'za';
    else if (currentSort === 'za') currentSort = 'division';
    else currentSort = 'az';
    applyFilters();
    updateSortButton();
  }

  function updateSortButton() {
    var btn = document.getElementById('sort-toggle');
    if (!btn) return;
    var labels = { az: 'A \u2192 Z', za: 'Z \u2192 A', division: 'By Division' };
    btn.textContent = 'Sort: ' + labels[currentSort];
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
      card.dataset.index = idx;
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'View details for ' + team.team);

      // Team name
      var nameEl = document.createElement('div');
      nameEl.className = 'team-card__name';
      nameEl.textContent = team.team;
      card.appendChild(nameEl);

      // City
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

      // Badges row
      var badgesEl = document.createElement('div');
      badgesEl.className = 'team-card__badges';

      // Partner type badge
      if (team.partnerType) {
        var ptBadge = document.createElement('span');
        ptBadge.className = 'badge';
        ptBadge.textContent = team.partnerType;
        badgesEl.appendChild(ptBadge);
      }

      // Partnership type badges
      if (team.partnershipType && team.partnershipType.length > 0) {
        team.partnershipType.forEach(function (pt) {
          var pBadge = document.createElement('span');
          pBadge.className = 'badge badge--partnership';
          pBadge.textContent = pt;
          badgesEl.appendChild(pBadge);
        });
      }

      // CON badge
      if (team.conState) {
        var conBadge = document.createElement('span');
        conBadge.className = 'badge badge--con';
        conBadge.textContent = 'CON State';
        badgesEl.appendChild(conBadge);
      }

      card.appendChild(badgesEl);

      // Division line
      var divEl = document.createElement('div');
      divEl.className = 'team-card__division';
      divEl.textContent = team.conference + ' ' + team.division;
      card.appendChild(divEl);

      frag.appendChild(card);
    });

    grid.appendChild(frag);
  }

  // --- Stats update ---

  function updateStats() {
    if (!statBoxes[0]) return;

    var numEl = statBoxes[0].querySelector('.stat-number');
    var lblEl = statBoxes[0].querySelector('.stat-label');

    var isFiltered = searchInput.value.trim() !== '' ||
      filterConference.value !== 'all' ||
      filterDivision.value !== 'all' ||
      filterPartnerType.value !== 'all' ||
      filterCon.value !== 'all';

    if (isFiltered) {
      numEl.textContent = filteredTeams.length + ' of 32';
      lblEl.textContent = 'Teams shown (filtered)';
    } else {
      numEl.textContent = originalStatNumber;
      lblEl.textContent = originalStatLabel;
    }
  }

  // --- Detail panel ---

  function openDetail(team) {
    activePanel = team;
    detailContent.innerHTML = '';

    // Header
    var h2 = document.createElement('h2');
    h2.textContent = team.team;
    detailContent.appendChild(h2);

    var cityP = document.createElement('p');
    cityP.className = 'detail-city';
    cityP.textContent = team.city + (team._state ? ', ' + team._state : '') +
      ' \u2014 ' + team.conference + ' ' + team.division;
    detailContent.appendChild(cityP);

    // Primary partner section
    var partnerSection = document.createElement('div');
    partnerSection.className = 'detail-section';

    var partnerTitle = document.createElement('div');
    partnerTitle.className = 'detail-section-title';
    partnerTitle.textContent = 'Primary Healthcare Partner';
    partnerSection.appendChild(partnerTitle);

    var partnerName = document.createElement('div');
    partnerName.className = 'detail-partner-name';
    partnerName.textContent = team.healthSystemPartner || 'No confirmed partner';
    partnerSection.appendChild(partnerName);

    if (team.partnerType) {
      var typeField = document.createElement('div');
      typeField.className = 'detail-field';
      typeField.innerHTML = '<strong>Partner Type:</strong> ' + escapeHtml(team.partnerType);
      partnerSection.appendChild(typeField);
    }

    // Badges in detail
    if ((team.partnershipType && team.partnershipType.length > 0) || team.conState) {
      var detailBadges = document.createElement('div');
      detailBadges.className = 'detail-badges';

      if (team.partnershipType) {
        team.partnershipType.forEach(function (pt) {
          var b = document.createElement('span');
          b.className = 'badge badge--partnership';
          b.textContent = pt;
          detailBadges.appendChild(b);
        });
      }

      if (team.conState) {
        var conB = document.createElement('span');
        conB.className = 'badge badge--con';
        conB.textContent = 'CON State';
        detailBadges.appendChild(conB);
      }

      partnerSection.appendChild(detailBadges);
    }

    detailContent.appendChild(partnerSection);

    // CON detail
    var conSection = document.createElement('div');
    conSection.className = 'detail-section';

    var conTitle = document.createElement('div');
    conTitle.className = 'detail-section-title';
    conTitle.textContent = 'Certificate of Need (CON)';
    conSection.appendChild(conTitle);

    var conField = document.createElement('div');
    conField.className = 'detail-field';
    if (team.conState) {
      conField.innerHTML = '<strong>' + escapeHtml(team._state) + '</strong> has Certificate of Need laws. ' +
        'Healthcare facilities in this state face regulatory barriers to market entry, ' +
        'limiting competition for established systems.';
    } else {
      conField.innerHTML = '<strong>' + escapeHtml(team._state) + '</strong> does not have Certificate of Need laws.';
      conField.className = 'detail-field detail-field--dim';
    }
    conSection.appendChild(conField);
    detailContent.appendChild(conSection);

    // Additional sponsors
    if (team.additionalHealthcareSponsors && team.additionalHealthcareSponsors.length > 0) {
      var addSection = document.createElement('div');
      addSection.className = 'detail-section';

      var addTitle = document.createElement('div');
      addTitle.className = 'detail-section-title';
      addTitle.textContent = 'Additional Healthcare Sponsors';
      addSection.appendChild(addTitle);

      var addList = document.createElement('ul');
      addList.className = 'detail-additional';

      team.additionalHealthcareSponsors.forEach(function (s) {
        var li = document.createElement('li');
        li.innerHTML = '<span class="detail-additional-name">' + escapeHtml(s.name) +
          '</span> <span class="detail-additional-type">\u2014 ' + escapeHtml(s.type) + '</span>';
        addList.appendChild(li);
      });

      addSection.appendChild(addList);
      detailContent.appendChild(addSection);
    }

    // Notes
    if (team.notes) {
      var notesSection = document.createElement('div');
      notesSection.className = 'detail-section';

      var notesTitle = document.createElement('div');
      notesTitle.className = 'detail-section-title';
      notesTitle.textContent = 'Notes';
      notesSection.appendChild(notesTitle);

      var notesP = document.createElement('p');
      notesP.className = 'detail-notes';
      notesP.textContent = team.notes;
      notesSection.appendChild(notesP);

      detailContent.appendChild(notesSection);
    }

    detailPanel.hidden = false;
    detailOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeDetail() {
    activePanel = null;
    detailPanel.hidden = true;
    detailOverlay.hidden = true;
    document.body.style.overflow = '';
  }

  // --- Utility ---

  function escapeHtml(str) {
    var el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  function debounce(fn, ms) {
    var timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }

  // --- Sort toggle injection ---

  function injectSortButton() {
    var section = document.querySelector('.team-grid-section');
    if (!section) return;
    var btn = document.createElement('button');
    btn.id = 'sort-toggle';
    btn.className = 'badge';
    btn.textContent = 'Sort: A \u2192 Z';
    btn.style.cursor = 'pointer';
    btn.style.marginBottom = '16px';
    btn.style.padding = '6px 14px';
    btn.style.fontSize = '0.8rem';
    btn.style.background = 'var(--navy-light)';
    btn.style.borderColor = 'var(--cream-border-strong)';
    btn.addEventListener('click', cycleSort);
    section.insertBefore(btn, grid);
  }

  // --- Event binding ---

  // Search with debounce
  searchInput.addEventListener('input', debounce(applyFilters, 200));

  // Dropdowns
  filterConference.addEventListener('change', applyFilters);
  filterDivision.addEventListener('change', applyFilters);
  filterPartnerType.addEventListener('change', applyFilters);
  filterCon.addEventListener('change', applyFilters);

  // Card clicks via event delegation
  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.team-card');
    if (!card) return;
    var idx = parseInt(card.dataset.index, 10);
    if (filteredTeams[idx]) openDetail(filteredTeams[idx]);
  });

  // Keyboard support for cards
  grid.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var card = e.target.closest('.team-card');
    if (!card) return;
    e.preventDefault();
    var idx = parseInt(card.dataset.index, 10);
    if (filteredTeams[idx]) openDetail(filteredTeams[idx]);
  });

  // Close detail panel
  detailClose.addEventListener('click', closeDetail);
  detailOverlay.addEventListener('click', closeDetail);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !detailPanel.hidden) closeDetail();
  });

  // --- Init ---

  injectSortButton();
  loadData();

})();
