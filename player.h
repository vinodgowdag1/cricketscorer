#ifndef PLAYER_H
#define PLAYER_H

#include "utils.h"

#define MAX_TEAM_PLAYERS 11

typedef struct {
    char country[NAME_LEN];
    char players[MAX_TEAM_PLAYERS][NAME_LEN];
    int playerCount;
} Team;

Team createTeam(const char* country);
void inputTeamPlayers(Team* team);

#endif