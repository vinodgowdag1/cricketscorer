#include <string.h>
#include "bowling.h"

void initQueue(BowlerQueue* q) {
    q->front = q->rear = -1;
    q->count = 0;
}

int isQueueEmpty(BowlerQueue* q) {
    return q->count == 0;
}

int isQueueFull(BowlerQueue* q) {
    return q->count == MAX_TEAM_PLAYERS;
}

void enqueueBowler(BowlerQueue* q, const char* name) {
    if (isQueueFull(q)) return;
    if (isQueueEmpty(q)) {
        q->front = 0;
        q->rear = 0;
    } else {
        q->rear = (q->rear + 1) % MAX_TEAM_PLAYERS;
    }
    strncpy(q->names[q->rear], name, NAME_LEN - 1);
    q->names[q->rear][NAME_LEN - 1] = '\0';
    q->count++;
}

int dequeueBowler(BowlerQueue* q, char* outName) {
    if (isQueueEmpty(q)) return 0;
    strncpy(outName, q->names[q->front], NAME_LEN);
    if (q->count == 1) {
        q->front = q->rear = -1;
        q->count = 0;
    } else {
        q->front = (q->front + 1) % MAX_TEAM_PLAYERS;
        q->count--;
    }
    return 1;
}

void rotateBowler(BowlerQueue* q) {
    char name[NAME_LEN];
    if (dequeueBowler(q, name)) enqueueBowler(q, name);
}

void initQueueFromTeam(BowlerQueue* q, Team* team) {
    initQueue(q);
    for (int i = 0; i < team->playerCount; i++) {
        enqueueBowler(q, team->players[i]);
    }
}