import type { NumPlayers, PlayerIndex } from "@hanabi/data";
import type { Options } from "@hanabi/game";
import type { Tuple } from "@hanabi/utils";

/** This is for data that does not change. */
export interface GameMetadata {
  readonly ourUsername: string;
  readonly options: Options;
  readonly playerNames: Readonly<Tuple<string, NumPlayers>>;

  /**
   * If in a game, equal to the player index that we correspond to. If spectating an ongoing game or
   * a replay, equal to the player index that we are observing from.
   */
  readonly ourPlayerIndex: PlayerIndex;

  readonly characterAssignments: Readonly<Tuple<number | null, NumPlayers>>;
  readonly characterMetadata: Readonly<Tuple<number, NumPlayers>>;

  readonly minEfficiency: number;
  readonly hardVariant: boolean;

  readonly hasCustomSeed: boolean;
  readonly seed: string;
}

export function getPlayerName(
  playerIndex: PlayerIndex,
  metadata: GameMetadata,
): string {
  return metadata.playerNames[playerIndex] ?? "[unknown]";
}

export function getPlayerNames(
  playerIndices: readonly PlayerIndex[] | null,
  metadata: GameMetadata,
): string {
  if (playerIndices === null) {
    return "The players";
  }

  const playerNames = playerIndices.map((i) => getPlayerName(i, metadata));
  playerNames.sort();

  if (playerNames.length === 2) {
    return `${playerNames[0]} and ${playerNames[1]}`;
  }

  const playerNamesExceptLast = playerNames.slice(0, -1);
  return `${playerNamesExceptLast.join(", ")}, and ${playerNames.at(-1)}`;
}
