#ifndef STACK_H
#define STACK_H

#include "utils.h"

#define MAX_BALLS 600

typedef struct {
    int over;
    int ball;
    int runs;
    int isWicket;
    int isWide;
    int isNoBall;
    char striker[NAME_LEN];
    char bowler[NAME_LEN];
    char commentary[128];
} BallAction;

typedef struct {
    BallAction stack[MAX_BALLS];
    int top;
} BallStack;

void initStack(BallStack* s);
int isStackEmpty(BallStack* s);
int isStackFull(BallStack* s);
void pushAction(BallStack* s, BallAction action);
int popAction(BallStack* s, BallAction* out); // returns 1 if ok
void printRecentActions(BallStack* s, int n);

#endif