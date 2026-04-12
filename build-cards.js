#!/usr/bin/env node
// ============================================================
// build-cards.js
// Reads data/teams-full.json, rewrites js/app.js card renderer
// to use the dossier/accusation format instead of plain data
// ============================================================

const fs = require('fs');
const path = require('path');

const DOSSIERS_PATH = path.join('nfl-health-systems', 'data', 'teams-full.json');
const APP_JS_PATH = path.join('nfl-health-systems', 'js', 'app.js');

if (!fs.existsSync(DOSSIERS_PATH)) {
  console.error('Run build-dossiers.js first.');
  process.exit(1);
}

// The new card renderer - accusation format
// Replaces the existing renderGrid function in app.js
const NEW_RENDER_FUNCTION = `  function renderGrid() {
    grid.innerHTML = '';

    if (filteredTeams.length === 0) {
      noResults.hidden = false;
      return;
    }
    noResults.hidden = true;

    var frag = document.createDocumentFragment();

    filteredTeams.forEach(function (team, idx) {
      var hasPartner = !!team.healthSystem;
      var card = document.createElement('article');
      card.className = 'team-card' + (hasPartner ? '' : ' team-card--no-partner');
      if (expandedIndex === idx) card.className += ' is-expanded';
      card.dataset.index = idx;
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'View details for ' + team.team);

      // Division - top of card
      var divEl = document.createElement('div');
      divEl.className = 'team-card__division';
      divEl.textContent = team.conference + ' \\u00b7 ' + team.division;
      card.appendChild(divEl);

      // Expand chevron
      var chevronEl = document.createElement('span');
      chevronEl.className = 'team-card__chevron';
      chevronEl.setAttribute('aria-hidden', 'true');
      chevronEl.textContent = (expandedIndex === idx) ? '\\u2212' : '+';
      card.appendChild(chevronEl);

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

      // Health system name
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
        var ptBadge = document.createElement('span');
        ptBadge.className = 'badge';
        ptBadge.textContent = team.nonprofitType;
        badgesEl.appendChild(ptBadge);
      }

      if (team.conState) {
        var conBadge = document.createElement('span');
        conBadge.className = 'badge badge--con';
        conBadge.textContent = 'CON State';
        badgesEl.appendChild(conBadge);
      }

      if (!hasPartner) {
        var noPartnerBadge = document.createElement('span');
        noPartnerBadge.className = 'badge badge--no-deal';
        noPartnerBadge.textContent = 'No Deal';
        badgesEl.appendChild(noPartnerBadge);
      }

      card.appendChild(badgesEl);

      // Deal type
      if (team.dealType && team.dealType.length > 0) {
        var dealEl = document.createElement('div');
        dealEl.className = 'team-card__partnership-type';
        dealEl.textContent = team.dealType.join(' \\u00b7 ');
        card.appendChild(dealEl);
      }

      // === ACCUSATION - the whole point of this page ===
      if (hasPartner && team.accusation) {
        var accusationEl = document.createElement('div');
        accusationEl.className = 'team-card__accusation';
        accusationEl.textContent = team.accusation;
        card.appendChild(accusationEl);
      }

      // Expanded: full dossier detail
      var expanded = document.createElement('div');
      expanded.className = 'team-card__expanded';

      // Tax advantage
      if (team.taxAdvantage && team.taxAdvantage.totalEstimatedAnnual) {
        var taxRow = document.createElement('div');
        taxRow.className = 'dossier-row';
        taxRow.innerHTML =
          '<span class="dossier-label">Annual Tax Advantage</span>' +
          '<span class="dossier-value dossier-value--orange">$' +
          (team.taxAdvantage.totalEstimatedAnnual / 1e6).toFixed(0) + 'M</span>';
        expanded.appendChild(taxRow);
      }

      // CEO comp
      if (team.executiveComp && team.executiveComp.ceoTotalComp) {
        var ceoRow = document.createElement('div');
        ceoRow.className = 'dossier-row';
        ceoRow.innerHTML =
          '<span class="dossier-label">CEO Compensation</span>' +
          '<span class="dossier-value">$' +
          (team.executiveComp.ceoTotalComp / 1e6).toFixed(1) + 'M</span>';
        expanded.appendChild(ceoRow);
      }

      // Operating income/loss
      if (team.financials && team.financials.operatingIncome !== null && team.financials.operatingIncome !== undefined) {
        var finRow = document.createElement('div');
        finRow.className = 'dossier-row';
        var finVal = team.financials.operatingIncome;
        finRow.innerHTML =
          '<span class="dossier-label">Operating Income</span>' +
          '<span class="dossier-value ' + (finVal < 0 ? 'dossier-value--loss' : '') + '">' +
          (finVal < 0 ? '-' : '') + '$' +
          (Math.abs(finVal) / 1e6).toFixed(0) + 'M</span>';
        expanded.appendChild(finRow);
      }

      // Layoffs
      if (team.layoffs && team.layoffs.length > 0) {
        var layoffRow = document.createElement('div');
        layoffRow.className = 'dossier-row';
        var latestLayoff = team.layoffs[team.layoffs.length - 1];
        layoffRow.innerHTML =
          '<span class="dossier-label">Layoffs</span>' +
          '<span class="dossier-value">' +
          (latestLayoff.count ? latestLayoff.count.toLocaleString() + ' employees' : 'Reported') +
          ' \\u00b7 ' + latestLayoff.date + '</span>';
        expanded.appendChild(layoffRow);
      }

      // Credit rating
      if (team.creditRating) {
        var cr = team.creditRating;
        var ratingStr = [];
        if (cr.fitch)  ratingStr.push('Fitch: ' + cr.fitch + (cr.fitchOutlook ? ' (' + cr.fitchOutlook + ')' : ''));
        if (cr.sp)     ratingStr.push('S&P: '   + cr.sp    + (cr.spOutlook    ? ' (' + cr.spOutlook    + ')' : ''));
        if (cr.moodys) ratingStr.push("Moody's: "+ cr.moodys+ (cr.moodysOutlook? ' (' + cr.moodysOutlook+ ')' : ''));
        if (ratingStr.length > 0) {
          var crRow = document.createElement('div');
          crRow.className = 'dossier-row';
          crRow.innerHTML =
            '<span class="dossier-label">Credit</span>' +
            '<span class="dossier-value">' + ratingStr.join(' \\u00b7 ') + '</span>';
          expanded.appendChild(crRow);
        }
      }

      // 340B
      if (team.program340B && team.program340B.contractPharmacies) {
        var b340Row = document.createElement('div');
        b340Row.className = 'dossier-row';
        b340Row.innerHTML =
          '<span class="dossier-label">340B Pharmacies</span>' +
          '<span class="dossier-value">' + team.program340B.contractPharmacies + ' contracts</span>';
        expanded.appendChild(b340Row);
      }

      // Additional sponsors (legacy field)
      if (team.additionalHealthcareSponsors && team.additionalHealthcareSponsors.length > 0) {
        var addTitle = document.createElement('div');
        addTitle.className = 'team-card__additional-title';
        addTitle.textContent = 'Additional Sponsors';
        expanded.appendChild(addTitle);

        var addList = document.createElement('ul');
        addList.className = 'team-card__additional-list';
        team.additionalHealthcareSponsors.forEach(function (s) {
          var li = document.createElement('li');
          li.innerHTML = '<span class="team-card__additional-name">' + esc(s.name) +
            '</span> <span class="team-card__additional-type">\\u2014 ' + esc(s.type) + '</span>';
          addList.appendChild(li);
        });
        expanded.appendChild(addList);
      }

      card.appendChild(expanded);
      frag.appendChild(card);
    });

    grid.appendChild(frag);
  }
`;

