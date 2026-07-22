#include <stdio.h>
#include <string.h>
#include "match.h"
#include "utils.h"
#include "batting.h"
#include "bowling.h"
#include "stack.h"

static int findBowlerStatIndex(Innings* inns, const char* name) {
    for (int i = 0; i < inns->bowlerCount; i++) {
        if (equalsIgnoreCase(inns->bowlers[i].name, name)) return i;
    }
    if (inns->bowlerCount < MAX_TEAM_PLAYERS) {
        strncpy(inns->bowlers[inns->bowlerCount].name, name, NAME_LEN - 1);
        inns->bowlers[inns->bowlerCount].name[NAME_LEN - 1] = '\0';
        inns->bowlers[inns->bowlerCount].oversBowled = 0;
        inns->bowlers[inns->bowlerCount].runsConceded = 0;
        inns->bowlers[inns->bowlerCount].wickets = 0;
        inns->bowlerCount++;
        return inns->bowlerCount - 1;
    }
    return 0;
}

// Toss
TossResult conductToss(const char* teamA, const char* teamB) {
    TossResult t;
    int coin = randomHeadsTails(); // 0 tails, 1 heads
    strcpy(t.outcome, coin ? "Heads" : "Tails");
    printf("\nToss between %s and %s. Call Heads or Tails: ", teamA, teamB);
    return t;
}

int verifyToss(TossResult toss) {
    char guess[10];
    scanf("%9s", guess);
    int correct = equalsIgnoreCase(guess, toss.outcome);
    printf("Toss result: %s. You %s the toss.\n", toss.outcome, correct ? "won" : "lost");
    return correct ? 1 : 0;
}

InningsOrder chooseInningsOrder(int userWonToss, Team* teamA, Team* teamB) {
    InningsOrder order;
    if (userWonToss) {
        char choice[10];
        printf("Choose Bat or Bowl: ");
        scanf("%9s", choice);
        int userBats = equalsIgnoreCase(choice, "Bat") || equalsIgnoreCase(choice, "Batting");
        if (userBats) {
            order.battingFirst = teamA;
            order.bowlingFirst = teamB;
            order.battingSecond = teamB;
            order.bowlingSecond = teamA;
        } else {
            order.battingFirst = teamB;
            order.bowlingFirst = teamA;
            order.battingSecond = teamA;
            order.bowlingSecond = teamB;
        }
    } else {
        int oppChoiceBat = random0or1();
        printf("Opponent chooses to %s.\n", oppChoiceBat ? "Bat" : "Bowl");
        if (oppChoiceBat) {
            order.battingFirst = teamB;
            order.bowlingFirst = teamA;
            order.battingSecond = teamA;
            order.bowlingSecond = teamB;
        } else {
            order.battingFirst = teamA;
            order.bowlingFirst = teamB;
            order.battingSecond = teamB;
            order.bowlingSecond = teamA;
        }
    }
    return order;
}

// Core innings simulation
static void checkMilestonesAndPrint(PlayerNode* batsman, int bowlerWickets, const char* bowlerName) {
    char buf[128];
    if (batsman && (batsman->runs == 50 || batsman->runs == 100)) {
        commentaryMilestoneBat(batsman->name, batsman->runs, buf, sizeof(buf));
        printf("%s\n", buf);
    }
    if (bowlerWickets == 3 || bowlerWickets == 5) {
        commentaryMilestoneBowl(bowlerName, bowlerWickets, buf, sizeof(buf));
        printf("%s\n", buf);
    }
}

