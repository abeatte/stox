import { useEffect, useState } from "react";

const CONNECTED_PING_INTERVAL_MS = 30 * 1000; // 30 seconds

export enum Status { Connected, Disconnected, Unknown };

export interface AliveResponse {
    connectedStatus: Status;
    isLoading: boolean;
    isError: boolean;
}

export function usePingServerStatus(): AliveResponse {
    const [state, setState] = useState<AliveResponse>({
        connectedStatus: Status.Unknown,
        isLoading: false,
        isError: false,
    });
    useEffect(() => {
        const url = 'http://localhost:3001/alive';

        setState({ connectedStatus: Status.Unknown, isLoading: true, isError: false });

        const pingServer = async () => {
            fetch(
                url, {
                // Abort the request if it takes longer than 5 seconds
                signal: AbortSignal.timeout(5000)
            })
                .then((r) => setState(
                    {
                        connectedStatus: r.status === 200 ? Status.Connected : Status.Disconnected,
                        isLoading: false,
                        isError: false
                    }))
                .catch(() => setState(
                    {
                        connectedStatus: Status.Unknown,
                        isLoading: false,
                        isError: true
                    }));
        };

        pingServer();

        const intervalId = setInterval(pingServer, CONNECTED_PING_INTERVAL_MS)
        return () => clearInterval(intervalId);
    }, []);

    return { ...state };
}