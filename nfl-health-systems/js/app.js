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
    if (filteredTeams.length === 0) { noResults.hidden = false; return; }
    noResults.hidden = true;

    var frag = document.createDocumentFragment();
    filteredTeams.forEach(function(team, idx) {
      var hasPartner = !!team.healthSystem;
      var card = document.createElement('article');
      card.className = 'team-card' + (hasPartner ? '' : ' team-card--no-partner');
      if (expandedIndex === idx) card.className += ' is-expanded';
      card.dataset.index = idx;
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'View details for ' + team.team);

      // Division -- top
      var divEl = document.createElement('div');
      divEl.className = 'team-card__division';
      divEl.textContent = team.conference + ' \u00b7 ' + team.division;
      card.appendChild(divEl);

      // Chevron
      var chev = document.createElement('span');
      chev.className = 'team-card__chevron';
      chev.setAttribute('aria-hidden','true');
      chev.textContent = (expandedIndex === idx) ? '\u2212' : '+';
      card.appendChild(chev);

      // Team name
      var nameEl = document.createElement('h3');
      nameEl.className = 'team-card__name';
      nameEl.textContent = team.team;
      card.appendChild(nameEl);

      // City
      var cityEl = document.createElement('div');
      cityEl.className = 'team-card__city';
      cityEl.textContent = team.city + (team.state ? ', ' + team.state : '');
      card.appendChild(cityEl);

      // Health system
      var partnerEl = document.createElement('div');
      if (hasPartner) {
        partnerEl.className = 'team-card__partner';
        partnerEl.textContent = team.healthSystem;
      } else {
        partnerEl.className = 'team-card__partner team-card__partner--none';
        partnerEl.textContent = 'No confirmed partner';
      }
      card.appendChild(partnerEl);

      // Badges
      var badgesEl = document.createElement('div');
      badgesEl.className = 'team-card__badges';
      if (team.nonprofitType) {
        var b1 = document.createElement('span');
        b1.className = 'badge';
        b1.textContent = team.nonprofitType;
        badgesEl.appendChild(b1);
      }
      if (team.conState) {
        var b2 = document.createElement('span');
        b2.className = 'badge badge--con';
        b2.textContent = 'CON State';
        badgesEl.appendChild(b2);
      }
      if (!hasPartner) {
        var b3 = document.createElement('span');
        b3.className = 'badge badge--no-deal';
        b3.textContent = 'No Deal';
        badgesEl.appendChild(b3);
      }
      card.appendChild(badgesEl);

      // Deal type
      if (team.dealType && team.dealType.length) {
        var dealEl = document.createElement('div');
        dealEl.className = 'team-card__partnership-type';
        dealEl.textContent = team.dealType.join(' \u00b7 ');
        card.appendChild(dealEl);
      }

      // ACCUSATION -- the whole point
      if (hasPartner && team.accusation) {
        var accEl = document.createElement('div');
        accEl.className = 'team-card__accusation';
        accEl.textContent = team.accusation;
        card.appendChild(accEl);
      }

      // Expanded dossier
      var exp = document.createElement('div');
      exp.className = 'team-card__expanded';

      function dossierRow(label, value, cls) {
        var row = document.createElement('div');
        row.className = 'dossier-row';
        row.innerHTML = '<span class="dossier-label">' + label + '</span>' +
          '<span class="dossier-value' + (cls ? ' ' + cls : '') + '">' + value + '</span>';
        exp.appendChild(row);
      }

      function fmtM(n) {
        if (n === null || n === undefined) return null;
        if (Math.abs(n) >= 1e9) return '$' + (n/1e9).toFixed(2) + 'B';
        if (Math.abs(n) >= 1e6) return '$' + (n/1e6).toFixed(0) + 'M';
        return '$' + n.toLocaleString();
      }

      // === BALANCE SHEET WEALTH — what the P&L hides ===
      if (team.balanceSheetWealth && team.balanceSheetWealth.investmentPortfolio)
        dossierRow('Investment Portfolio', fmtM(team.balanceSheetWealth.investmentPortfolio), 'dossier-value--orange');

      if (team.bondDebt && team.bondDebt.totalOutstanding)
        dossierRow('Tax-Exempt Bond Debt', fmtM(team.bondDebt.totalOutstanding));

      if (team.balanceSheetWealth && team.balanceSheetWealth.realEstateValue)
        dossierRow('Real Estate', fmtM(team.balanceSheetWealth.realEstateValue));

      // === P&L — what they show ===
      if (team.financials && team.financials.totalRevenue)
        dossierRow('Total Revenue', fmtM(team.financials.totalRevenue));

      if (team.financials && team.financials.operatingIncome !== null && team.financials.operatingIncome !== undefined) {
        var v = team.financials.operatingIncome;
        var marginStr = team.financials.operatingMarginPct !== null && team.financials.operatingMarginPct !== undefined
          ? ' \u00b7 ' + team.financials.operatingMarginPct.toFixed(2) + '% margin' : '';
        dossierRow('Operating Income', (v<0?'-':'') + fmtM(Math.abs(v)) + marginStr, v<0?'dossier-value--loss':'');
      }

      // === EXEC COMP — what Schedule J hides ===
      if (team.executiveComp && team.executiveComp.ceoTotalComp) {
        var ceoName = team.executiveComp.ceoName ? team.executiveComp.ceoName + ' \u00b7 ' : '';
        dossierRow('CEO Total Comp', ceoName + fmtM(team.executiveComp.ceoTotalComp));
      }
      if (team.executiveComp && team.executiveComp.ceoDeferredComp)
        dossierRow('Deferred Comp', fmtM(team.executiveComp.ceoDeferredComp));

      if (team.executiveComp && team.executiveComp.perks && team.executiveComp.perks.length)
        dossierRow('Schedule J Perks', team.executiveComp.perks.join(', '));

      // === COMMUNITY BENEFIT — claimed vs actual ===
      if (team.communityBenefit && team.communityBenefit.claimedAmount)
        dossierRow('Claimed Community Benefit', fmtM(team.communityBenefit.claimedAmount));

      if (team.communityBenefit && team.communityBenefit.charityCareCostAdjusted)
        dossierRow('Actual Charity Care (cost-adj)', fmtM(team.communityBenefit.charityCareCostAdjusted), 'dossier-value--loss');

      if (team.communityBenefit && team.communityBenefit.chargemasterMarkupRatio)
        dossierRow('Chargemaster Markup', team.communityBenefit.chargemasterMarkupRatio.toFixed(1) + 'x');

      // === RELATED ORGS — the architecture ===
      if (team.relatedOrganizations && team.relatedOrganizations.captiveInsurance)
        dossierRow('Captive Insurance', team.relatedOrganizations.captiveInsurance);

      if (team.relatedOrganizations && team.relatedOrganizations.foundationEntity)
        dossierRow('Wealth Holding Entity', team.relatedOrganizations.foundationEntity);

      // === THREE RATIOS ===
      if (team.ratios && team.ratios.investmentsToOperatingIncome)
        dossierRow('Investments : Op Income', team.ratios.investmentsToOperatingIncome.toFixed(1) + 'x', 'dossier-value--orange');

      if (team.ratios && team.ratios.bondDebtToCommunityBenefit)
        dossierRow('Bond Debt : Community Benefit', team.ratios.bondDebtToCommunityBenefit.toFixed(1) + 'x');

      if (team.ratios && team.ratios.charityCarePctVsStateAvg !== null && team.ratios.charityCarePctVsStateAvg !== undefined)
        dossierRow('Charity Care vs State Avg', team.ratios.charityCarePctVsStateAvg.toFixed(2) + '%',
                   team.ratios.charityCarePctVsStateAvg < 0 ? 'dossier-value--loss' : '');

      // === LAYOFFS ===
      if (team.layoffs && team.layoffs.length) {
        var lay = team.layoffs[team.layoffs.length-1];
        dossierRow('Layoffs', (lay.count ? lay.count.toLocaleString()+' employees \u00b7 ' : '') + lay.date);
      }

      // === CREDIT RATING ===
      if (team.creditRating) {
        var cr = team.creditRating;
        var parts = [];
        if (cr.fitch)  parts.push('Fitch: '+cr.fitch+(cr.fitchOutlook?' ('+cr.fitchOutlook+')':''));
        if (cr.sp)     parts.push('S&P: '+cr.sp+(cr.spOutlook?' ('+cr.spOutlook+')':''));
        if (cr.moodys) parts.push("Moody's: "+cr.moodys+(cr.moodysOutlook?' ('+cr.moodysOutlook+')':''));
        if (parts.length) dossierRow('Credit Rating', parts.join(' \u00b7 '));
      }

      if (team.program340B && team.program340B.contractPharmacies)
        dossierRow('340B Pharmacies', team.program340B.contractPharmacies + ' contracts');

      card.appendChild(exp);
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
