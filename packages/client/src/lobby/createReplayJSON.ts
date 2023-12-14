import type { PlayerIndex } from "@hanabi/data";
import { DEFAULT_PLAYER_NAMES, SITE_URL } from "@hanabi/data";
import type { LogEntry } from "@hanabi/game";
import { ClueType } from "@hanabi/game";
import { assertDefined, parseIntSafe } from "@hanabi/utils";
import { SelfChatMessageType, sendSelfPMFromServer } from "../chat";
import { ActionType } from "../game/types/ActionType";
import type { ClientAction } from "../game/types/ClientAction";
import type { JSONGame } from "../game/types/JSONGame";
import type { ReplayState } from "../game/types/ReplayState";
import { globals } from "../game/ui/UIGlobals";
import { shrink } from "./hypoCompress";

const PLAY_REGEX =
  /^(?:\[Hypo] )?(.*)(?: plays | fails to play ).* from slot #(\d).*$/;
const DISCARD_REGEX = /^(?:\[Hypo] )?(.*) discards .* slot #(\d).*$/;
const CLUE_REGEX = /^(?:\[Hypo] )?.+ tells (.*) about \w+ ([A-Za-z]+|\d)s?$/;

export function createJSONFromReplay(room: string): void {
  if (globals.store === null || !globals.state.finished) {
    sendSelfPMFromServer(
      "You can only use the <code>/copy</code> command during the review of a game.",
      room,
      SelfChatMessageType.Error,
    );
    return;
  }

  // Anonymize the players
  const game: JSONGame = {
    players: DEFAULT_PLAYER_NAMES.slice(0, globals.metadata.playerNames.length),
    deck: [],
    actions: [],
    options: {
      variant: globals.options.variantName,
    },
    notes: [],
    characters: [],
    id: 0,
    seed: "",
  };

  // Copy the entire deck.
  for (const [i, cardIdentity] of globals.state.cardIdentities.entries()) {
    const morph = globals.state.replay.hypothetical?.morphedIdentities[i];
    if (
      morph !== undefined &&
      morph.suitIndex !== null &&
      morph.rank !== null
    ) {
      game.deck.push({
        suitIndex: morph.suitIndex,
        rank: morph.rank,
      });
    } else {
      game.deck.push({
        suitIndex: cardIdentity.suitIndex,
        rank: cardIdentity.rank,
      });
    }
  }

  // Copy actions up to current segment.
  const { replay } = globals.state;
  game.actions = getGameActionsFromState(replay);

  // Add the hypothesis from log, after current segment.
  if (replay.hypothetical !== null) {
    const { states } = replay.hypothetical;
    const { log } = states.at(-1)!;
    if (replay.segment < log.length) {
      const logLines = log.slice(replay.segment + 1);
      const actions = getGameActionsFromLog(logLines);
      const newActions = [...game.actions, ...actions];
      game.actions = newActions;
    }
  }

  // Enforce at least one action.
  if (game.actions.length === 0) {
    sendSelfPMFromServer(
      "There are no actions in your hypothetical.",
      room,
      SelfChatMessageType.Error,
    );
    return;
  }

  const json = JSON.stringify(game);
  const URLData = shrink(json);
  if (URLData === undefined || URLData === "") {
    sendSelfPMFromServer(
      "Failed to compress the JSON data.",
      room,
      SelfChatMessageType.Error,
    );
    return;
  }

  const URL = `${SITE_URL}/shared-replay-json/${URLData}`;
  navigator.clipboard
    .writeText(URL)
    .then(() => {
      sendSelfPMFromServer(
        "The URL for this hypothetical is copied to your clipboard.",
        room,
        SelfChatMessageType.Info,
      );
      const urlFix = json.replaceAll('"', "\\'");
      const here = `<button href="#" onclick="navigator.clipboard.writeText('${urlFix}'.replace(/\\'/g, String.fromCharCode(34)));return false;"><strong>here</strong></button>`;
      sendSelfPMFromServer(
        `Click ${here} to copy the raw JSON data to your clipboard.`,
        room,
        SelfChatMessageType.Info,
      );
    })
    .catch((error) => {
      sendSelfPMFromServer(
        `Failed to copy the URL to your clipboard: ${error}`,
        room,
        SelfChatMessageType.Error,
      );
      sendSelfPMFromServer(URL, room);
    });
}

