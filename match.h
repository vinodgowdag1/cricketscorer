#ifndef MATCH_H
#define MATCH_H

#include "player.h"
#include "utils.h"

#define MAX_OVERS 50

typedef struct {
    int overNumber;
    int ballRuns[6];     // legal deliveries runs
    int ballIsOut[6];    // wicket markers
    int totalRuns;       // runs in this over
    int wicketsInOver;   // wickets in this over
    char bowlerName[NAME_LEN];
    int widesInOver;     // wides counted
    int noBallsInOver;   // no-balls counted
} Over;

typedef struct {
    char name[NAME_LEN];
    int oversBowled;
    int runsConceded;
    int wickets;
} BowlerStat;

typedef struct {
    char name[NAME_LEN];
    int runs;
    int balls;
    int out;
} BattingStat;

typedef struct {
    int totalRuns;
    int totalWickets;
    int oversPlayed;         // completed overs
    Over overs[MAX_OVERS];   // cap overs
    BowlerStat bowlers[MAX_TEAM_PLAYERS];
    int bowlerCount;
    int totalWides;
    int totalNoBalls;
    int target;              // for second innings (informational)
    BattingStat battingStats[MAX_TEAM_PLAYERS]; // persisted batting stats
    int battingCount;
    int perOverTotals[MAX_OVERS]; // for graph
} Innings;

typedef struct {
    char outcome[6]; // "Heads" or "Tails"
} TossResult;

typedef struct {
    Team* battingFirst;
    Team* bowlingFirst;
    Team* battingSecond;
    Team* bowlingSecond;
} InningsOrder;

// Fixed MatchResult to match usage in match.c (isDraw, winByRuns, winByWickets)
typedef struct {
    char winner[NAME_LEN];
    int winByRuns;      // >0 if won by runs
    int winByWickets;   // >0 if won by wickets
    int isDraw;         // 1 if draw/tie, else 0
} MatchResult;

void printScorecard(Team* battingTeam, Innings* inns, const char* title);
void saveScorecard(Team* battingTeam, Innings* inns, const char* filename, const char* title);

// Toss and order
TossResult conductToss(const char* teamA, const char* teamB);
int verifyToss(TossResult toss); // returns 1 if user guessed correctly
InningsOrder chooseInningsOrder(int userWonToss, Team* teamA, Team* teamB);

// Innings simulation
Innings simulateInnings(Team* battingTeam, Team* bowlingTeam, int maxOvers);

// Result
MatchResult decideResult(Innings* first, Innings* second, const char* firstBatTeam, const char* secondBatTeam);
void printResultBanner(MatchResult result);
void congratulateWinner(MatchResult result);

// Player of the Match
void decidePlayerOfMatch(Innings* first, Innings* second, const char* teamA, const char* teamB);

// Super Over
Innings playSuperOver(Team* battingTeam, Team* bowlingTeam);

#endif