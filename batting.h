#ifndef BATTING_H
#define BATTING_H

#include "player.h"

typedef struct PlayerNode {
    char name[NAME_LEN];
    int runs;
    int balls;
    int out; // 1 if out, 0 otherwise
    struct PlayerNode* next;
} PlayerNode;

PlayerNode* buildBattingListFromTeam(Team* team);
PlayerNode* findPlayerNode(PlayerNode* head, const char* name);
void markOut(PlayerNode* node);
void printBattingList(PlayerNode* head);
void freeBattingList(PlayerNode* head);

#endif