export interface StatusViewProps {
  lastUpdate?: Date | null
}

/**
 * Waiting state - displays before any ride data arrives
 */
export default function StatusView({ lastUpdate }: StatusViewProps) {
  return (
    <div className="status-view">
      <div className="status-content">
        <div className="spinner"></div>
        <h2>Waiting for ride data...</h2>
        <p className="status-detail">
          {lastUpdate
            ? `Last update: ${lastUpdate.toLocaleTimeString()}`
            : 'No rides active yet'}
        </p>
        <p className="status-help">
          Order a ride in the Uber app to get started
        </p>
      </div>

      <div className="status-info">
        <h3>How it works:</h3>
        <ol>
          <li>Open the Uber app and order a ride</li>
          <li>The iOS companion app intercepts the notification</li>
          <li>Your driver info appears here</li>
          <li>See it on your G2 glasses</li>
        </ol>
      </div>
    </div>
  )
}