function getGameActionsFromState(source: ReplayState): readonly ClientAction[] {
  let currentSegment = 0;
  const maxSegment = source.segment;
  const actions: ClientAction[] = [];
  for (
    let i = 0;
    i < source.actions.length && currentSegment < maxSegment;
    i++
  ) {
    const action = source.actions[i]!;
    switch (action.type) {
      case "play": {
        actions.push({
          type: ActionType.Play,
          target: action.order,
        });
        currentSegment++;
        continue;
      }

      case "discard": {
        actions.push({
          type: action.failed ? ActionType.Play : ActionType.Discard,
          target: action.order,
        });
        currentSegment++;
        continue;
      }

      case "clue": {
        switch (action.clue.type) {
          case ClueType.Color: {
            actions.push({
              type: ActionType.ColorClue,
              target: action.target,
              value: action.clue.value,
            });
            break;
          }

          case ClueType.Rank: {
            actions.push({
              type: ActionType.RankClue,
              target: action.target,
              value: action.clue.value,
            });
            break;
          }
        }

        currentSegment++;
        continue;
      }

      default: {
        continue;
      }
    }
  }

  return actions;
}

function getGameActionsFromLog(
  log: readonly LogEntry[],
): readonly ClientAction[] {
  const actions: ClientAction[] = [];

  for (const [i, logEntry] of log.entries()) {
    const action = getActionFromLogEntry(i, logEntry);

    if (action !== undefined) {
      actions.push(action);
    }
  }

  return actions;
}

function getActionFromLogEntry(
  i: number,
  logEntry: LogEntry,
): ClientAction | undefined {
  const foundPlay = logEntry.text.match(PLAY_REGEX);
  const foundDiscard = logEntry.text.match(DISCARD_REGEX);
  const foundClue = logEntry.text.match(CLUE_REGEX);

  if (foundPlay !== null && foundPlay.length > 2) {
    const target = parseIntSafe(foundPlay[2]!);
    assertDefined(target, `Failed to parse the play target: ${foundPlay[2]}`);

    return getActionFromHypoPlayOrDiscard(
      i,
      ActionType.Play,
      foundPlay[1]!,
      target,
    );
  }

  if (foundDiscard !== null && foundDiscard.length > 2) {
    const target = parseIntSafe(foundDiscard[2]!);
    assertDefined(
      target,
      `Failed to parse the discard target: ${foundDiscard[2]}`,
    );

    return getActionFromHypoPlayOrDiscard(
      i,
      ActionType.Discard,
      foundDiscard[1]!,
      target,
    );
  }

  if (foundClue !== null && foundClue.length > 2) {
    return getActionFromHypoClue(foundClue[1]!, foundClue[2]!);
  }

  return undefined;
}

function getActionFromHypoPlayOrDiscard(
  entryNumber: number,
  actionType: ActionType,
  playerName: string,
  slot: number,
): ClientAction {
  const playerIndex = getPlayerIndexFromName(playerName);
  assertDefined(
    playerIndex,
    `Failed to find the player index corresponding to: ${playerName}`,
  );

  // Go to previous hypo state to find the card. Cards are stored in reverse order than the one
  // perceived.
  const cardsPerPlayer = getCardsPerPlayer();
  const slotIndex = cardsPerPlayer - slot;
  const cardID = getCardFromHypoState(entryNumber - 1, playerIndex, slotIndex);
  return {
    type: actionType,
    target: cardID,
  };
}

function getActionFromHypoClue(playerName: string, clue: string): ClientAction {
  const playerIndex = getPlayerIndexFromName(playerName);
  assertDefined(
    playerIndex,
    `Failed to find the player index corresponding to: ${playerName}`,
  );

  let parsedClue = parseIntSafe(clue);

  // "Odds and Evens" give "Odd" or "Even" as rank clues.
  if (clue === "Odd") {
    parsedClue = 1;
  } else if (clue === "Even") {
    parsedClue = 2;
  }

  if (parsedClue === undefined) {
    // It is a color clue.
    return {
      type: ActionType.ColorClue,
      target: playerIndex,
      value: getColorIdFromString(clue),
    };
  }

  // It is a rank clue.
  return {
    type: ActionType.RankClue,
    target: playerIndex,
    value: parsedClue,
  };
}

function getPlayerIndexFromName(name: string): PlayerIndex | undefined {
  const playerIndex = globals.metadata.playerNames.indexOf(name);
  return playerIndex === -1 ? undefined : (playerIndex as PlayerIndex);
}

function getCardFromHypoState(
  previousStateIndex: number,
  playerIndex: PlayerIndex,
  slotIndex: number,
): number {
  if (globals.state.replay.hypothetical === null) {
    return 0;
  }

  const stateIndex = Math.max(previousStateIndex, 0);
  const stateOnHypoTurn = globals.state.replay.hypothetical.states[stateIndex]!;
  const playerHand = stateOnHypoTurn.hands[playerIndex]!;
  return playerHand[slotIndex]!;
}

function getColorIdFromString(clue: string): number {
  let suitIndex = 0;
  for (const [index, color] of globals.variant.clueColors.entries()) {
    if (clue.startsWith(color.name)) {
      suitIndex = index;
    }
  }
  return suitIndex;
}

function getCardsPerPlayer(): number {
  return globals.state.replay.states[0]!.hands[0]!.length;
}
