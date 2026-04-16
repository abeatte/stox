import { Status, usePingServerStatus } from "../hooks/usePingServerStatus";

export default function ServerStatus() {
  const { connectedStatus, isLoading: isConnectedStatusLoading } = usePingServerStatus();

  return (<span className='gs-server-status'>
    <span className={`dot ${isConnectedStatusLoading ? 'yellow' : connectedStatus === Status.Connected ? 'green' : 'red'}`}></span>
    {(isConnectedStatusLoading ? 'unknown' : connectedStatus === Status.Connected ? ' connected' : 'disconnected')}
  </span>);
}

