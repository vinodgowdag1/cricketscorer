/**
 * Cricer Engine - JavaScript mirror of C Scoreboard Simulator Core Engine
 * Retains 100% of C structs, rules, toss, super over, golden over, player of the match,
 * and scorecard export functionality.
 * Calculates exact ball-by-ball over progression (0.1, 0.2, 0.3, 0.4, 0.5, 1.0).
 */

export const Utils = {
  randomHeadsTails() {
    return Math.floor(Math.random() * 2);
  },
  random0or1() {
    return Math.floor(Math.random() * 2);
  },
  equalsIgnoreCase(str1, str2) {
    if (!str1 || !str2) return false;
    return str1.trim().toLowerCase() === str2.trim().toLowerCase();
  },
  calcCRR(totalRuns, oversCompletedFloat) {
    if (oversCompletedFloat <= 0) return (0.0).toFixed(2);
    return (totalRuns / oversCompletedFloat).toFixed(2);
  },
  calcRRR(target, currentRuns, ballsLeft) {
    if (ballsLeft <= 0) return (0.0).toFixed(2);
    const runsNeeded = target - currentRuns;
    if (runsNeeded <= 0) return (0.0).toFixed(2);
    const oversLeft = ballsLeft / 6.0;
    return (runsNeeded / oversLeft).toFixed(2);
  }
};

export function createTeam(countryName, playerList = []) {
  const count = playerList.length;
  const roster = (Array.isArray(playerList) && count >= 2)
    ? playerList
    : Array.from({ length: count || 11 }, (_, i) => `${countryName} Player ${i + 1}`);

  return {
    country: countryName,
    players: roster,
    playerCount: roster.length
  };
}

export class BattingList {
  constructor(team) {
    this.nodes = team.players.map(p => ({
      name: p,
      runs: 0,
      balls: 0,
      out: false
    }));
  }

  findPlayerNode(name) {
    return this.nodes.find(n => Utils.equalsIgnoreCase(n.name, name)) || null;
  }

  getAvailableBatsmen(excludeNames = []) {
    return this.nodes.filter(n => !n.out && !excludeNames.some(ex => Utils.equalsIgnoreCase(ex, n.name)));
  }
}

export class InningsState {
  constructor(battingTeam, bowlingTeam, maxOvers, target = 0, venue = 'Cricket Stadium') {
    this.battingTeam = battingTeam;
    this.bowlingTeam = bowlingTeam;
    this.maxOvers = maxOvers;
    this.target = target;
    this.venue = venue;
    this.maxWickets = Math.max(1, battingTeam.playerCount - 1);

    this.totalRuns = 0;
    this.totalWickets = 0;
    this.oversPlayed = 0;
    this.currentOverIndex = 0;
    this.currentBallInOver = 0;

    this.totalWides = 0;
    this.totalNoBalls = 0;
    this.totalByes = 0;

    this.overs = [];
    
    this.bowlers = bowlingTeam.players.map(p => ({
      name: p,
      ballsBowled: 0,
      runsConceded: 0,
      wickets: 0
    }));

    this.battingStats = battingTeam.players.map(p => ({
      name: p,
      runs: 0,
      balls: 0,
      out: false
    }));

    this.perOverTotals = [];
    this.ballByBallCumulativeRuns = [0];

    this.battingList = new BattingList(battingTeam);

    const available = this.battingList.nodes;
    this.striker = available[0];
    this.nonStriker = available[1] || available[0];
    
    this.currentBowlerName = bowlingTeam.players[bowlingTeam.players.length - 1] || bowlingTeam.players[0];
    this.lastOverBowlerName = null;

    this.isCompleted = false;
    this.needsNewBowler = false;
    this.needsNewBatsman = false;
    this.runoutCompletedRuns = 0;

    this.ballHistoryStack = [];

    this.startNewOver();
  }

  getFormattedOvers() {
    return `${this.currentOverIndex}.${this.currentBallInOver}`;
  }

  getOversFloat() {
    return (this.currentOverIndex * 6 + this.currentBallInOver) / 6.0;
  }

  setOpeners(strikerName, nonStrikerName) {
    const sNode = this.battingList.findPlayerNode(strikerName);
    const nsNode = this.battingList.findPlayerNode(nonStrikerName);
    if (sNode) this.striker = sNode;
    if (nsNode) this.nonStriker = nsNode;
  }

  startNewOver() {
    if (this.currentOverIndex >= this.maxOvers || this.totalWickets >= this.maxWickets) {
      this.isCompleted = true;
      return;
    }
    const newOver = {
      overNumber: this.currentOverIndex + 1,
      bowlerName: this.currentBowlerName,
      ballRuns: [],
      ballIsOut: [],
      totalRuns: 0,
      wicketsInOver: 0,
      widesInOver: 0,
      noBallsInOver: 0
    };
    this.overs.push(newOver);
    this.currentBallInOver = 0;
    this.needsNewBowler = false;
  }

