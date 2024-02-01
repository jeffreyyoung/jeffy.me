export type RoomState = {
  version: string;
  users: (User & { isConnected: boolean; isHost: boolean })[];
  game: string;
};

export type RoomActionMap = {
  setGame: { game: string };
  userJoin: { user: RoomState["users"][number] };
  updateUser: { user: RoomState["users"][number] };
  userLeave: { user: RoomState["users"][number] };
  kickUser: { userId: string };
};

export type GameCommonActionMap = {
  syncUsers: { isFirstSync: boolean };
};

export type User = {
  id: string;
  name: string;
  emoji: string;
  color: string;
};

export type Action<
  ActionMap,
  Key extends keyof ActionMap,
  Meta
> = import("./State.js").ActionObject<ActionMap, Key, Meta>;
// export type Action<ActionMap, Key extends keyof ActionMap> = {
//   type: Key;
//   payload: ActionMap[Key];
//   actorUserId: string;
// };

export type IFrameMessageIn<ActionMap, State> = {
  kind: "iframe-message";
  gameName: string;
  action: Action<ActionMap, keyof ActionMap, GameMeta>;
} & (
  | {
      type: "action";
    }
  | {
      type: "action-result";
      resultState: State;
    }
);

export type IFrameMessageOut<ActionMap, State> = {
  kind: "iframe-message";
  gameName: string;
  action: Action<ActionMap, keyof ActionMap, null>;
} & (
  | {
      type: "action";
    }
  | {
      type: "action-result";
      resultState: State;
    }
);

type keys = keyof IFrameMessageOut<{}, { a: "a" }>;

export type GameMeta = {
  room: RoomState;
  viewerId: string;
};

export type PeerMessage<ActionMap, State, Meta> =
  | {
      kind: "peer-message";
      type: "state";
      resultState?: State;
      action?: Action<ActionMap, keyof ActionMap, Meta>;
    }
  | {
      kind: "peer-message";
      type: "iframe-relay";
      gameName: string;
      data: IFrameMessageOut<any, any>;
    };
