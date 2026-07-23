/**
 * App.js - Main Application Coordinator for Cricer
 * Handles option to change striker and non-striker mid-match,
 * ball-by-ball over progression display (0.1, 0.2, 0.3, 0.4, 0.5, 1.0),
 * venue location tracking, structured table scorecard modal,
 * Multi-Match Simultaneous Management, Change Bowler option, No Consecutive Overs rule,
 * Cancel Match option, player roster inputs, opening batter selection,
 * manual ball-by-ball scoring deck, undo delivery option, and statistical run rate graph.
 */

import { 
  createTeam, 
  conductToss, 
  verifyToss, 
  chooseInningsOrder, 
  InningsState, 
  decideResult, 
  decidePlayerOfMatch, 
  generateScorecardText,
  Utils
} from './cricketEngine.js';

class MatchInstance {
  constructor(id, nameA, nameB, teamSize, maxOvers, venue = 'Cricket Stadium') {
    this.id = id;
    this.gameState = 'CONFIG';
    this.teamAName = nameA;
    this.teamBName = nameB;
    this.teamSize = teamSize;
    this.maxOvers = maxOvers;
    this.venue = venue;

    this.teamAPlayers = [];
    this.teamBPlayers = [];
    this.teamA = null;
    this.teamB = null;

    this.inningsOrder = null;
    this.tossData = null;
    this.tossWinnerTeam = null;

    this.firstInnings = null;
    this.secondInnings = null;
    this.superOverFirst = null;
    this.superOverSecond = null;
    this.goldenOverFirst = null;
    this.goldenOverSecond = null;

    this.currentInnings = null;
    this.matchResult = null;
  }
}

class CricerApp {
  constructor() {
    this.matches = [];
    this.activeMatchId = null;
    this.matchCounter = 1;

    this.init();
  }

  init() {
    this.createNewMatch();
    this.bindEvents();
  }

  get activeMatch() {
    return this.matches.find(m => m.id === this.activeMatchId) || this.matches[0];
  }

  createNewMatch() {
    const id = `match-${Date.now()}-${this.matchCounter++}`;
    const newM = new MatchInstance(id, '', '', 11, 2, 'Cricket Stadium');
    this.matches.push(newM);
    this.activeMatchId = id;
    this.renderActiveMatchesBar();
    this.loadMatchStateToUI();
  }

