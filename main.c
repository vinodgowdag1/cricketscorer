#include <stdio.h>
#include <string.h>
#include "player.h"
#include "match.h"
#include "utils.h"

int main() {
    printWelcome();

    char countryA[NAME_LEN], countryB[NAME_LEN];
    int maxOvers;

    printf("Enter Team A country name: ");
    scanf(" %[^\n]", countryA);
    printf("Enter Team B country name: ");
    scanf(" %[^\n]", countryB);

    printf("Enter maximum overs (e.g., 2): ");
    scanf("%d", &maxOvers);
    if (maxOvers <= 0) { 
        printf("Invalid overs. Setting to 1.\n"); 
        maxOvers = 1; 
    }
    if (maxOvers > MAX_OVERS) { 
        printf("Capping overs to %d for safety.\n", MAX_OVERS); 
        maxOvers = MAX_OVERS; 
    }

    Team teamA = createTeam(countryA);
    Team teamB = createTeam(countryB);

    printf("\nEnter 11 players for %s:\n", teamA.country);
    inputTeamPlayers(&teamA);

    printf("\nEnter 11 players for %s:\n", teamB.country);
    inputTeamPlayers(&teamB);

    // Toss
    TossResult toss = conductToss(teamA.country, teamB.country);
    int userWonToss = verifyToss(toss);
    InningsOrder order = chooseInningsOrder(userWonToss, &teamA, &teamB);

    // First innings
    printf("\n--- First Innings: %s batting ---\n", order.battingFirst->country);
    Innings firstInnings = simulateInnings(order.battingFirst, order.bowlingFirst, maxOvers);

    // Second innings
    printf("\n--- Second Innings: %s batting (Target: %d) ---\n",
           order.battingSecond->country, firstInnings.totalRuns + 1);
    Innings secondInnings = simulateInnings(order.battingSecond, order.bowlingSecond, maxOvers);

    // Result
    MatchResult result = decideResult(&firstInnings, &secondInnings,
                                      order.battingFirst->country, order.battingSecond->country);
    printResultBanner(result);

    // ✅ Super Over if tied
    if (result.isDraw == 1) {
        printf("\nMatch is tied — initiating Super Over!\n");

        Innings superA = playSuperOver(order.battingFirst, order.bowlingFirst);
        Innings superB = playSuperOver(order.battingSecond, order.bowlingSecond);

        MatchResult superRes = decideResult(&superA, &superB,
                                            order.battingFirst->country,
                                            order.battingSecond->country);

        printf("\n===== SUPER OVER RESULT =====\n");
        printResultBanner(superRes);
        congratulateWinner(superRes);
        decidePlayerOfMatch(&superA, &superB,
                            order.battingFirst->country,
                            order.battingSecond->country);

        saveScorecard(order.battingFirst, &superA, "scorecard_super_first.txt", "SUPER OVER - FIRST");
        saveScorecard(order.battingSecond, &superB, "scorecard_super_second.txt", "SUPER OVER - SECOND");
        printf("Super Over scorecards saved: scorecard_super_first.txt, scorecard_super_second.txt\n");

        // ✅ Golden Over if Super Over also tied
        if (superRes.isDraw == 1) {
            printf("\nSuper Over is also tied — initiating GOLDEN OVER!\n");

            Innings goldenA = playSuperOver(order.battingFirst, order.bowlingFirst);
            Innings goldenB = playSuperOver(order.battingSecond, order.bowlingSecond);

            MatchResult goldenRes = decideResult(&goldenA, &goldenB,
                                                 order.battingFirst->country,
                                                 order.battingSecond->country);

            printf("\n===== GOLDEN OVER RESULT =====\n");
            printResultBanner(goldenRes);
            congratulateWinner(goldenRes);
            decidePlayerOfMatch(&goldenA, &goldenB,
                                order.battingFirst->country,
                                order.battingSecond->country);

            saveScorecard(order.battingFirst, &goldenA, "scorecard_golden_first.txt", "GOLDEN OVER - FIRST");
            saveScorecard(order.battingSecond, &goldenB, "scorecard_golden_second.txt", "GOLDEN OVER - SECOND");
            printf("Golden Over scorecards saved: scorecard_golden_first.txt, scorecard_golden_second.txt\n");
        }
    } else {
        congratulateWinner(result);
        decidePlayerOfMatch(&firstInnings, &secondInnings,
                            order.battingFirst->country,
                            order.battingSecond->country);
    }

    // Save normal scorecards
    saveScorecard(order.battingFirst, &firstInnings, "scorecard_first.txt", "FIRST INNINGS");
    saveScorecard(order.battingSecond, &secondInnings, "scorecard_second.txt", "SECOND INNINGS");
    printf("\nScorecards saved: scorecard_first.txt, scorecard_second.txt\n");

    // ✅ Scorecard viewing loop
    int choices;
    do {
        printf("\nWhich scorecard do you want to see?\n");
        printf("1. First Innings (%s batting)\n", order.battingFirst->country);
        printf("2. Second Innings (%s batting)\n", order.battingSecond->country);
        printf("3. Exit\n");
        printf("Enter choice: ");
        scanf("%d", &choices);

        if (choices == 1) {
            printScorecard(order.battingFirst, &firstInnings, "First Innings");
        } else if (choices == 2) {
            printScorecard(order.battingSecond, &secondInnings, "Second Innings");
        } else if (choices == 3) {
            printf("Exiting scorecard viewer...\n");
        } else {
            printf("Invalid choice, try again!\n");
        }
    } while (choices != 3);

    return 0;
}
