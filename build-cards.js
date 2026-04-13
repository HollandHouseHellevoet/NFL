#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const FULL_OUT = path.join(__dirname, 'nfl-health-systems', 'data', 'teams-full.json');
const APP_PATH = path.join(__dirname, 'nfl-health-systems', 'js', 'app.js');
const TEAMS_PATH = path.join(__dirname, 'nfl-health-systems', 'data', 'teams.json');

if (!fs.existsSync(FULL_OUT)) { console.error('Run build-dossiers.js first.'); process.exit(1); }

// -- New renderGrid ----------------------
const NEW_RENDER = `  function renderGrid() {
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
      divEl.textContent = team.conference + ' \\u00b7 ' + team.division;
      card.appendChild(divEl);

      // Chevron
      var chev = document.createElement('span');
      chev.className = 'team-card__chevron';
      chev.setAttribute('aria-hidden','true');
      chev.textContent = (expandedIndex === idx) ? '\\u2212' : '+';
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
        dealEl.textContent = team.dealType.join(' \\u00b7 ');
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
          ? ' \\u00b7 ' + team.financials.operatingMarginPct.toFixed(2) + '% margin' : '';
        dossierRow('Operating Income', (v<0?'-':'') + fmtM(Math.abs(v)) + marginStr, v<0?'dossier-value--loss':'');
      }

      // === EXEC COMP — what Schedule J hides ===
      if (team.executiveComp && team.executiveComp.ceoTotalComp) {
        var ceoName = team.executiveComp.ceoName ? team.executiveComp.ceoName + ' \\u00b7 ' : '';
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
        dossierRow('Layoffs', (lay.count ? lay.count.toLocaleString()+' employees \\u00b7 ' : '') + lay.date);
      }

      // === CREDIT RATING ===
      if (team.creditRating) {
        var cr = team.creditRating;
        var parts = [];
        if (cr.fitch)  parts.push('Fitch: '+cr.fitch+(cr.fitchOutlook?' ('+cr.fitchOutlook+')':''));
        if (cr.sp)     parts.push('S&P: '+cr.sp+(cr.spOutlook?' ('+cr.spOutlook+')':''));
        if (cr.moodys) parts.push("Moody's: "+cr.moodys+(cr.moodysOutlook?' ('+cr.moodysOutlook+')':''));
        if (parts.length) dossierRow('Credit Rating', parts.join(' \\u00b7 '));
      }

      if (team.program340B && team.program340B.contractPharmacies)
        dossierRow('340B Pharmacies', team.program340B.contractPharmacies + ' contracts');

      card.appendChild(exp);
      frag.appendChild(card);
    });
    grid.appendChild(frag);
  }
`;

// -- Patch app.js ----------------------
let src = fs.readFileSync(APP_PATH, 'utf8');

const START = src.indexOf('  function renderGrid() {');
// Find "Counter" section - regex handles variable comment formatting
const END_RE = /\/\/ ?-{0,3} ?Counter/;
const endMatch = END_RE.exec(src);

if (START === -1 || !endMatch) {
  console.error('Cannot locate renderGrid boundaries in app.js');
  console.error('START found:', START !== -1);
  console.error('Counter comment found:', !!endMatch);
  process.exit(1);
}

const patched = src.slice(0, START) + NEW_RENDER + '\n\n  ' + src.slice(endMatch.index);
fs.writeFileSync(APP_PATH, patched);
console.log('app.js patched.');

// -- Merge dossiers into teams.json ------
const dossiers = JSON.parse(fs.readFileSync(FULL_OUT, 'utf8'));
if (fs.existsSync(TEAMS_PATH)) {
  const teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
  const merged = teams.map(t => {
    const d = dossiers.find(x => x.team === t.team);
    return d ? Object.assign({}, t, d) : t;
  });
  fs.writeFileSync(TEAMS_PATH, JSON.stringify(merged, null, 2));
  console.log('teams.json merged.');
}

console.log('\nDone. Commit and push.\n');
