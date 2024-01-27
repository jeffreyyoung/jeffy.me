type User = {
  id: string;
  name: string;
  color: string;
  emoji: string;
};

type ClientToHostMessageMap = {
  "game-over": {
    usersByRank: { userId: string; primaryText: string }[];
  };
  "game-update": {
    gameState: object & { version: string };
    gameAction?: {
      type: string;
      data: string;
      gameVersionBeforeAction: string;
      gameVersionAfterAction: string;
    };
  };
  acknowledge: { messageId: string };
};

type HostToClientMessageMap = {
  "user-joined": { user: User; curUsers: User[] };
  "user-left": { userId: string; curUsers: User[] };
  "user-update": { user: User; curUsers: User[] };
  acknowledge: { messageId: string; curUsers: User[] };
  "game-update": ClientToHostMessageMap["game-update"];
};

type Message<Map extends Record<string, any>, Key extends keyof Map> = {
    type: Key,
    data: Map[Key],
    messageId: string,
    actorId: string,
}


type P2PClientArgs<GameState extends { version: string }, Actions extends { [key: string]: object } & Pick<HostToClientMessageMap, 'user-joined' | 'user-left' | 'user-update'>> = {
    initialState: GameState,
    actions: {
        [key in keyof Actions]: (state: GameState, data: Actions[key], actorUserId: string, users: User[]) => void;
    },
    onChange: (state: GameState, users: User[], yourUserId: string) => void,
    onConnectionChange: (connected: 'connected' | 'connecting') => void;
}


type P2PHostArgs = {
    handlers: {
        [key in keyof HostToClientMessageMap]: () => void;
    },
}