Innings simulateInnings(Team* battingTeam, Team* bowlingTeam, int maxOvers) {
    Innings inns;
    memset(&inns, 0, sizeof(Innings));

    PlayerNode* battingList = buildBattingListFromTeam(battingTeam);
    BowlerQueue bowlQ; initQueueFromTeam(&bowlQ, bowlingTeam);

    char strikerName[NAME_LEN], nonStrikerName[NAME_LEN];
    PlayerNode* striker = NULL;
    PlayerNode* nonStriker = NULL;

    // Select striker
    do {
        printf("Select striker: ");
        scanf(" %[^\n]", strikerName);
        striker = findPlayerNode(battingList, strikerName);
        if (!striker || striker->out) striker = NULL;
    } while (!striker);

    // Select non-striker
    do {
        printf("Select non-striker: ");
        scanf(" %[^\n]", nonStrikerName);
        nonStriker = findPlayerNode(battingList, nonStrikerName);
        if (!nonStriker || nonStriker == striker || nonStriker->out) nonStriker = NULL;
    } while (!nonStriker);

    int wicketsLost = 0;

    for (int over = 0; over < maxOvers && wicketsLost < 10; over++) {
        Over* ov = &inns.overs[over];
        ov->overNumber = over + 1;
        ov->totalRuns = 0;

        char currentBowler[NAME_LEN];
        printf("Enter bowler name for Over %d: ", over + 1);
        scanf(" %[^\n]", currentBowler);
        strncpy(ov->bowlerName, currentBowler, NAME_LEN - 1);
        ov->bowlerName[NAME_LEN - 1] = '\0';

        int bi = findBowlerStatIndex(&inns, currentBowler);
        inns.bowlers[bi].oversBowled++;

        printf("\n— Over %d — Bowler: %s (%s)\n", over + 1, currentBowler, bowlingTeam->country);

        for (int ball = 0; ball < 6 && wicketsLost < 10; ) {
            printf("Over %d, Ball %d — Enter runs (0-6), -1 if OUT, 7 for Wide, 8 for No-ball: ",
                   over + 1, ball + 1);
            int r; scanf(" %d", &r);

            if (r == -1) {
                printf("❌ WICKET! %s is OUT!\n", striker->name);
                striker->out = 1;
                inns.bowlers[bi].wickets++;
                wicketsLost++;
                ball++;
            }
            else if (r == 7) {
                printf("⚠ Wide ball! Extra run added.\n");
                inns.totalRuns++; ov->totalRuns++;
                inns.bowlers[bi].runsConceded++;
            }
            else if (r == 8) {
                printf("⚠ No-ball! Extra run added.\n");
                inns.totalRuns++; ov->totalRuns++;
                inns.bowlers[bi].runsConceded++;
                ov->noBallsInOver++; inns.totalNoBalls++;

                int nbRuns;
                printf("Runs scored off no-ball delivery (0-6): ");
                scanf(" %d", &nbRuns);

                // ✅ Validation: max 6 runs off no-ball delivery
                if (nbRuns < 0 || nbRuns > 6) {
                    printf("Invalid input! Runs must be between 0 and 6.\n");
                    nbRuns = 0;
                }

                striker->runs += nbRuns;
                striker->balls++;
                inns.totalRuns += nbRuns; ov->totalRuns += nbRuns;
                inns.bowlers[bi].runsConceded += nbRuns;

                if (nbRuns == 4) printf("💥 Fantastic FOUR off the no-ball!\n");
                else if (nbRuns == 6) printf("🚀 SUPER SIX off the no-ball!\n");

                if (striker->runs == 50) printf("🎉 Milestone: %s reaches a HALF-CENTURY!\n", striker->name);
                else if (striker->runs == 100) printf("🔥 CENTURY! %s brings up a magnificent hundred!\n", striker->name);
            }
            else {
                // ✅ Validation: max 6 runs on a normal ball
                if (r < 0 || r > 6) {
                    printf("Invalid input! Runs must be between 0 and 6.\n");
                    r = 0;
                }

                striker->runs += r;
                striker->balls++;
                inns.totalRuns += r; ov->totalRuns += r;
                inns.bowlers[bi].runsConceded += r;

                if (r == 4) printf("💥 Fantastic FOUR by %s!\n", striker->name);
                else if (r == 6) printf("🚀 SUPER SIX by %s!\n", striker->name);

                if (striker->runs == 50) printf("🎉 Milestone: %s reaches a HALF-CENTURY!\n", striker->name);
                else if (striker->runs == 100) printf("🔥 CENTURY! %s brings up a magnificent hundred!\n", striker->name);

                ball++;
            }

            // Team milestones
            if (inns.totalRuns == 100) printf("🏏 Team milestone: 100 runs up for %s!\n", battingTeam->country);
            else if (inns.totalRuns == 200) printf("🔥 Double century of runs for %s!\n", battingTeam->country);
        }

        // End of over
        PlayerNode* tmp = striker; striker = nonStriker; nonStriker = tmp;
        inns.totalWickets = wicketsLost;
        inns.oversPlayed = over + 1;
        inns.perOverTotals[over] = ov->totalRuns;

        float crr = calcCRR(inns.totalRuns, inns.oversPlayed);
        printf("End of Over %d — Runs: %d | Total: %d/%d | CRR: %.2f\n",
               ov->overNumber, ov->totalRuns, inns.totalRuns, inns.totalWickets, crr);
    }

    // Save batting stats
    inns.battingCount = 0;
    for (PlayerNode* cur = battingList; cur && inns.battingCount < MAX_TEAM_PLAYERS; cur = cur->next) {
        BattingStat* bs = &inns.battingStats[inns.battingCount++];
        strncpy(bs->name, cur->name, NAME_LEN - 1);
        bs->name[NAME_LEN - 1] = '\0';
        bs->runs = cur->runs;
        bs->balls = cur->balls;
        bs->out = cur->out;
    }

    freeBattingList(battingList);
    return inns;
}
// Scorecard
void printScorecard(Team* battingTeam, Innings* inns, const char* title) {
    printf("\n============================================\n");
    printf("           %s SCORECARD (%s)\n", title, battingTeam->country);
    printf("============================================\n");

    // Batting summary
    printf("\nBatting:\n");
    printf("%-15s %-6s %-6s %-10s\n", "Player", "Runs", "Balls", "Status");
    for (int i = 0; i < inns->battingCount; i++) {
        BattingStat* bs = &inns->battingStats[i];
        printf("%-15s %-6d %-6d %-10s\n",
               bs->name, bs->runs, bs->balls, bs->out ? "OUT" : "NOT OUT");
    }

    // Bowling summary
    printf("\nBowling:\n");
    printf("%-15s %-6s %-6s %-6s\n", "Bowler", "Overs", "Runs", "Wkts");
    for (int i = 0; i < inns->bowlerCount; i++) {
        BowlerStat* bw = &inns->bowlers[i];
        printf("%-15s %-6d %-6d %-6d\n",
               bw->name, bw->oversBowled, bw->runsConceded, bw->wickets);
    }

    // Totals
    printf("\nTOTAL: %d/%d in %d overs\n",
           inns->totalRuns, inns->totalWickets, inns->oversPlayed);
    float crr = calcCRR(inns->totalRuns, inns->oversPlayed);
    printf("CRR: %.2f\n", crr);
    printf("============================================\n");
}

