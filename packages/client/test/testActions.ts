/* eslint-disable @typescript-eslint/no-restricted-imports */

// Helper functions to build actions with a compact syntax. For use in tests.

import type {
  CardOrder,
  ColorIndex,
  PlayerIndex,
  Rank,
  RankClueNumber,
  SuitIndex,
} from "@hanabi/data";
import { ClueType } from "../../game/src/enums/ClueType";
import type {
  ActionCardIdentity,
  ActionClue,
  ActionDiscard,
  ActionDraw,
  ActionHypotheticalAction,
  ActionHypotheticalBack,
  ActionHypotheticalEnd,
  ActionHypotheticalStart,
  ActionIncludingHypothetical,
  ActionInit,
  ActionPlay,
  ActionReplayEnter,
  ActionStrike,
} from "../src/game/types/actions";

export function colorClue(
  value: ColorIndex,
  giver: PlayerIndex,
  list: readonly number[],
  target: PlayerIndex,
  turn: number,
): ActionClue {
  return {
    type: "clue",
    clue: {
      type: ClueType.Color,
      value,
    },
    giver,
    list: list as CardOrder[],
    target,
    turn,
    ignoreNegative: false,
  };
}

export function rankClue(
  value: RankClueNumber,
  giver: PlayerIndex,
  list: readonly number[],
  target: PlayerIndex,
  turn: number,
): ActionClue {
  return {
    type: "clue",
    clue: {
      type: ClueType.Rank,
      value,
    },
    giver,
    list: list as CardOrder[],
    target,
    turn,
    ignoreNegative: false,
  };
}

export function draw(
  playerIndex: PlayerIndex,
  order: number,
  suitIndex: SuitIndex | -1 = -1,
  rank: Rank | -1 = -1,
): ActionDraw {
  return {
    type: "draw",
    playerIndex,
    order: order as CardOrder,
    suitIndex,
    rank,
  };
}

export function discard(
  playerIndex: PlayerIndex,
  order: number,
  suitIndex: SuitIndex | -1,
  rank: Rank | -1,
  failed: boolean,
): ActionDiscard {
  return {
    type: "discard",
    playerIndex,
    order: order as CardOrder,
    suitIndex,
    rank,
    failed,
  };
}

export function play(
  playerIndex: PlayerIndex,
  order: number,
  suitIndex: SuitIndex,
  rank: Rank,
): ActionPlay {
  return {
    type: "play",
    playerIndex,
    order: order as CardOrder,
    suitIndex,
    rank,
  };
}

export function cardIdentity(
  playerIndex: PlayerIndex,
  order: number,
  suitIndex: SuitIndex,
  rank: Rank,
): ActionCardIdentity {
  return {
    type: "cardIdentity",
    playerIndex,
    order: order as CardOrder,
    suitIndex,
    rank,
  };
}

export function strike(
  num: 1 | 2 | 3,
  order: number,
  turn: number,
): ActionStrike {
  return {
    type: "strike",
    num,
    order: order as CardOrder,
    turn,
  };
}

export function replayEnter(): ActionReplayEnter {
  return {
    type: "replayEnter",
    segment: 0,
  };
}

export function init(): ActionInit {
  return {
    type: "init",
    datetimeStarted: new Date(0).toString(),
    datetimeFinished: new Date(0).toString(),
    spectating: false,
    shadowing: false,
    replay: true,
    sharedReplay: true,
    databaseID: 1,
    sharedReplaySegment: 0,
    sharedReplayLeader: "",
    paused: false,
    pausePlayerIndex: 0,
  };
}

export function hypoStart(): ActionHypotheticalStart {
  return {
    type: "hypoStart",
    showDrawnCards: false,
    actions: [],
  };
}

export function hypoEnd(): ActionHypotheticalEnd {
  return {
    type: "hypoEnd",
  };
}

export function hypoAction(
  action: ActionIncludingHypothetical,
): ActionHypotheticalAction {
  return {
    type: "hypoAction",
    action,
  };
}

export function hypoBack(): ActionHypotheticalBack {
  return {
    type: "hypoBack",
  };
}
