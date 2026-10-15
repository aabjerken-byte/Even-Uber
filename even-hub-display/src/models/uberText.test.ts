import { describe, expect, it } from 'vitest'
import { extractClockMinutes, extractStatus, parseUberText } from './uberText'

// 2026-10-15 19:00 local time
const NOW = new Date(2026, 9, 15, 19, 0, 0).getTime()

describe('parseUberText — pickup screen', () => {
  const screen = [
    'Meet at the pickup point',
    '3 min',
    'John',
    '4.92',
    'Silver Toyota Prius',
    '8ABC123',
    'Send a message',
    'Drop-off',
    'SFO Terminal 2'
  ].join('\n')

  it('reads driver, rating, car, plate and pickup ETA', () => {
    const { update } = parseUberText(screen, NOW)
    expect(update).toMatchObject({
      status: 'enroute',
      driverName: 'John',
      driverRating: 4.92,
      vehicleMake: 'Toyota',
      vehicleModel: 'Prius',
      vehicleColor: 'Silver',
      licensePlate: '8ABC123',
      etaMinutes: 3
    })
  })

  it('does not mistake the listed drop-off for being on the trip', () => {
    expect(parseUberText(screen, NOW).update.status).toBe('enroute')
    expect(parseUberText(screen, NOW).update.tripEtaMinutes).toBeUndefined()
  })
})

describe('parseUberText — trip screen', () => {
  it('reads destination and minutes left', () => {
    const { update } = parseUberText('Heading to SFO Terminal 2\n24 min\nJohn\nSilver Toyota Prius', NOW)
    expect(update).toMatchObject({ status: 'ontrip', destinationName: 'SFO Terminal 2', tripEtaMinutes: 24 })
    expect(update.etaMinutes).toBeUndefined()
  })

  it('turns a drop-off clock time into minutes left', () => {
    const { update } = parseUberText('Drop-off by 7:42 PM\nSFO Terminal 2', NOW)
    expect(update).toMatchObject({ status: 'ontrip', tripEtaMinutes: 42 })
  })

  it('reads a destination given under a label', () => {
    const { update } = parseUberText('Arrive by 7:30 PM\nDrop-off\n1 Market St', NOW)
    expect(update.destinationName).toBe('1 Market St')
  })
})

describe('parseUberText — notifications', () => {
  it('reads the classic notification sentence', () => {
    const { update } = parseUberText('John D. is 3 mins away in a Silver Toyota Prius (ABC123)', NOW)
    expect(update).toMatchObject({
      status: 'enroute', driverName: 'John D.', vehicleMake: 'Toyota', licensePlate: 'ABC123', etaMinutes: 3
    })
  })

  it('classifies lifecycle wording', () => {
    expect(extractStatus('Your driver has arrived')).toBe('arrived')
    expect(extractStatus('Your driver is arriving now')).toBe('arriving')
    expect(extractStatus('Your trip has started')).toBe('ontrip')
    expect(extractStatus('Rate your trip with John')).toBe('completed')
    expect(extractStatus('Your ride was cancelled')).toBe('cancelled')
    expect(extractStatus('Hello')).toBeUndefined()
  })

  it('never names the driver "Your Uber" or a car make', () => {
    expect(parseUberText('Your Uber is arriving now', NOW).update.driverName).toBeUndefined()
    expect(parseUberText('Toyota is here', NOW).update.driverName).toBeUndefined()
  })
})

describe('extractClockMinutes', () => {
  it('handles AM/PM and ignores far-off or past times', () => {
    expect(extractClockMinutes('Arrive by 8:15 PM', NOW)).toBe(75)
    expect(extractClockMinutes('Arrive by 7:05 p.m.', NOW)).toBe(5)
    expect(extractClockMinutes('Arrive by 6:00 AM', NOW)).toBeUndefined()
    expect(extractClockMinutes('no time here', NOW)).toBeUndefined()
  })
})