void saveScorecard(Team* battingTeam, Innings* inns, const char* filename, const char* title) {
    FILE* f = fopen(filename, "w");
    if (!f) {
        printf("Error saving %s\n", filename);
        return;
    }

    fprintf(f, "================ %s: %s ================\n", title, battingTeam->country);
    fprintf(f, "Total: %d/%d in %d overs | Wides: %d, No-balls: %d\n",
            inns->totalRuns, inns->totalWickets, inns->oversPlayed,
            inns->totalWides, inns->totalNoBalls);
    fprintf(f, "-------------------------------------------\n");

    // Batting summary
    for (int i = 0; i < inns->battingCount; i++) {
        BattingStat* bs = &inns->battingStats[i];
        float sr = (bs->balls > 0) ? ((float)bs->runs / bs->balls) * 100.0f : 0.0f;
        fprintf(f, "%-12s  Runs: %3d  Balls: %3d  SR: %6.2f  %s\n",
                bs->name, bs->runs, bs->balls, sr, bs->out ? "out" : "not out");
    }

    // Bowling summary
    fprintf(f, "\nBowling summary:\n");
    for (int i = 0; i < inns->bowlerCount; i++) {
        BowlerStat* b = &inns->bowlers[i];
        float econ = (b->oversBowled > 0) ? ((float)b->runsConceded / b->oversBowled) : 0.0f;
        fprintf(f, "%-12s  Overs: %2d  Runs: %3d  Wkts: %2d  Econ: %.2f\n",
                b->name, b->oversBowled, b->runsConceded, b->wickets, econ);
    }

    fclose(f);
}

