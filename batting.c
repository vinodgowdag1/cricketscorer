#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "batting.h"
#include "utils.h"

static PlayerNode* createPlayerNode(const char* name) {
    PlayerNode* node = (PlayerNode*)malloc(sizeof(PlayerNode));
    if (!node) return NULL;
    strncpy(node->name, name, sizeof(node->name) - 1);
    node->name[sizeof(node->name) - 1] = '\0';
    node->runs = 0;
    node->balls = 0;
    node->out = 0;
    node->next = NULL;
    return node;
}

PlayerNode* buildBattingListFromTeam(Team* team) {
    PlayerNode* head = NULL, *tail = NULL;
    for (int i = 0; i < team->playerCount; i++) {
        PlayerNode* n = createPlayerNode(team->players[i]);
        if (!n) continue;
        if (!head) { head = tail = n; }
        else { tail->next = n; tail = n; }
    }
    return head;
}

PlayerNode* findPlayerNode(PlayerNode* head, const char* name) {
    for (PlayerNode* cur = head; cur; cur = cur->next) {
        if (equalsIgnoreCase(cur->name, name)) return cur;
    }
    return NULL;
}

void markOut(PlayerNode* node) {
    if (node) node->out = 1;
}

void printBattingList(PlayerNode* head) {
    for (PlayerNode* cur = head; cur; cur = cur->next) {
        float sr = (cur->balls > 0) ? ((float)cur->runs / cur->balls) * 100.0f : 0.0f;
        printf("%-20s Runs: %3d Balls: %3d SR: %6.2f  %s\n",
               cur->name, cur->runs, cur->balls, sr, cur->out ? "OUT" : "NOT OUT");
    }
}

void freeBattingList(PlayerNode* head) {
    while (head) {
        PlayerNode* tmp = head->next;
        free(head);
        head = tmp;
    }
}