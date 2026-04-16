import { createContext, useContext } from "react";
import { Status } from "./usePingServerStatus";

export interface ServerStatusContextValue {
    connectedStatus: Status;
    isLoading: boolean;
    isError: boolean;
}

export const ServerStatusContext = createContext<ServerStatusContextValue>({
    connectedStatus: Status.Unknown,
    isLoading: false,
    isError: false,
});

export function useServerStatus(): ServerStatusContextValue {
    return useContext(ServerStatusContext);
}