  renderActiveMatchesBar() {
    const bar = document.getElementById('active-matches-bar');
    if (!bar) return;

    if (this.matches.length <= 1 && this.activeMatch.gameState === 'CONFIG') {
      bar.style.display = 'none';
      return;
    }

    bar.style.display = 'flex';
    bar.innerHTML = this.matches.map((m, idx) => {
      const isActive = m.id === this.activeMatchId ? 'active' : '';
      const title = (m.teamA && m.teamB) 
        ? `${m.teamA.country} vs ${m.teamB.country}` 
        : `Match #${idx + 1}`;
      const score = m.currentInnings 
        ? `(${m.currentInnings.totalRuns}/${m.currentInnings.totalWickets})` 
        : '';
      return `
        <div class="match-tab ${isActive}" data-matchid="${m.id}">
          <i class="fa-solid fa-trophy"></i>
          <span>${title} ${score}</span>
        </div>
      `;
    }).join('');

    bar.querySelectorAll('.match-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.matchid;
        this.switchActiveMatch(id);
      });
    });
  }

  switchActiveMatch(id) {
    this.activeMatchId = id;
    this.renderActiveMatchesBar();
    this.loadMatchStateToUI();
  }

  loadMatchStateToUI() {
    const m = this.activeMatch;

    const cancelBtn = document.getElementById('btn-cancel-match');
    if (cancelBtn) {
      cancelBtn.style.display = (m.gameState !== 'CONFIG' && m.gameState !== 'MATCH_ENDED') ? 'inline-flex' : 'none';
    }

    if (m.gameState === 'CONFIG') {
      document.getElementById('config-panel').style.display = 'block';
      document.getElementById('live-hud').style.display = 'none';
      document.getElementById('control-deck').style.display = 'none';
      document.getElementById('teamA-input').value = m.teamAName;
      document.getElementById('teamB-input').value = m.teamBName;
      document.getElementById('venue-input').value = m.venue;
      document.getElementById('team-size-input').value = m.teamSize;
      document.getElementById('overs-input').value = m.maxOvers;
      this.updateStatusBadge('Match Setup', '');
    } else {
      document.getElementById('config-panel').style.display = 'none';
      document.getElementById('live-hud').style.display = 'block';
      document.getElementById('control-deck').style.display = 'flex';
      this.updateStatusBadge(`${m.gameState === 'INNINGS1' ? '1st' : '2nd'} Innings: ${m.currentInnings?.battingTeam.country || ''}`, 'live');
      this.updateScoreboardUI();
    }
  }

  bindEvents() {
    // Header Buttons: New Match & Cancel Match
    document.getElementById('btn-new-match')?.addEventListener('click', () => {
      this.createNewMatch();
    });

    document.getElementById('btn-cancel-match')?.addEventListener('click', () => {
      this.handleCancelMatch();
    });

    // Active Crease: Change & Swap Batters
    document.getElementById('btn-change-batters')?.addEventListener('click', () => {
      this.promptChangeBatters();
    });

    document.getElementById('btn-quick-swap-strike')?.addEventListener('click', () => {
      if (this.activeMatch.currentInnings) {
        this.activeMatch.currentInnings.swapStrikers();
        this.updateScoreboardUI();
      }
    });

    document.getElementById('modal-btn-swap-strike')?.addEventListener('click', () => {
      const sSelect = document.getElementById('change-striker-select');
      const nsSelect = document.getElementById('change-nonstriker-select');
      const tmp = sSelect.value;
      sSelect.value = nsSelect.value;
      nsSelect.value = tmp;
    });

    document.getElementById('btn-save-change-batters')?.addEventListener('click', () => {
      this.saveChangeBatters();
    });

    // Active Crease: Change Bowler Button
    document.getElementById('btn-change-bowler')?.addEventListener('click', () => {
      this.promptBowlerSelection();
    });

    // Step 1: Match Setup Form
    const setupForm = document.getElementById('match-setup-form');
    if (setupForm) {
      setupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.openRosterSetupModal();
      });
    }

    // Step Navigation: Back to Setup
    const handleBackToSetup = () => {
      document.getElementById('roster-setup-modal').classList.remove('active');
      document.getElementById('config-panel').style.display = 'block';
    };

    document.getElementById('btn-back-to-setup')?.addEventListener('click', handleBackToSetup);
    document.getElementById('btn-back-to-setup-footer')?.addEventListener('click', handleBackToSetup);

    // Step Navigation: Back to Toss from Openers Modal
    document.getElementById('btn-back-to-toss')?.addEventListener('click', () => {
      document.getElementById('select-openers-modal').classList.remove('active');
      document.getElementById('toss-modal').classList.add('active');
    });

    // Step Navigation: Back to Openers from Bowler Modal
    document.getElementById('btn-back-to-openers')?.addEventListener('click', () => {
      document.getElementById('select-bowler-modal').classList.remove('active');
      document.getElementById('select-openers-modal').classList.add('active');
    });

    // Step 2: Save Player Rosters & Start Toss
    document.getElementById('btn-save-rosters')?.addEventListener('click', () => {
      this.saveRostersAndStartToss();
    });

    // Step 3: Confirm Opening Batters
    document.getElementById('btn-confirm-openers')?.addEventListener('click', () => {
      this.saveOpenersAndStartInnings();
    });

    // Toss Call Buttons
    document.getElementById('toss-call-heads')?.addEventListener('click', () => this.handleTossCall('Heads'));
    document.getElementById('toss-call-tails')?.addEventListener('click', () => this.handleTossCall('Tails'));

    // Explicit Toss Decision Choices (Bat or Bowl First)
    document.getElementById('choice-bat')?.addEventListener('click', () => this.handleInningsChoice(true));
    document.getElementById('choice-bowl')?.addEventListener('click', () => this.handleInningsChoice(false));

    // Action Deck Buttons (Manual Runs 0 to 6 & Wickets)
    document.querySelectorAll('.action-btn[data-runs]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = parseInt(e.currentTarget.dataset.runs);
        this.handleBallInput(val);
      });
    });

    // Action Extras: Wide, No-Ball
    document.getElementById('btn-wide')?.addEventListener('click', () => this.handleBallInput(7));
    document.getElementById('btn-noball')?.addEventListener('click', () => {
      const extraRuns = parseInt(prompt("Runs scored off no-ball delivery (0-6):", "0") || "0");
      this.handleBallInput(8, extraRuns);
    });

    // Action Wide + Byes (701 to 704)
    document.querySelectorAll('.btn-extra-wide[data-widebyes]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = parseInt(e.currentTarget.dataset.widebyes);
        this.handleBallInput(val);
      });
    });

    // Action Byes (1 to 5)
    document.querySelectorAll('.btn-byes[data-byes]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const byesVal = parseInt(e.currentTarget.dataset.byes);
        this.handleBallInput(9, byesVal);
      });
    });

    // Undo Last Ball Button
    document.getElementById('btn-undo-ball')?.addEventListener('click', () => {
      this.handleUndoLastBall();
    });

    // Scorecard & Run Rate Graph Modals
    document.getElementById('btn-view-scorecard')?.addEventListener('click', () => this.openScorecardModal());
    document.getElementById('btn-view-graph')?.addEventListener('click', () => this.openGraphModal());

    // Modal Close Buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      });
    });
  }

  promptChangeBatters() {
    const m = this.activeMatch;
    if (!m.currentInnings || m.currentInnings.isCompleted) return;

    const modal = document.getElementById('change-batters-modal');
    const teamSpan = document.getElementById('change-batters-team-span');
    const sSelect = document.getElementById('change-striker-select');
    const nsSelect = document.getElementById('change-nonstriker-select');

    const inns = m.currentInnings;
    teamSpan.innerText = inns.battingTeam.country;

    const unOutBatters = inns.battingList.nodes.filter(n => !n.out);

    sSelect.innerHTML = unOutBatters.map(n => 
      `<option value="${n.name}" ${Utils.equalsIgnoreCase(n.name, inns.striker.name) ? 'selected' : ''}>${n.name}</option>`
    ).join('');

    nsSelect.innerHTML = unOutBatters.map(n => 
      `<option value="${n.name}" ${Utils.equalsIgnoreCase(n.name, inns.nonStriker.name) ? 'selected' : ''}>${n.name}</option>`
    ).join('');

    modal.classList.add('active');
  }

  saveChangeBatters() {
    const m = this.activeMatch;
    if (!m.currentInnings) return;

    const sVal = document.getElementById('change-striker-select').value;
    const nsVal = document.getElementById('change-nonstriker-select').value;

    if (sVal === nsVal) {
      alert("Striker and Non-Striker must be different players!");
      return;
    }

    m.currentInnings.setOpeners(sVal, nsVal);
    document.getElementById('change-batters-modal').classList.remove('active');
    this.updateScoreboardUI();
  }

  handleCancelMatch() {
    if (confirm("Are you sure you want to cancel this match? Progress will be lost.")) {
      if (this.matches.length > 1) {
        this.matches = this.matches.filter(m => m.id !== this.activeMatchId);
        this.activeMatchId = this.matches[0].id;
      } else {
        const m = this.activeMatch;
        m.gameState = 'CONFIG';
        m.currentInnings = null;
        m.firstInnings = null;
        m.secondInnings = null;
      }
      this.renderActiveMatchesBar();
      this.loadMatchStateToUI();
    }
  }

  openRosterSetupModal() {
    const m = this.activeMatch;
    m.teamAName = document.getElementById('teamA-input').value.trim() || 'Team A';
    m.teamBName = document.getElementById('teamB-input').value.trim() || 'Team B';
    m.venue = document.getElementById('venue-input').value.trim() || 'Cricket Stadium';
    m.teamSize = Math.max(2, Math.min(11, parseInt(document.getElementById('team-size-input').value) || 11));
    m.maxOvers = Math.max(1, Math.min(50, parseInt(document.getElementById('overs-input').value) || 2));

    document.getElementById('roster-teamA-heading').innerText = `${m.teamAName} (${m.teamSize} Players)`;
    document.getElementById('roster-teamB-heading').innerText = `${m.teamBName} (${m.teamSize} Players)`;

    const inputsA = document.getElementById('teamA-roster-inputs');
    inputsA.innerHTML = Array.from({ length: m.teamSize }, (_, i) => `
      <div class="form-group">
        <label class="form-label">Player ${i + 1}</label>
        <input type="text" class="form-control roster-input-a" value="" placeholder="Player ${i + 1} Name" required>
      </div>
    `).join('');

    const inputsB = document.getElementById('teamB-roster-inputs');
    inputsB.innerHTML = Array.from({ length: m.teamSize }, (_, i) => `
      <div class="form-group">
        <label class="form-label">Player ${i + 1}</label>
        <input type="text" class="form-control roster-input-b" value="" placeholder="Player ${i + 1} Name" required>
      </div>
    `).join('');

    document.getElementById('config-panel').style.display = 'none';
    document.getElementById('roster-setup-modal').classList.add('active');
  }

  saveRostersAndStartToss() {
    const m = this.activeMatch;
    const inputsA = document.querySelectorAll('.roster-input-a');
    m.teamAPlayers = Array.from(inputsA).map((input, i) => input.value.trim() || `Player ${i + 1}`);

    const inputsB = document.querySelectorAll('.roster-input-b');
    m.teamBPlayers = Array.from(inputsB).map((input, i) => input.value.trim() || `Player ${i + 1}`);

    m.teamA = createTeam(m.teamAName, m.teamAPlayers);
    m.teamB = createTeam(m.teamBName, m.teamBPlayers);

    document.getElementById('roster-setup-modal').classList.remove('active');

    m.gameState = 'TOSS';
    this.updateStatusBadge('Toss in Progress', 'live');
    this.renderActiveMatchesBar();

    document.getElementById('toss-modal').classList.add('active');
    document.getElementById('toss-teams-title').innerText = `${m.teamA.country} vs ${m.teamB.country}`;
  }

  handleTossCall(userCall) {
    const m = this.activeMatch;
    m.tossData = conductToss(m.teamA, m.teamB);
    const userWon = verifyToss(m.tossData, userCall);
    m.tossWinnerTeam = userWon ? m.teamA : m.teamB;

    document.getElementById('toss-call-section').style.display = 'none';
    document.getElementById('toss-anim-msg').innerText = 'Flipping Coin...';

    setTimeout(() => {
      document.getElementById('toss-result-text').innerText = `Coin landed on: ${m.tossData.outcome}!`;
      document.getElementById('toss-winner-prompt').innerText = `${m.tossWinnerTeam.country} WON the toss! Select Decision:`;
      document.getElementById('toss-choice-section').style.display = 'block';
    }, 600);
  }

  handleInningsChoice(winnerChoosesToBat) {
    const m = this.activeMatch;
    document.getElementById('toss-modal').classList.remove('active');

    const isTeamABattingFirst = (m.tossWinnerTeam.country === m.teamA.country) 
      ? winnerChoosesToBat 
      : !winnerChoosesToBat;

    if (isTeamABattingFirst) {
      m.inningsOrder = {
        battingFirst: m.teamA,
        bowlingFirst: m.teamB,
        battingSecond: m.teamB,
        bowlingSecond: m.teamA
      };
    } else {
      m.inningsOrder = {
        battingFirst: m.teamB,
        bowlingFirst: m.teamA,
        battingSecond: m.teamA,
        bowlingSecond: m.teamB
      };
    }

    m.firstInnings = new InningsState(m.inningsOrder.battingFirst, m.inningsOrder.bowlingFirst, m.maxOvers, 0, m.venue);
    m.currentInnings = m.firstInnings;
    m.gameState = 'INNINGS1';

    this.promptOpeningBattersSelection();
  }

  promptOpeningBattersSelection() {
    const m = this.activeMatch;
    const modal = document.getElementById('select-openers-modal');
    const teamSpan = document.getElementById('openers-team-name-span');
    const strikerSelect = document.getElementById('opening-striker-select');
    const nonStrikerSelect = document.getElementById('opening-nonstriker-select');

    teamSpan.innerText = m.currentInnings.battingTeam.country;

    const players = m.currentInnings.battingTeam.players;
    strikerSelect.innerHTML = players.map((p, idx) => `<option value="${p}" ${idx === 0 ? 'selected' : ''}>${p}</option>`).join('');
    nonStrikerSelect.innerHTML = players.map((p, idx) => `<option value="${p}" ${idx === 1 ? 'selected' : ''}>${p}</option>`).join('');

    modal.classList.add('active');
  }

  saveOpenersAndStartInnings() {
    const m = this.activeMatch;
    const strikerVal = document.getElementById('opening-striker-select').value;
    const nonStrikerVal = document.getElementById('opening-nonstriker-select').value;

    if (strikerVal === nonStrikerVal) {
      alert("Striker and Non-Striker must be different players!");
      return;
    }

    m.currentInnings.setOpeners(strikerVal, nonStrikerVal);
    document.getElementById('select-openers-modal').classList.remove('active');

    document.getElementById('live-hud').style.display = 'block';
    document.getElementById('control-deck').style.display = 'flex';
    document.getElementById('btn-cancel-match').style.display = 'inline-flex';

    this.updateStatusBadge(`${m.gameState === 'INNINGS1' ? '1st' : '2nd'} Innings: ${m.currentInnings.battingTeam.country} Batting`, 'live');
    this.updateScoreboardUI();

    this.promptBowlerSelection();
  }

  promptBowlerSelection() {
    const m = this.activeMatch;
    if (!m.currentInnings || m.currentInnings.isCompleted) return;

    const modal = document.getElementById('select-bowler-modal');
    const teamSpan = document.getElementById('bowling-team-name-span');
    const optionsContainer = document.getElementById('bowler-options-list');

    const inns = m.currentInnings;
    teamSpan.innerText = inns.bowlingTeam.country;

    const prevBowler = inns.lastOverBowlerName;

    optionsContainer.innerHTML = inns.bowlingTeam.players.map(p => {
      const bStat = inns.getBowlerStat(p);
      const isPrev = Utils.equalsIgnoreCase(p, prevBowler);
      const ovStr = `${Math.floor(bStat.ballsBowled / 6)}.${bStat.ballsBowled % 6}`;
      const figures = `(${ovStr} ov, ${bStat.runsConceded} runs, ${bStat.wickets} wkts)`;
      const disabledCls = isPrev ? 'disabled' : '';
      const subLabel = isPrev ? '(Cannot bowl 2 consecutive overs)' : figures;

      return `
        <button class="select-option-btn ${disabledCls}" data-bowler="${p}" ${isPrev ? 'disabled' : ''}>
          <span><i class="fa-solid fa-baseball"></i> ${p}</span>
          <span style="font-size: 0.78rem; color: ${isPrev ? 'var(--color-crimson)' : 'var(--text-muted)'};">${subLabel}</span>
        </button>
      `;
    }).join('');

    optionsContainer.querySelectorAll('.select-option-btn:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const selected = e.currentTarget.dataset.bowler;
        inns.setNextBowler(selected);
        modal.classList.remove('active');
        this.updateScoreboardUI();
      });
    });

    modal.classList.add('active');
  }

  promptIncomingBatsmanSelection() {
    const m = this.activeMatch;
    if (!m.currentInnings || m.currentInnings.isCompleted) return;

    const modal = document.getElementById('select-batsman-modal');
    const teamSpan = document.getElementById('batting-team-name-span');
    const optionsContainer = document.getElementById('batsman-options-list');

    const inns = m.currentInnings;
    teamSpan.innerText = inns.battingTeam.country;

    const available = inns.battingList.nodes.filter(n => !n.out && !Utils.equalsIgnoreCase(n.name, inns.nonStriker.name));

    if (available.length === 0) {
      modal.classList.remove('active');
      inns.isCompleted = true;
      this.handleInningsCompletion();
      return;
    }

    optionsContainer.innerHTML = available.map(n => `
      <button class="select-option-btn" data-batsman="${n.name}">
        <span><i class="fa-solid fa-user-plus"></i> ${n.name}</span>
        <span style="font-size: 0.8rem; color: var(--color-primary);">Upcoming Batter</span>
      </button>
    `).join('');

    optionsContainer.querySelectorAll('.select-option-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const selected = e.currentTarget.dataset.batsman;
        inns.setIncomingBatsman(selected);
        modal.classList.remove('active');
        this.updateScoreboardUI();
        if (inns.needsNewBowler && !inns.isCompleted) {
          this.promptBowlerSelection();
        }
      });
    });

    modal.classList.add('active');
  }

  handleBallInput(r, extraParam = 0) {
    const m = this.activeMatch;
    if (!m.currentInnings || m.currentInnings.isCompleted) return;

    const res = m.currentInnings.processBall(r, extraParam);
    if (!res) return;

    this.renderActiveMatchesBar();
    this.updateScoreboardUI();

    if (res.needsNewBatsman && !m.currentInnings.isCompleted) {
      this.promptIncomingBatsmanSelection();
    } else if (res.needsNewBowler && !m.currentInnings.isCompleted) {
      this.promptBowlerSelection();
    } else if (m.currentInnings.isCompleted) {
      this.handleInningsCompletion();
    }
  }

  handleUndoLastBall() {
    const m = this.activeMatch;
    if (!m.currentInnings) return;
    const success = m.currentInnings.undoLastBall();
    if (success) {
      this.renderActiveMatchesBar();
      this.updateScoreboardUI();
    } else {
      alert("No previous balls to undo in this match!");
    }
  }

  handleInningsCompletion() {
    const m = this.activeMatch;
    if (m.gameState === 'INNINGS1') {
      const target = m.firstInnings.totalRuns + 1;
      m.secondInnings = new InningsState(
        m.inningsOrder.battingSecond, 
        m.inningsOrder.bowlingSecond, 
        m.maxOvers, 
        target,
        m.venue
      );
      m.currentInnings = m.secondInnings;
      m.gameState = 'INNINGS2';

      this.updateStatusBadge(`2nd Innings: ${m.inningsOrder.battingSecond.country} (Target: ${target})`, 'live');
      alert(`End of 1st Innings!\n${m.inningsOrder.battingFirst.country}: ${m.firstInnings.totalRuns}/${m.firstInnings.totalWickets}\nTarget for ${m.inningsOrder.battingSecond.country}: ${target} runs.`);
      
      this.promptOpeningBattersSelection();
    } else if (m.gameState === 'INNINGS2') {
      m.matchResult = decideResult(
        m.firstInnings, 
        m.secondInnings, 
        m.inningsOrder.battingFirst.country, 
        m.inningsOrder.battingSecond.country
      );

      if (m.matchResult.isDraw) {
        alert("MATCH DRAWN! Initiating SUPER OVER!");
        this.startSuperOver();
      } else {
        this.finishMatch();
      }
    } else if (m.gameState === 'SUPEROVER') {
      m.matchResult = decideResult(
        m.superOverFirst, 
        m.superOverSecond, 
        m.inningsOrder.battingFirst.country, 
        m.inningsOrder.battingSecond.country
      );
      if (m.matchResult.isDraw) {
        alert("SUPER OVER TIED! Initiating GOLDEN OVER!");
        this.startGoldenOver();
      } else {
        this.finishMatch();
      }
    }
  }

  startSuperOver() {
    const m = this.activeMatch;
    m.gameState = 'SUPEROVER';
    m.superOverFirst = new InningsState(m.inningsOrder.battingFirst, m.inningsOrder.bowlingFirst, 1, 0, m.venue);
    m.currentInnings = m.superOverFirst;
    this.updateStatusBadge(`SUPER OVER: ${m.inningsOrder.battingFirst.country}`, 'live');
    this.promptOpeningBattersSelection();
  }

  startGoldenOver() {
    const m = this.activeMatch;
    m.goldenOverFirst = new InningsState(m.inningsOrder.battingFirst, m.inningsOrder.bowlingFirst, 1, 0, m.venue);
    m.currentInnings = m.goldenOverFirst;
    this.updateStatusBadge(`GOLDEN OVER: ${m.inningsOrder.battingFirst.country}`, 'live');
    this.promptOpeningBattersSelection();
  }

  finishMatch() {
    const m = this.activeMatch;
    m.gameState = 'MATCH_ENDED';
    this.updateStatusBadge('Match Completed', '');

    const mvp = decidePlayerOfMatch(m.firstInnings, m.secondInnings);

    document.getElementById('winner-banner-title').innerText = m.matchResult.isDraw 
      ? 'MATCH DRAWN!' 
      : `${m.matchResult.winner.toUpperCase()} WON!`;

    document.getElementById('winner-banner-sub').innerText = m.matchResult.isDraw 
      ? 'Honors Shared' 
      : (m.matchResult.winByRuns > 0 ? `Won by ${m.matchResult.winByRuns} Runs` : `Won by ${m.matchResult.winByWickets} Wickets`);

    document.getElementById('mvp-player-name').innerText = mvp;
    document.getElementById('match-ended-modal').classList.add('active');
  }

  updateStatusBadge(text, className) {
    const pill = document.getElementById('match-status-pill');
    if (pill) {
      pill.className = `status-pill ${className}`;
      pill.querySelector('.status-text').innerText = text;
    }
  }

  updateScoreboardUI() {
    const m = this.activeMatch;
    if (!m || !m.currentInnings) return;

    const inns = m.currentInnings;
    
    document.getElementById('hud-bat-team').innerText = inns.battingTeam.country;
    document.getElementById('hud-bowl-team').innerText = inns.bowlingTeam.country;
    document.getElementById('hud-venue-val').innerText = m.venue;
    document.getElementById('hud-big-score').innerText = `${inns.totalRuns}/${inns.totalWickets}`;
    document.getElementById('hud-overs-sub').innerText = `Overs: ${inns.getFormattedOvers()} / ${inns.maxOvers}`;

    document.getElementById('hud-crr').innerText = Utils.calcCRR(inns.totalRuns, inns.getOversFloat());
    if (inns.target > 0) {
      document.getElementById('hud-target-badge').style.display = 'inline-block';
      document.getElementById('hud-target-val').innerText = inns.target;
      const ballsLeft = (inns.maxOvers * 6) - (inns.currentOverIndex * 6 + inns.currentBallInOver);
      document.getElementById('hud-rrr-wrapper').style.display = 'inline';
      document.getElementById('hud-rrr').innerText = Utils.calcRRR(inns.target, inns.totalRuns, ballsLeft);
    } else {
      document.getElementById('hud-target-badge').style.display = 'none';
      document.getElementById('hud-rrr-wrapper').style.display = 'none';
    }

    const sStat = inns.getBattingStat(inns.striker.name);
    const nsStat = inns.getBattingStat(inns.nonStriker.name);

    const batter1Card = document.getElementById('batter1-card');
    const batter2Card = document.getElementById('batter2-card');

    document.getElementById('batter1-name').innerText = sStat.name;
    document.getElementById('batter1-stats').innerText = `${sStat.runs} (${sStat.balls})`;
    document.getElementById('batter1-bat-icon').style.display = 'inline';
    batter1Card.classList.add('striker');

    document.getElementById('batter2-name').innerText = nsStat.name;
    document.getElementById('batter2-stats').innerText = `${nsStat.runs} (${nsStat.balls})`;
    document.getElementById('batter2-bat-icon').style.display = 'none';
    batter2Card.classList.remove('striker');

    const bStat = inns.getBowlerStat(inns.currentBowlerName);
    const ovStr = `${Math.floor(bStat.ballsBowled / 6)}.${bStat.ballsBowled % 6}`;
    document.getElementById('bowler-name').innerText = bStat.name;
    document.getElementById('bowler-stats').innerText = `${bStat.wickets}/${bStat.runsConceded} (${ovStr} ov)`;

    const bubblesRow = document.getElementById('recent-balls-row');
    if (bubblesRow && inns.overs.length > 0) {
      const curOver = inns.overs[inns.overs.length - 1];
      bubblesRow.innerHTML = curOver.ballRuns.map(r => {
        let cls = 'run-0';
        let txt = r;
        if (r === -1) { cls = 'wicket'; txt = 'W'; }
        else if (r === -2) { cls = 'wicket'; txt = 'RO0'; }
        else if (r === -3) { cls = 'wicket'; txt = 'RO1'; }
        else if (r === -4) { cls = 'wicket'; txt = 'RO2'; }
        else if (r === 7) { cls = 'extra'; txt = 'WD'; }
        else if (r >= 701 && r <= 704) { cls = 'extra'; txt = `W+${r-700}B`; }
        else if (r === 8) { cls = 'extra'; txt = 'NB'; }
        else if (r >= 901 && r <= 905) { cls = 'extra'; txt = `${r-900}B`; }
        else if (r === 4) { cls = 'run-4'; txt = '4'; }
        else if (r === 6) { cls = 'run-6'; txt = '6'; }
        else if (r > 0) { cls = `run-${r}`; txt = r; }
        return `<div class="ball-bubble ${cls}">${txt}</div>`;
      }).join('');
    }
  }

  // Structured Table Scorecard Modal
  openScorecardModal() {
    const m = this.activeMatch;
    const modal = document.getElementById('scorecard-modal');
    const container = document.getElementById('scorecard-tables-container');
    if (!modal || !container || !m.firstInnings) return;

    const renderInningsTable = (inns, title) => {
      const activeBowlers = inns.bowlers.filter(b => b.ballsBowled > 0);

      const battingRows = inns.battingStats.map(bs => {
        const sr = bs.balls > 0 ? ((bs.runs / bs.balls) * 100).toFixed(2) : "0.00";
        const status = bs.out ? '<span style="color: var(--color-crimson);">out</span>' : '<span style="color: var(--color-primary); font-weight: 600;">not out</span>';
        return `
          <tr>
            <td style="font-weight: 600;">${bs.name}</td>
            <td style="font-weight: 700; color: var(--color-primary);">${bs.runs}</td>
            <td>${bs.balls}</td>
            <td>${sr}</td>
            <td>${status}</td>
          </tr>
        `;
      }).join('');

      const bowlingRows = activeBowlers.map(b => {
        const ovStr = `${Math.floor(b.ballsBowled / 6)}.${b.ballsBowled % 6}`;
        const ovFloat = b.ballsBowled / 6.0;
        const econ = ovFloat > 0 ? (b.runsConceded / ovFloat).toFixed(2) : "0.00";
        return `
          <tr>
            <td style="font-weight: 600;">${b.name}</td>
            <td>${ovStr}</td>
            <td>${b.runsConceded}</td>
            <td style="font-weight: 700; color: var(--color-gold);">${b.wickets}</td>
            <td>${econ}</td>
          </tr>
        `;
      }).join('');

      return `
        <div class="scorecard-table-container">
          <div class="scorecard-table-title">
            <span>${title}: ${inns.battingTeam.country}</span>
            <span class="venue-badge"><i class="fa-solid fa-location-dot"></i> ${m.venue}</span>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.8rem;">
            Total Score: <strong style="color: var(--color-primary);">${inns.totalRuns}/${inns.totalWickets}</strong> 
            (${inns.getFormattedOvers()} ov) | Wides: ${inns.totalWides}, No-balls: ${inns.totalNoBalls}, Byes: ${inns.totalByes}
          </div>

          <h4 style="font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px;">Batting Scorecard</h4>
          <table class="scorecard-table">
            <thead>
              <tr>
                <th>Batter</th>
                <th>Runs</th>
                <th>Balls</th>
                <th>SR</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${battingRows}
            </tbody>
          </table>

          <h4 style="font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px;">Bowling Figures</h4>
          <table class="scorecard-table">
            <thead>
              <tr>
                <th>Bowler</th>
                <th>Overs</th>
                <th>Runs</th>
                <th>Wkts</th>
                <th>Econ</th>
              </tr>
            </thead>
            <tbody>
              ${bowlingRows.length > 0 ? bowlingRows : '<tr><td colspan="5" style="color: var(--text-muted);">No overs bowled yet</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    };

    let html = renderInningsTable(m.firstInnings, "FIRST INNINGS");
    if (m.secondInnings) {
      html += renderInningsTable(m.secondInnings, "SECOND INNINGS");
    }

    container.innerHTML = html;

    document.getElementById('btn-download-scorecard').onclick = () => {
      let output = generateScorecardText(m.firstInnings.battingTeam, m.firstInnings, "FIRST INNINGS");
      if (m.secondInnings) {
        output += "\n\n" + generateScorecardText(m.secondInnings.battingTeam, m.secondInnings, "SECOND INNINGS");
      }
      const blob = new Blob([output], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${m.teamAName}_vs_${m.teamBName}_scorecard.txt`;
      a.click();
    };

    modal.classList.add('active');
  }

  openGraphModal() {
    const m = this.activeMatch;
    const modal = document.getElementById('graph-modal');
    const svg = document.getElementById('worm-chart-svg');
    if (!modal || !svg || !m.firstInnings) return;

    const inns = m.currentInnings || m.firstInnings;
    const crr = Utils.calcCRR(inns.totalRuns, inns.getOversFloat());
    const projected = Math.round((inns.totalRuns / Math.max(0.1, inns.getOversFloat())) * inns.maxOvers);

    document.getElementById('graph-stat-score').innerText = `${inns.totalRuns}/${inns.totalWickets}`;
    document.getElementById('graph-stat-crr').innerText = crr;
    document.getElementById('graph-stat-projected').innerText = projected;

    const firstBallRuns = m.firstInnings.ballByBallCumulativeRuns || [0];
    const secondBallRuns = m.secondInnings ? (m.secondInnings.ballByBallCumulativeRuns || [0]) : [];

    const totalMatchBalls = (m.maxOvers * 6);
    const maxRuns = Math.max(10, projected, ...firstBallRuns, ...secondBallRuns);

    document.getElementById('graph-stat-max').innerText = Math.max(0, ...firstBallRuns, ...secondBallRuns);

    const legendA = document.getElementById('graph-legend-teamA');
    const legendB = document.getElementById('graph-legend-teamB');

    if (legendA) legendA.innerText = `— ${m.firstInnings.battingTeam.country} (${firstBallRuns.length - 1} Balls)`;
    if (legendB) legendB.innerText = m.secondInnings ? `— ${m.secondInnings.battingTeam.country} (${secondBallRuns.length - 1} Balls)` : '';

    const stepX = 420 / Math.max(1, totalMatchBalls);
    const scaleY = 190 / maxRuns;

    const pointsA = firstBallRuns.map((r, idx) => {
      const x = 40 + (idx * stepX);
      const y = 220 - (r * scaleY);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const pointsB = secondBallRuns.map((r, idx) => {
      const x = 40 + (idx * stepX);
      const y = 220 - (r * scaleY);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    svg.innerHTML = `
      <!-- X & Y Axes -->
      <line x1="40" y1="220" x2="470" y2="220" stroke="#94a3b8" stroke-width="2"/>
      <line x1="40" y1="20" x2="40" y2="220" stroke="#94a3b8" stroke-width="2"/>

      <!-- Axis Labels & Gridlines -->
      <text x="40" y="242" fill="#64748b" font-size="10">0</text>
      <text x="250" y="242" fill="#64748b" font-size="10">Mid Match (${(m.maxOvers/2).toFixed(1)} ov)</text>
      <text x="460" y="242" fill="#64748b" font-size="10">${m.maxOvers} ov</text>

      <text x="15" y="225" fill="#64748b" font-size="10">0</text>
      <text x="15" y="125" fill="#64748b" font-size="10">${Math.round(maxRuns/2)}</text>
      <text x="15" y="25" fill="#64748b" font-size="10">${maxRuns}</text>

      <line x1="40" y1="120" x2="470" y2="120" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>
      <line x1="40" y1="70" x2="470" y2="70" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>

      <!-- 1st Innings Line (Emerald) -->
      ${pointsA ? `<polyline fill="none" stroke="#00ff88" stroke-width="3" points="${pointsA}"/>` : ''}

      <!-- 2nd Innings Line (Cyan) -->
      ${pointsB ? `<polyline fill="none" stroke="#00f0ff" stroke-width="3" points="${pointsB}"/>` : ''}
    `;

    modal.classList.add('active');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.cricerApp = new CricerApp();
});