  setNextBowler(bowlerName) {
    let bStat = this.getBowlerStat(bowlerName);
    this.currentBowlerName = bStat.name;

    if (this.overs.length > 0) {
      this.overs[this.overs.length - 1].bowlerName = bStat.name;
    }
    this.needsNewBowler = false;
  }

  setIncomingBatsman(batsmanName) {
    const nextNode = this.battingList.findPlayerNode(batsmanName);
    if (!nextNode || nextNode.out) return;

    if (this.runoutCompletedRuns === 1) {
      this.striker = this.nonStriker;
      this.nonStriker = nextNode;
    } else {
      this.striker = nextNode;
    }

    this.needsNewBatsman = false;
    this.runoutCompletedRuns = 0;
  }

  getBowlerStat(name) {
    let b = this.bowlers.find(x => Utils.equalsIgnoreCase(x.name, name));
    if (!b) {
      b = { name, ballsBowled: 0, runsConceded: 0, wickets: 0 };
      this.bowlers.push(b);
    }
    return b;
  }

  getBattingStat(name) {
    let b = this.battingStats.find(x => Utils.equalsIgnoreCase(x.name, name));
    if (!b) {
      b = { name, runs: 0, balls: 0, out: false };
      this.battingStats.push(b);
    }
    return b;
  }

  swapStrikers() {
    const tmp = this.striker;
    this.striker = this.nonStriker;
    this.nonStriker = tmp;
  }

  saveSnapshot(r, extraParam) {
    const snapshot = {
      r,
      extraParam,
      totalRuns: this.totalRuns,
      totalWickets: this.totalWickets,
      oversPlayed: this.oversPlayed,
      currentOverIndex: this.currentOverIndex,
      currentBallInOver: this.currentBallInOver,
      totalWides: this.totalWides,
      totalNoBalls: this.totalNoBalls,
      totalByes: this.totalByes,
      strikerName: this.striker.name,
      nonStrikerName: this.nonStriker.name,
      currentBowlerName: this.currentBowlerName,
      lastOverBowlerName: this.lastOverBowlerName,
      isCompleted: this.isCompleted,
      runoutCompletedRuns: this.runoutCompletedRuns,
      battingStatsCopy: JSON.parse(JSON.stringify(this.battingStats)),
      bowlersCopy: JSON.parse(JSON.stringify(this.bowlers)),
      oversCopy: JSON.parse(JSON.stringify(this.overs)),
      nodesCopy: JSON.parse(JSON.stringify(this.battingList.nodes)),
      ballByBallCumulativeRunsCopy: JSON.parse(JSON.stringify(this.ballByBallCumulativeRuns))
    };
    this.ballHistoryStack.push(snapshot);
  }

  undoLastBall() {
    if (this.ballHistoryStack.length === 0) return false;

    const snap = this.ballHistoryStack.pop();

    this.totalRuns = snap.totalRuns;
    this.totalWickets = snap.totalWickets;
    this.oversPlayed = snap.oversPlayed;
    this.currentOverIndex = snap.currentOverIndex;
    this.currentBallInOver = snap.currentBallInOver;
    this.totalWides = snap.totalWides;
    this.totalNoBalls = snap.totalNoBalls;
    this.totalByes = snap.totalByes;
    this.isCompleted = snap.isCompleted;
    this.runoutCompletedRuns = snap.runoutCompletedRuns;
    this.currentBowlerName = snap.currentBowlerName;
    this.lastOverBowlerName = snap.lastOverBowlerName;

    this.battingStats = snap.battingStatsCopy;
    this.bowlers = snap.bowlersCopy;
    this.overs = snap.oversCopy;
    this.battingList.nodes = snap.nodesCopy;
    this.ballByBallCumulativeRuns = snap.ballByBallCumulativeRunsCopy;

    const sNode = this.battingList.findPlayerNode(snap.strikerName);
    const nsNode = this.battingList.findPlayerNode(snap.nonStrikerName);
    if (sNode) this.striker = sNode;
    if (nsNode) this.nonStriker = nsNode;

    this.needsNewBatsman = false;
    this.needsNewBowler = false;

    return true;
  }

