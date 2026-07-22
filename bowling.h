#ifndef BOWLING_H
#define BOWLING_H

#include "player.h"

typedef struct {
    char names[MAX_TEAM_PLAYERS][NAME_LEN];
    int front;
    int rear;
    int count;
} BowlerQueue;

void initQueue(BowlerQueue* q);
int isQueueEmpty(BowlerQueue* q);
int isQueueFull(BowlerQueue* q);
void enqueueBowler(BowlerQueue* q, const char* name);
int dequeueBowler(BowlerQueue* q, char* outName); // returns 1 if ok, 0 if empty
void rotateBowler(BowlerQueue* q); // dequeue then enqueue same
void initQueueFromTeam(BowlerQueue* q, Team* team);

#endif