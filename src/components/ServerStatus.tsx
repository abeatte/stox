import { Status } from "../hooks/usePingServerStatus";
import { useServerStatus } from "../hooks/useServerStatus";

export default function ServerStatus({ detailed = false }: { detailed?: boolean }) {
  const { connectedStatus, isLoading: isConnectedStatusLoading } = useServerStatus();

  const label = detailed && (
    <span style={{fontWeight: 'bold'}}>Server:  </span>
  );

  const serverDownloadLink = connectedStatus !== Status.Connected && detailed && (
    <div>
      <a href="https://artbeatte.com/stox/stockworks_server.zip" download="Stockworks_server.zip">
        ( Get the Server! )
      </a>
    </div>
  );

  return (
    <div style={{ textAlign: 'center' }}>
      <span className='gs-server-status'>
        {label}
        <span className={`dot ${isConnectedStatusLoading ? 'yellow' : connectedStatus === Status.Connected ? 'green' : 'red'}`}></span>
        {(isConnectedStatusLoading ? 'unknown' : connectedStatus === Status.Connected ? ' connected' : 'disconnected')}
      </span>
      {serverDownloadLink}
    </div>);
}

