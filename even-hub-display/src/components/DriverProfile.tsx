import { RideData } from '../models/RideData'
import '../styles/DriverProfile.css'

interface DriverProfileProps {
  data: RideData
  onClose?: () => void
}

export default function DriverProfile({ data, onClose }: DriverProfileProps) {
  return (
    <div className="driver-profile">
      <div className="profile-header">
        <button className="close-btn" onClick={onClose}>✕</button>
        <h2>Driver Profile</h2>
      </div>

      <div className="profile-content">
        {/* Avatar */}
        <div className="avatar-section">
          {data.driverAvatar ? (
            <img src={data.driverAvatar} alt={data.driverName} className="avatar" />
          ) : (
            <div className="avatar-placeholder">
              <span>{data.driverName.charAt(0)}</span>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="basic-info">
          <h3>{data.driverFullName || data.driverName}</h3>
          <div className="rating-section">
            <span className="rating">⭐ {data.driverRating.toFixed(1)}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat">
            <div className="stat-label">Total Rides</div>
            <div className="stat-value">{data.totalRides || 'N/A'}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Acceptance</div>
            <div className="stat-value">{data.acceptanceRate ? `${data.acceptanceRate}%` : 'N/A'}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Cancellation</div>
            <div className="stat-value">{data.cancellationRate ? `${data.cancellationRate}%` : 'N/A'}</div>
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="vehicle-section">
          <h4>Vehicle</h4>
          {data.vehiclePhoto && (
            <img src={data.vehiclePhoto} alt="Vehicle" className="vehicle-photo" />
          )}
          <div className="vehicle-details">
            <p>
              <strong>{data.vehicleColor} {data.vehicleMake} {data.vehicleModel}</strong>
            </p>
            <p className="license-plate">📋 {data.licensePlate}</p>
          </div>
        </div>

        {/* About Section */}
        <div className="about-section">
          <h4>About This Driver</h4>
          <p className="about-text">
            {data.totalRides && data.totalRides > 100
              ? `Experienced driver with ${data.totalRides}+ rides completed. Known for reliable and safe driving.`
              : data.acceptanceRate && data.acceptanceRate > 95
              ? 'Highly responsive driver with excellent acceptance rate.'
              : 'Professional driver committed to excellent service.'}
          </p>
        </div>
      </div>
    </div>
  )
}