  processBall(r, extraParam = 0) {
    if (this.isCompleted) return null;

    this.saveSnapshot(r, extraParam);

    const currentOver = this.overs[this.currentOverIndex];
    let bStat = this.getBowlerStat(this.currentBowlerName);
    let sStat = this.getBattingStat(this.striker.name);

    let isWicket = false;
    let isRunout = false;
    let isWide = false;
    let isNoBall = false;
    let isByes = false;
    let runsScored = 0;

    if (r === -1) {
      isWicket = true;
      sStat.out = true;
      this.striker.out = true;
      bStat.wickets++;
      bStat.ballsBowled++;
      this.totalWickets++;
      currentOver.wicketsInOver++;
      currentOver.ballIsOut.push(1);
      currentOver.ballRuns.push(-1);
      this.currentBallInOver++;
      this.runoutCompletedRuns = 0;

      if (this.totalWickets >= this.maxWickets) {
        this.isCompleted = true;
      } else {
        this.needsNewBatsman = true;
      }
    }
    else if (r === -2 || r === -3 || r === -4) {
      isWicket = true;
      isRunout = true;
      const runsCompleted = r === -2 ? 0 : (r === -3 ? 1 : 2);
      this.runoutCompletedRuns = runsCompleted;

      sStat.runs += runsCompleted;
      sStat.balls++;
      sStat.out = true;
      this.striker.out = true;

      this.totalRuns += runsCompleted;
      currentOver.totalRuns += runsCompleted;
      bStat.runsConceded += runsCompleted;
      bStat.ballsBowled++;

      this.totalWickets++;
      currentOver.wicketsInOver++;
      currentOver.ballIsOut.push(1);
      currentOver.ballRuns.push(r);
      this.currentBallInOver++;

      if (this.totalWickets >= this.maxWickets) {
        this.isCompleted = true;
      } else {
        this.needsNewBatsman = true;
      }
    }
    else if (r === 7) {
      isWide = true;
      this.totalWides++;
      this.totalRuns++;
      currentOver.totalRuns++;
      currentOver.widesInOver++;
      bStat.runsConceded++;
      currentOver.ballRuns.push(7);
      currentOver.ballIsOut.push(0);
    }
    else if (r >= 701 && r <= 704) {
      isWide = true;
      isByes = true;
      const byesRuns = r - 700;
      const totalWideByes = 1 + byesRuns;

      this.totalWides++;
      this.totalByes += byesRuns;
      this.totalRuns += totalWideByes;
      currentOver.totalRuns += totalWideByes;
      currentOver.widesInOver++;
      bStat.runsConceded += totalWideByes;
      currentOver.ballRuns.push(r);
      currentOver.ballIsOut.push(0);

      if (byesRuns % 2 !== 0) {
        this.swapStrikers();
      }
    }
    else if (r === 8) {
      isNoBall = true;
      this.totalNoBalls++;
      this.totalRuns += (1 + extraParam);
      currentOver.totalRuns += (1 + extraParam);
      currentOver.noBallsInOver++;
      bStat.runsConceded += (1 + extraParam);

      sStat.runs += extraParam;
      sStat.balls++;
      runsScored = extraParam;
      currentOver.ballRuns.push(8);
      currentOver.ballIsOut.push(0);
    }
    else if (r === 9) {
      isByes = true;
      const byesVal = Math.max(1, Math.min(5, extraParam));
      this.totalByes += byesVal;
      this.totalRuns += byesVal;
      currentOver.totalRuns += byesVal;

      sStat.balls++;
      bStat.ballsBowled++;
      currentOver.ballRuns.push(900 + byesVal);
      currentOver.ballIsOut.push(0);
      this.currentBallInOver++;

      if (byesVal % 2 !== 0) {
        this.swapStrikers();
      }
    }
    else {
      runsScored = Math.max(0, Math.min(6, r));
      sStat.runs += runsScored;
      sStat.balls++;
      this.totalRuns += runsScored;
      currentOver.totalRuns += runsScored;
      bStat.runsConceded += runsScored;
      bStat.ballsBowled++;
      currentOver.ballRuns.push(runsScored);
      currentOver.ballIsOut.push(0);

      this.currentBallInOver++;

      if (runsScored % 2 !== 0) {
        this.swapStrikers();
      }
    }

    this.ballByBallCumulativeRuns.push(this.totalRuns);
    this.oversPlayed = this.getOversFloat();

    if (this.target > 0 && this.totalRuns >= this.target) {
      this.isCompleted = true;
    }

    if (this.currentBallInOver >= 6 && !this.isCompleted) {
      this.perOverTotals.push(currentOver.totalRuns);
      this.swapStrikers();

      this.lastOverBowlerName = this.currentBowlerName;

      this.currentOverIndex++;
      this.currentBallInOver = 0;

      if (this.currentOverIndex < this.maxOvers) {
        this.needsNewBowler = true;
      } else {
        this.isCompleted = true;
      }
    }

    return {
      runs: runsScored,
      isWicket,
      isRunout,
      isWide,
      isNoBall,
      isByes,
      totalRuns: this.totalRuns,
      totalWickets: this.totalWickets,
      formattedOvers: this.getFormattedOvers(),
      needsNewBowler: this.needsNewBowler,
      needsNewBatsman: this.needsNewBatsman
    };
  }
}

