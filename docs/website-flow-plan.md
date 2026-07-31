The home page would have the game name, a short explanation and two main options: Create Room or Join Room. Players would not need to create an account. To create a room, the host would enter a temporary nickname, create the room and then receive a room code and shareable link before being taken to the lobby. Other players could join by opening the link or entering the room code, then choosing a temporary nickname. We should also include simple error messages for cases such as an invalid room code, a full room, a game that has already started, a duplicate nickname or a connection problem.

The lobby would display the room code, a button to copy the invite link, the player list, ready status and the selected game. It would also include a leave button, while only the host would see the start button. The game should support between three and eight players, so the host should not be able to start with fewer than three players.

The exact game screen will depend on the game idea we choose, but the general flow could be: instructions, player action, waiting screen, round results and then the next round. Players should only receive information that they are allowed to see. For example, secret roles, hidden answers and other players’ submissions should not be shown before the reveal, as this would help prevent basic cheating.

After each round, the results page could show everyone’s submissions or answers, the correct answer or final reveal, points earned and the current scoreboard. There would then be an option to continue to the next round. At the end of the game, the final results page would show the winner, rankings and total scores, with options to play again, choose another game or leave the lobby.

For disconnects, I think we could keep a player’s place for around 30 to 60 seconds so they have time to reconnect using the same browser session. If they return, they would go back into the same lobby or game. If they do not reconnect, they could either be removed or marked as inactive. If the host disconnects permanently, host control could automatically transfer to another player. The game should continue if enough players are still connected, and anyone who misses a timed round because they disconnected would receive no points for that round.  

                         OPEN WEBSITE
                               |
                      HOME / LANDING PAGE
                     /                   \
             CREATE A ROOM             JOIN A ROOM
                    |                        |
       Enter temporary nickname      Open shared link or
                    |                 enter room code
          Create private lobby               |
                    |              Enter temporary nickname
                    |                        |
                    -------> GAME LOBBY <-----
                               |
                 Display room code/shareable link
                 Display connected player list
                 Show ready/not-ready status
                 Host selects available game
                               |
                    Are there 3–8 players?
                       /               \
                     No                 Yes
                     |                   |
             Wait for players      Host starts game
                                          |
                                 GAME INSTRUCTIONS
                                          |
                                   GAME ROUND STARTS
                                          |
                          Players complete their actions
                                          |
                                    ROUND RESULTS
                                          |
                               More rounds required?
                              /                    \
                            Yes                    No
                             |                      |
                       Next round             FINAL RESULTS
                                                   |
                                Play Again / Change Game / Leave
                                   /              |             \
                             Same lobby      Game selection    Home page
