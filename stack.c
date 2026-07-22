#include <stdio.h>
#include "stack.h"

void initStack(BallStack* s) { s->top = -1; }
int isStackEmpty(BallStack* s) { return s->top == -1; }
int isStackFull(BallStack* s) { return s->top >= MAX_BALLS - 1; }

void pushAction(BallStack* s, BallAction action) {
    if (!isStackFull(s)) s->stack[++s->top] = action;
}

int popAction(BallStack* s, BallAction* out) {
    if (isStackEmpty(s)) return 0;
    *out = s->stack[s->top--];
    return 1;
}

void printRecentActions(BallStack* s, int n) {
    if (isStackEmpty(s)) {
        printf("No actions recorded yet.\n");
        return;
    }
    int start = (s->top - n + 1 >= 0) ? s->top - n + 1 : 0;
    for (int i = start; i <= s->top; i++) {
        BallAction* a = &s->stack[i];
        printf("Over %d, Ball %d | %s vs %s | ",
               a->over, a->ball, a->striker, a->bowler);
        if (a->isWicket) printf("WICKET! ");
        else if (a->isWide) printf("Wide +1 ");
        else if (a->isNoBall) printf("No-ball +1, runs off bat: %d ", a->runs);
        else printf("Runs: %d ", a->runs);
        if (a->commentary[0]) printf("| %s", a->commentary);
        printf("\n");
    }
}