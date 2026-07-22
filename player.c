#include <stdio.h>
#include <string.h>
#include "player.h"

Team createTeam(const char* country) {
    Team t;
    memset(&t, 0, sizeof(t));
    strncpy(t.country, country, NAME_LEN - 1);
    t.country[NAME_LEN - 1] = '\0';
    t.playerCount = 0;
    return t;
}

void inputTeamPlayers(Team* team) {
    team->playerCount = 0;
    for (int i = 0; i < MAX_TEAM_PLAYERS; i++) {
        printf("Enter player %d name: ", i + 1);
        scanf(" %[^\n]", team->players[i]);
        team->playerCount++;
    }
}