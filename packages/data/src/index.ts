import emojisJSON from "./json/emojis.json";
import emotesJSON from "./json/emotes.json";

const emojis = emojisJSON;
const emotes = emotesJSON;
export { emojis, emotes };

export * from "./abbreviations";
export * from "./constants";
export * from "./gameData";
export * from "./interfaces/Character";
export * from "./interfaces/Color";
export * from "./interfaces/HTTPLoginData";
export * from "./interfaces/Suit";
export * from "./interfaces/Variant";
export * from "./types/NumPlayers";
export * from "./types/NumSuits";
export * from "./types/PlayerIndex";
export * from "./types/Rank";
export * from "./types/RankClueNumber";
export * from "./types/SuitIndex";
export * from "./types/SuitRankMap";
export * from "./types/SuitRankTuple";
export * from "./version";
