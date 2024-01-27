type AppState = {
    game: string,
    users: User[],
    status: 'connected' | 'connecting',
    gameOverStats?: {
        userId: string,
        primaryText: string,
    }[]
}

type GameState = {
    version: string,
}

type GameAction = {
    actionId: string,
    actorUserId: string,
    action: {
        type: string,
        data: string,
    }
    resultGameState: string,
    gameVersionBeforeAction: string,
    gameVersionAfterAction: string,
}

type Update = {
    appStateChange: {
        data: AppState,
        kind: {
            type: 'initial' | 'update' | 'game-change' | 'game-over',
        } | {
            type: 'user-update',
            userUpdated?: User,
        } | {
            type: 'user-left-id',
            userId: string,
        }
    }
    appState?: AppState,
    gameAction?: GameAction,
    forceUpdate?: GameState,
}






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