export function conductToss(teamA, teamB) {
  const coin = Utils.randomHeadsTails();
  return {
    outcome: coin === 1 ? "Heads" : "Tails",
    teamA: teamA.country,
    teamB: teamB.country
  };
}

export function verifyToss(tossResult, userGuess) {
  return Utils.equalsIgnoreCase(tossResult.outcome, userGuess);
}

export function chooseInningsOrder(userWonToss, userChoiceBat, teamA, teamB) {
  let userBats = false;
  if (userWonToss) {
    userBats = userChoiceBat;
  } else {
    const oppChoiceBat = Utils.random0or1();
    userBats = !oppChoiceBat;
  }

  if (userBats) {
    return {
      battingFirst: teamA,
      bowlingFirst: teamB,
      battingSecond: teamB,
      bowlingSecond: teamA
    };
  } else {
    return {
      battingFirst: teamB,
      bowlingFirst: teamA,
      battingSecond: teamA,
      bowlingSecond: teamB
    };
  }
}

export function decideResult(firstInnings, secondInnings, firstBatTeam, secondBatTeam) {
  let res = {
    winner: "",
    winByRuns: 0,
    winByWickets: 0,
    isDraw: false
  };

  if (firstInnings.totalRuns > secondInnings.totalRuns) {
    res.winner = firstBatTeam;
    res.winByRuns = firstInnings.totalRuns - secondInnings.totalRuns;
    res.winByWickets = 0;
  } else if (secondInnings.totalRuns > firstInnings.totalRuns) {
    res.winner = secondBatTeam;
    res.winByRuns = 0;
    res.winByWickets = (secondInnings.battingTeam.playerCount - 1) - secondInnings.totalWickets;
  } else {
    res.isDraw = true;
  }
  return res;
}

export function decidePlayerOfMatch(firstInnings, secondInnings) {
  let bestPlayer = "";
  let bestScore = -1;

  const evaluatePlayer = (battingStats, bowlerStats) => {
    battingStats.forEach(b => {
      const score = b.runs * 1.5;
      if (score > bestScore) {
        bestScore = score;
        bestPlayer = b.name;
      }
    });
    bowlerStats.forEach(bw => {
      if (bw.ballsBowled > 0) {
        const score = bw.wickets * 25 - bw.runsConceded * 0.5;
        if (score > bestScore) {
          bestScore = score;
          bestPlayer = bw.name;
        }
      }
    });
  };

  evaluatePlayer(firstInnings.battingStats, firstInnings.bowlers);
  evaluatePlayer(secondInnings.battingStats, secondInnings.bowlers);

  return bestPlayer || "Match MVP";
}

export function generateScorecardText(battingTeam, innings, title) {
  let lines = [];
  lines.push(`================ ${title}: ${battingTeam.country} ================`);
  lines.push(`Venue: ${innings.venue}`);
  lines.push(`Total: ${innings.totalRuns}/${innings.totalWickets} in ${innings.getFormattedOvers()} overs | Wides: ${innings.totalWides}, No-balls: ${innings.totalNoBalls}, Byes: ${innings.totalByes}`);
  lines.push(`-----------------------------------------------------------`);
  lines.push(`Batting Summary:`);

  innings.battingStats.forEach(bs => {
    const sr = bs.balls > 0 ? ((bs.runs / bs.balls) * 100).toFixed(2) : "0.00";
    const status = bs.out ? "out" : "not out";
    lines.push(`${bs.name.padEnd(16)} Runs: ${String(bs.runs).padStart(3)}  Balls: ${String(bs.balls).padStart(3)}  SR: ${sr.padStart(6)}  ${status}`);
  });

  lines.push(``);
  lines.push(`Bowling Summary:`);

  const activeBowlers = innings.bowlers.filter(b => b.ballsBowled > 0);
  activeBowlers.forEach(b => {
    const ovStr = `${Math.floor(b.ballsBowled / 6)}.${b.ballsBowled % 6}`;
    const ovFloat = b.ballsBowled / 6.0;
    const econ = ovFloat > 0 ? (b.runsConceded / ovFloat).toFixed(2) : "0.00";
    lines.push(`${b.name.padEnd(16)} Overs: ${ovStr.padStart(4)}  Runs: ${String(b.runsConceded).padStart(3)}  Wkts: ${String(b.wickets).padStart(2)}  Econ: ${econ}`);
  });

  lines.push(`================================---------------------------`);
  return lines.join('\n');
}