// Replace the renderGrid function in app.js
let appJs = fs.readFileSync(APP_JS_PATH, 'utf8');

const START_MARKER = '  function renderGrid() {';
const END_MARKER = '  // --- Counter ---';

const startIdx = appJs.indexOf(START_MARKER);
const endIdx = appJs.indexOf(END_MARKER);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find renderGrid boundaries in app.js');
  console.error('  START_MARKER found:', startIdx !== -1);
  console.error('  END_MARKER found:', endIdx !== -1);
  process.exit(1);
}

const patched = appJs.slice(0, startIdx) + NEW_RENDER_FUNCTION + '\n\n' + appJs.slice(endIdx);
fs.writeFileSync(APP_JS_PATH, patched);

console.log('OK app.js renderGrid replaced with accusation format.');

// Also merge dossier data into teams.json for backward compat
const dossiers = JSON.parse(fs.readFileSync(DOSSIERS_PATH, 'utf8'));
const TEAMS_PATH = path.join('nfl-health-systems', 'data', 'teams.json');

if (fs.existsSync(TEAMS_PATH)) {
  const teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
  const merged = teams.map(t => {
    const dossier = dossiers.find(d => d.team === t.team);
    return dossier ? Object.assign({}, t, dossier) : t;
  });
  fs.writeFileSync(TEAMS_PATH, JSON.stringify(merged, null, 2));
  console.log('OK teams.json merged with dossier data.');
}

console.log('\nDone. Commit and push to deploy.\n');
