#ifndef UTILS_H
#define UTILS_H

#define NAME_LEN 50

int randomHeadsTails(); // 0 tails, 1 heads
int random0or1();
int equalsIgnoreCase(const char* a, const char* b);

void printWelcome();

// Basic commentary helpers
void generateCommentaryRuns(const char* batsman, const char* bowler, int runs, char* out, int outSize);
void generateCommentaryWicket(const char* batsman, const char* bowler, char* out, int outSize);
void generateCommentaryWide(const char* bowler, char* out, int outSize);
void generateCommentaryNoBall(const char* batsman, const char* bowler, int runs, char* out, int outSize);

// Situational commentary
void commentaryChasePressure(int runsNeeded, int ballsLeft, char* out, int outSize);
void commentaryMilestoneBat(const char* batsman, int runs, char* out, int outSize);
void commentaryMilestoneBowl(const char* bowler, int wickets, char* out, int outSize);
void commentaryHatTrick(const char* bowler, char* out, int outSize);

// Rate calculations
float calcCRR(int totalRuns, int oversCompleted);
float calcRRR(int target, int currentRuns, int ballsLeft);

// ASCII graph
void printRunProgressGraph(const int* overTotals, int oversCount);

#endif