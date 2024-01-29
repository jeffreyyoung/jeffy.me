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

export type AddRoom<T> = {
  [K in keyof T]: T[K] & { room: RoomState };
};

export type Action<
  ActionMap,
  Key extends keyof ActionMap,
> = import("./State.js").ActionObject<ActionMap, Key>;
// export type Action<ActionMap, Key extends keyof ActionMap> = {
//   type: Key;
//   payload: ActionMap[Key];
//   actorUserId: string;
// };

export type IFrameMessageIn<ActionMap, State> = {
  room: RoomState;
  viewerUserId: string;
  viewerIsHost: boolean;
} & IFrameMessageBase<ActionMap, State>;

export type IFrameMessageBase<ActionMap, State> = {
  kind: "iframe-message";
  gameName: string;
  action: Action<ActionMap, keyof ActionMap>;
} & (
  | {
      type: "action";
    }
  | {
      type: "action-result";
      resultState: State;
    }
);

export type PeerMessage<ActionMap, State> =
  | {
      kind: "peer-message";
      type: "state";
      resultState?: State;
      action?: Action<ActionMap, keyof ActionMap>;
    }
  | {
      kind: "peer-message";
      type: "iframe-relay";
      gameName: string;
      data: IFrameMessageBase<any, any>;
    };