// Result
MatchResult decideResult(Innings* first, Innings* second,
                         const char* firstBatTeam, const char* secondBatTeam) {
    MatchResult res;
    res.isDraw = 0;
    res.winner[0] = '\0';

    if (first->totalRuns > second->totalRuns) {
        strcpy(res.winner, firstBatTeam);
        res.winByRuns = first->totalRuns - second->totalRuns;
        res.winByWickets = 0;
    } else if (second->totalRuns > first->totalRuns) {
        strcpy(res.winner, secondBatTeam);
        res.winByRuns = 0;
        res.winByWickets = 10 - second->totalWickets;
    } else {
        res.isDraw = 1;
    }
    return res;
}
void printResultBanner(MatchResult result) {
    printf("\n============================================\n");
    if (result.isDraw) {
        printf("              MATCH DRAWN\n");
    } else if (result.winByRuns > 0) {
        printf("        %s WON BY %d RUNS\n", result.winner, result.winByRuns);
    } else {
        printf("        %s WON BY %d WICKETS\n", result.winner, result.winByWickets);
    }
    printf("============================================\n");
}
void congratulateWinner(MatchResult result) {
    if (!result.isDraw) {
        printf("\nCongratulations to %s for the victory!\n", result.winner);
    } else {
        printf("\nWell played both teams — it’s a draw!\n");
    }
}

// Player of the Match
void decidePlayerOfMatch(Innings* first, Innings* second, const char* teamA, const char* teamB) {
    char bestPlayer[NAME_LEN] = "";
    int bestRuns = 0, bestWickets = 0;

    // Check batting performances
    for (int i = 0; i < first->battingCount; i++) {
        if (first->battingStats[i].runs > bestRuns) {
            bestRuns = first->battingStats[i].runs;
            strcpy(bestPlayer, first->battingStats[i].name);
        }
    }
    for (int i = 0; i < second->battingCount; i++) {
        if (second->battingStats[i].runs > bestRuns) {
            bestRuns = second->battingStats[i].runs;
            strcpy(bestPlayer, second->battingStats[i].name);
        }
    }

    // Check bowling performances
    for (int i = 0; i < first->bowlerCount; i++) {
        if (first->bowlers[i].wickets > bestWickets) {
            bestWickets = first->bowlers[i].wickets;
            strcpy(bestPlayer, first->bowlers[i].name);
        }
    }
    for (int i = 0; i < second->bowlerCount; i++) {
        if (second->bowlers[i].wickets > bestWickets) {
            bestWickets = second->bowlers[i].wickets;
            strcpy(bestPlayer, second->bowlers[i].name);
        }
    }

    printf("\n*** Player of the Match: %s ***\n", bestPlayer);
}

// Super Over
Innings playSuperOver(Team* battingTeam, Team* bowlingTeam) {
    printf("\n========== SUPER OVER: %s vs %s ==========\n", battingTeam->country, bowlingTeam->country);
    return simulateInnings(battingTeam, bowlingTeam,1);
}