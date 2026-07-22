#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "utils.h"

int randomHeadsTails() {
    static int seeded = 0;
    if (!seeded) { srand((unsigned)time(NULL)); seeded = 1; }
    return rand() % 2;
}

int random0or1() {
    static int seeded = 0;
    if (!seeded) { srand((unsigned)time(NULL)); seeded = 1; }
    return rand() % 2;
}

int equalsIgnoreCase(const char* a, const char* b) {
    if (!a || !b) return 0;
    while (*a && *b) {
        char ca = (*a >= 'A' && *a <= 'Z') ? *a + 32 : *a;
        char cb = (*b >= 'A' && *b <= 'Z') ? *b + 32 : *b;
        if (ca != cb) return 0;
        a++; b++;
    }
    return *a == '\0' && *b == '\0';
}

void printWelcome() {
    printf("============================================\n");
    printf("         CRICKET DS SIMULATOR PRO           \n");
    printf("  Linked List (Batting) | Circular Queue (Bowling)\n");
    printf("           Stack (Ball History / Undo)      \n");
    printf("  Milestones | CRR/RRR | Super Over | Graph \n");
    printf("============================================\n");
}

// Basic commentary
void generateCommentaryRuns(const char* batsman, const char* bowler, int runs, char* out, int outSize) {
    const char* phrases6[] = {
        "Massive hit! That's out of the park!",
        "Straight down the ground for a towering six!",
        "Over long-on! Crowd goes wild!"
    };
    const char* phrases4[] = {
        "Cracked through covers for four!",
        "Timed to perfection to the boundary!",
        "Swept fine, races away!"
    };
    const char* phrases1[] = {
        "Quick single, good running!",
        "Nudged to mid-wicket, they take one.",
        "Soft hands to point, just a single."
    };
    const char* dot[] = { "Dot ball! Pressure building.", "Beaten! Great delivery.", "Defended solidly." };

    if (runs == 6) snprintf(out, outSize, "%s to %s — %s", bowler, batsman, phrases6[rand() % 3]);
    else if (runs == 4) snprintf(out, outSize, "%s to %s — %s", bowler, batsman, phrases4[rand() % 3]);
    else if (runs == 0) snprintf(out, outSize, "%s to %s — %s", bowler, batsman, dot[rand() % 3]);
    else snprintf(out, outSize, "%s to %s — %s", bowler, batsman, phrases1[rand() % 3]);
}

void generateCommentaryWicket(const char* batsman, const char* bowler, char* out, int outSize) {
    const char* lines[] = {
        "Edge and taken! Brilliant catch!",
        "Bowled him! Timber everywhere!",
        "LBW! Umpire raises the finger!"
    };
    snprintf(out, outSize, "%s gets %s — %s", bowler, batsman, lines[rand() % 3]);
}

void generateCommentaryWide(const char* bowler, char* out, int outSize) {
    const char* lines[] = {
        "That's drifting down leg — called wide.",
        "Too wide outside off — umpire stretches arms.",
        "Wayward delivery — wide signaled."
    };
    snprintf(out, outSize, "%s — %s", bowler, lines[rand() % 3]);
}

void generateCommentaryNoBall(const char* batsman, const char* bowler, int runs, char* out, int outSize) {
    const char* lines[] = {
        "Front foot no-ball! Free hit coming.",
        "Over the waist — that's a no-ball.",
        "High full toss — umpire signals no-ball."
    };
    char buf[64];
    snprintf(buf, sizeof(buf), "Runs off bat: %d", runs);
    snprintf(out, outSize, "%s to %s — %s | %s", bowler, batsman, lines[rand() % 3], buf);
}

// Situational commentary
void commentaryChasePressure(int runsNeeded, int ballsLeft, char* out, int outSize) {
    snprintf(out, outSize, "Chase update: Need %d off %d balls.", runsNeeded, ballsLeft);
}

void commentaryMilestoneBat(const char* batsman, int runs, char* out, int outSize) {
    if (runs == 50) snprintf(out, outSize, "Milestone: %s reaches 50!", batsman);
    else if (runs == 100) snprintf(out, outSize, "Milestone: %s scores a century!", batsman);
    else snprintf(out, outSize, "%s crosses %d!", batsman, runs);
}

void commentaryMilestoneBowl(const char* bowler, int wickets, char* out, int outSize) {
    if (wickets == 3) snprintf(out, outSize, "Milestone: %s takes 3 wickets!", bowler);
    else if (wickets == 5) snprintf(out, outSize, "Milestone: %s has a 5-for!", bowler);
    else snprintf(out, outSize, "%s now has %d wickets!", bowler, wickets);
}

void commentaryHatTrick(const char* bowler, char* out, int outSize) {
    snprintf(out, outSize, "Hat-trick alert: %s is on a hat-trick!", bowler);
}

// Rate calculations
float calcCRR(int totalRuns, int oversCompleted) {
    if (oversCompleted <= 0) return 0.0f;
    return (float)totalRuns / (float)oversCompleted;
}

float calcRRR(int target, int currentRuns, int ballsLeft) {
    int runsNeeded = target - currentRuns;
    if (runsNeeded <= 0) return 0.0f;
    if (ballsLeft <= 0) return 999.9f;
    return ((float)runsNeeded * 6.0f) / (float)ballsLeft;
}

// ASCII graph (simple over-by-over bar)
void printRunProgressGraph(const int* overTotals, int oversCount) {
    printf("\nRun Progress Graph (runs per over):\n");
    for (int i = 0; i < oversCount; i++) {
        printf("Over %2d: ", i + 1);
        int bars = overTotals[i];
        if (bars > 20) bars = 20;
        for (int j = 0; j < bars; j++) printf("|");
        printf(" (%d)\n", overTotals[i]);
    }
}