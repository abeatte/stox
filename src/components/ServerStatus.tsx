import { Status } from "../hooks/usePingServerStatus";
import { useServerStatus } from "../hooks/useServerStatus";

export default function ServerStatus() {
  const { connectedStatus, isLoading: isConnectedStatusLoading } = useServerStatus();

  return (<span className='gs-server-status'>
    <span className={`dot ${isConnectedStatusLoading ? 'yellow' : connectedStatus === Status.Connected ? 'green' : 'red'}`}></span>
    {(isConnectedStatusLoading ? 'unknown' : connectedStatus === Status.Connected ? ' connected' : 'disconnected')}
  </span>);
}

