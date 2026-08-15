import { useState } from 'react'
import { RideData } from '../models/RideData'
import '../styles/ShareETA.css'

interface ShareETAProps {
  ride: RideData
  eta: number
}

interface Contact {
  name: string
  phone: string
  email?: string
}

export default function ShareETA({ ride, eta }: ShareETAProps) {
  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [shareMessage, setShareMessage] = useState('')
  const [isSharing, setIsSharing] = useState(false)

  // Mock contacts - in real app would come from phone contacts
  const mockContacts: Contact[] = [
    { name: 'Mom', phone: '+1234567890', email: 'mom@email.com' },
    { name: 'Partner', phone: '+0987654321', email: 'partner@email.com' },
    { name: 'Friend Alex', phone: '+1111111111' },
  ]

  const generateShareText = () => {
    return `My Uber driver ${ride.driverName} (${ride.vehicleColor} ${ride.vehicleMake} ${ride.vehicleModel}, plate ${ride.licensePlate}) will arrive in ${eta} minutes. Rating: ⭐${ride.driverRating}`
  }

  const handleShare = () => {
    if (selectedContacts.length === 0) {
      alert('Please select at least one contact')
      return
    }

    setIsSharing(true)

    // Simulate sending
    console.log(`📤 Sharing ETA with ${selectedContacts.length} contact(s)`)
    console.log(`Message: ${shareMessage || generateShareText()}`)

    setTimeout(() => {
      setIsSharing(false)
      setShowShareModal(false)
      setSelectedContacts([])
      setShareMessage('')
      alert(`✅ Shared with ${selectedContacts.length} contact${selectedContacts.length > 1 ? 's' : ''}`)
    }, 1000)
  }

  const toggleContact = (name: string) => {
    setSelectedContacts(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    )
  }

  return (
    <div className="share-eta">
      <button className="share-btn" onClick={() => setShowShareModal(true)}>
        <span className="icon">👥</span>
        <span className="label">Share ETA</span>
      </button>

      {showShareModal && (
        <div className="share-modal-overlay">
          <div className="share-modal">
            <div className="modal-header">
              <h3>Share Your ETA</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowShareModal(false)
                  setSelectedContacts([])
                  setShareMessage('')
                }}
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              {/* Contacts List */}
              <div className="contacts-section">
                <h4>Select contacts to notify</h4>
                <div className="contacts-list">
                  {mockContacts.map(contact => (
                    <label key={contact.name} className="contact-item">
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact.name)}
                        onChange={() => toggleContact(contact.name)}
                      />
                      <div className="contact-info">
                        <div className="contact-name">{contact.name}</div>
                        <div className="contact-detail">{contact.email || contact.phone}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="message-section">
                <h4>Message (optional)</h4>
                <textarea
                  value={shareMessage}
                  onChange={e => setShareMessage(e.target.value)}
                  placeholder="Leave empty for default message"
                  className="share-message-input"
                  rows={3}
                />
                <p className="message-preview">
                  <strong>Preview:</strong> {shareMessage || generateShareText()}
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowShareModal(false)
                  setSelectedContacts([])
                  setShareMessage('')
                }}
              >
                Cancel
              </button>
              <button
                className="share-confirm-btn"
                onClick={handleShare}
                disabled={selectedContacts.length === 0 || isSharing}
              >
                {isSharing ? '📤 Sharing...' : '📤 Share'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
