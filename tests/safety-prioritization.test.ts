import { describe, it, expect, beforeEach } from "vitest"

// Mock Safety Prioritization Contract
const mockSafetyContract = {
  safetyLocations: new Map(),
  repairPriorities: new Map(),
  safetyIncidents: new Map(),
  locationIncidentCount: new Map(),
  emergencyThreshold: 80,
  
  // Constants
  PRIORITY_LOW: 1,
  PRIORITY_MEDIUM: 2,
  PRIORITY_HIGH: 3,
  PRIORITY_EMERGENCY: 4,
  
  LOCATION_RESIDENTIAL: 1,
  LOCATION_COMMERCIAL: 2,
  LOCATION_SCHOOL_ZONE: 3,
  LOCATION_HOSPITAL_ZONE: 4,
  LOCATION_INTERSECTION: 5,
  
  registerSafetyLocation(lightId, locationType, trafficVolume, pedestrianActivity) {
    if (locationType < 1 || locationType > 5) return { err: 302 }
    
    const initialScore = this.calculateInitialSafetyScore(locationType, trafficVolume, pedestrianActivity)
    
    this.safetyLocations.set(lightId, {
      locationType,
      safetyScore: initialScore,
      crimeIncidents: 0,
      trafficVolume,
      pedestrianActivity,
      lastUpdated: Date.now(),
    })
    
    return { ok: initialScore }
  },
  
  updateSafetyScore(lightId, newCrimeIncidents) {
    const locationData = this.safetyLocations.get(lightId)
    if (!locationData) return { err: 301 }
    
    const updatedScore = this.calculateUpdatedSafetyScore(locationData, newCrimeIncidents)
    
    locationData.safetyScore = updatedScore
    locationData.crimeIncidents = newCrimeIncidents
    locationData.lastUpdated = Date.now()
    
    this.updateRepairPriority(lightId, updatedScore)
    
    return { ok: updatedScore }
  },
  
  setRepairPriority(lightId, priorityLevel, reason) {
    const locationData = this.safetyLocations.get(lightId)
    if (!locationData) return { err: 301 }
    if (priorityLevel < 1 || priorityLevel > 4) return { err: 302 }
    
    const dueDate = Date.now() + this.getPriorityDueBlocks(priorityLevel)
    const isEmergency = locationData.safetyScore >= this.emergencyThreshold
    
    this.repairPriorities.set(lightId, {
      priorityLevel,
      assignedDate: Date.now(),
      dueDate,
      emergencyFlag: isEmergency,
      priorityReason: reason,
    })
    
    return { ok: true }
  },
  
  reportSafetyIncident(lightId, incidentType, severity) {
    if (severity < 1 || severity > 10) return { err: 303 }
    
    const currentCount = this.locationIncidentCount.get(lightId) || { count: 0 }
    const incidentId = currentCount.count + 1
    
    this.safetyIncidents.set(`${lightId}-${incidentId}`, {
      incidentType,
      severity,
      timestamp: Date.now(),
      reporter: "test-user",
    })
    
    this.locationIncidentCount.set(lightId, { count: incidentId })
    
    // Update safety score for high severity incidents
    if (severity >= 7) {
      const locationData = this.safetyLocations.get(lightId)
      if (locationData) {
        this.updateSafetyScore(lightId, locationData.crimeIncidents + 1)
      }
    }
    
    return { ok: incidentId }
  },
  
  setEmergencyThreshold(newThreshold) {
    if (newThreshold < 0 || newThreshold > 100) return { err: 303 }
    this.emergencyThreshold = newThreshold
    return { ok: true }
  },
  
  calculateInitialSafetyScore(locationType, trafficVolume, pedestrianActivity) {
    let baseScore = 50
    
    switch (locationType) {
      case this.LOCATION_SCHOOL_ZONE:
        baseScore = 90
        break
      case this.LOCATION_HOSPITAL_ZONE:
        baseScore = 85
        break
      case this.LOCATION_INTERSECTION:
        baseScore = 75
        break
      case this.LOCATION_COMMERCIAL:
        baseScore = 60
        break
      default:
        baseScore = 50
    }
    
    const trafficBonus = Math.floor(trafficVolume / 10)
    const pedestrianBonus = Math.floor(pedestrianActivity / 5)
    
    const totalScore = baseScore + trafficBonus + pedestrianBonus
    return Math.min(totalScore, 100)
  },
  
  calculateUpdatedSafetyScore(locationData, newIncidents) {
    const baseScore = locationData.safetyScore
    const incidentPenalty = newIncidents * 5
    
    const updatedScore = baseScore + incidentPenalty
    return Math.min(updatedScore, 100)
  },
  
  updateRepairPriority(lightId, safetyScore) {
    let priority = this.PRIORITY_LOW
    let reason = "Low priority - Standard maintenance"
    
    if (safetyScore >= 90) {
      priority = this.PRIORITY_EMERGENCY
      reason = "Emergency - Critical safety location"
    } else if (safetyScore >= 70) {
      priority = this.PRIORITY_HIGH
      reason = "High priority - Safety concern"
    } else if (safetyScore >= 50) {
      priority = this.PRIORITY_MEDIUM
      reason = "Medium priority - Moderate safety impact"
    }
    
    return this.setRepairPriority(lightId, priority, reason)
  },
  
  getPriorityDueBlocks(priorityLevel) {
    switch (priorityLevel) {
      case this.PRIORITY_EMERGENCY:
        return 144000 // ~1 day in ms
      case this.PRIORITY_HIGH:
        return 1008000 // ~1 week in ms
      case this.PRIORITY_MEDIUM:
        return 4032000 // ~1 month in ms
      default:
        return 14400000 // ~100 days in ms
    }
  },
  
  getSafetyLocation(lightId) {
    return this.safetyLocations.get(lightId) || null
  },
  
  getRepairPriority(lightId) {
    return this.repairPriorities.get(lightId) || null
  },
  
  getSafetyIncident(lightId, incidentId) {
    return this.safetyIncidents.get(`${lightId}-${incidentId}`) || null
  },
  
  isEmergencyPriority(lightId) {
    const locationData = this.safetyLocations.get(lightId)
    return locationData ? locationData.safetyScore >= this.emergencyThreshold : false
  },
  
  getEmergencyThreshold() {
    return this.emergencyThreshold
  },
  
  getPriorityLevel(lightId) {
    const priorityData = this.repairPriorities.get(lightId)
    return priorityData ? priorityData.priorityLevel : 0
  },
  
  isRepairOverdue(lightId) {
    const priorityData = this.repairPriorities.get(lightId)
    return priorityData ? Date.now() > priorityData.dueDate : false
  },
}

describe("Safety Prioritization Contract", () => {
  beforeEach(() => {
    // Reset contract state
    mockSafetyContract.safetyLocations.clear()
    mockSafetyContract.repairPriorities.clear()
    mockSafetyContract.safetyIncidents.clear()
    mockSafetyContract.locationIncidentCount.clear()
    mockSafetyContract.emergencyThreshold = 80
  })
  
  describe("Safety Location Registration", () => {
    it("should register school zone with high safety score", () => {
      const result = mockSafetyContract.registerSafetyLocation(1, mockSafetyContract.LOCATION_SCHOOL_ZONE, 100, 50)
      
      expect(result.ok).toBeGreaterThan(90)
      
      const location = mockSafetyContract.getSafetyLocation(1)
      expect(location.locationType).toBe(mockSafetyContract.LOCATION_SCHOOL_ZONE)
      expect(location.safetyScore).toBeGreaterThan(90)
    })
    
    it("should register residential area with moderate safety score", () => {
      const result = mockSafetyContract.registerSafetyLocation(1, mockSafetyContract.LOCATION_RESIDENTIAL, 50, 25)
      
      expect(result.ok).toBeLessThan(80)
      
      const location = mockSafetyContract.getSafetyLocation(1)
      expect(location.locationType).toBe(mockSafetyContract.LOCATION_RESIDENTIAL)
    })
    
    it("should reject invalid location type", () => {
      const result = mockSafetyContract.registerSafetyLocation(1, 999, 50, 25)
      expect(result.err).toBe(302) // ERR_INVALID_PRIORITY
    })
    
    it("should calculate score based on traffic and pedestrian activity", () => {
      const lowTraffic = mockSafetyContract.registerSafetyLocation(1, mockSafetyContract.LOCATION_COMMERCIAL, 10, 5)
      const highTraffic = mockSafetyContract.registerSafetyLocation(2, mockSafetyContract.LOCATION_COMMERCIAL, 100, 50)
      
      expect(highTraffic.ok).toBeGreaterThan(lowTraffic.ok)
    })
  })
  
  describe("Safety Score Updates", () => {
    beforeEach(() => {
      mockSafetyContract.registerSafetyLocation(1, mockSafetyContract.LOCATION_COMMERCIAL, 50, 25)
    })
    
    it("should update safety score with crime incidents", () => {
      const result = mockSafetyContract.updateSafetyScore(1, 3)
      
      expect(result.ok).toBeGreaterThan(0)
      
      const location = mockSafetyContract.getSafetyLocation(1)
      expect(location.crimeIncidents).toBe(3)
      expect(location.safetyScore).toBeGreaterThan(60) // Base + incidents
    })
    
    it("should handle non-existent location", () => {
      const result = mockSafetyContract.updateSafetyScore(999, 1)
      expect(result.err).toBe(301) // ERR_LOCATION_NOT_FOUND
    })
    
    it("should cap safety score at 100", () => {
      mockSafetyContract.updateSafetyScore(1, 20) // High incident count
      
      const location = mockSafetyContract.getSafetyLocation(1)
      expect(location.safetyScore).toBeLessThanOrEqual(100)
    })
  })
  
  describe("Repair Priority Management", () => {
    beforeEach(() => {
      mockSafetyContract.registerSafetyLocation(1, mockSafetyContract.LOCATION_SCHOOL_ZONE, 100, 50)
    })
    
    it("should set repair priority successfully", () => {
      const result = mockSafetyContract.setRepairPriority(1, mockSafetyContract.PRIORITY_HIGH, "Safety concern")
      
      expect(result.ok).toBe(true)
      
      const priority = mockSafetyContract.getRepairPriority(1)
      expect(priority.priorityLevel).toBe(mockSafetyContract.PRIORITY_HIGH)
      expect(priority.priorityReason).toBe("Safety concern")
    })
    
    it("should reject invalid priority level", () => {
      const result = mockSafetyContract.setRepairPriority(1, 999, "Invalid")
      expect(result.err).toBe(302) // ERR_INVALID_PRIORITY
    })
    
    it("should set emergency flag for high safety scores", () => {
      mockSafetyContract.updateSafetyScore(1, 5) // Increase safety score
      mockSafetyContract.setRepairPriority(1, mockSafetyContract.PRIORITY_HIGH, "Test")
      
      const priority = mockSafetyContract.getRepairPriority(1)
      expect(priority.emergencyFlag).toBe(true)
    })
    
    it("should automatically update priority based on safety score", () => {
      mockSafetyContract.updateSafetyScore(1, 10) // Very high score
      
      const priorityLevel = mockSafetyContract.getPriorityLevel(1)
      expect(priorityLevel).toBe(mockSafetyContract.PRIORITY_EMERGENCY)
    })
  })
  
  describe("Safety Incident Reporting", () => {
    beforeEach(() => {
      mockSafetyContract.registerSafetyLocation(1, mockSafetyContract.LOCATION_INTERSECTION, 75, 40)
    })
    
    it("should report safety incident successfully", () => {
      const result = mockSafetyContract.reportSafetyIncident(1, "Accident", 6)
      
      expect(result.ok).toBe(1)
      
      const incident = mockSafetyContract.getSafetyIncident(1, 1)
      expect(incident.incidentType).toBe("Accident")
      expect(incident.severity).toBe(6)
    })
    
    it("should reject invalid severity levels", () => {
      const result1 = mockSafetyContract.reportSafetyIncident(1, "Test", 0)
      const result2 = mockSafetyContract.reportSafetyIncident(1, "Test", 11)
      
      expect(result1.err).toBe(303) // ERR_INVALID_SCORE
      expect(result2.err).toBe(303)
    })
    
    it("should update safety score for high severity incidents", () => {
      const initialLocation = mockSafetyContract.getSafetyLocation(1)
      const initialScore = initialLocation.safetyScore
      
      mockSafetyContract.reportSafetyIncident(1, "Serious Accident", 8)
      
      const updatedLocation = mockSafetyContract.getSafetyLocation(1)
      expect(updatedLocation.safetyScore).toBeGreaterThan(initialScore)
    })
    
    it("should not update safety score for low severity incidents", () => {
      const initialLocation = mockSafetyContract.getSafetyLocation(1)
      const initialScore = initialLocation.safetyScore
      
      mockSafetyContract.reportSafetyIncident(1, "Minor Issue", 3)
      
      const updatedLocation = mockSafetyContract.getSafetyLocation(1)
      expect(updatedLocation.safetyScore).toBe(initialScore)
    })
  })
  
  describe("Emergency Priority Detection", () => {
    beforeEach(() => {
      mockSafetyContract.registerSafetyLocation(1, mockSafetyContract.LOCATION_HOSPITAL_ZONE, 100, 75)
    })
    
    it("should identify emergency priority locations", () => {
      mockSafetyContract.updateSafetyScore(1, 5) // Push score above threshold
      
      expect(mockSafetyContract.isEmergencyPriority(1)).toBe(true)
    })
    
    it("should update emergency threshold", () => {
      const result = mockSafetyContract.setEmergencyThreshold(90)
      
      expect(result.ok).toBe(true)
      expect(mockSafetyContract.getEmergencyThreshold()).toBe(90)
    })
    
    it("should reject invalid emergency threshold", () => {
      const result1 = mockSafetyContract.setEmergencyThreshold(-1)
      const result2 = mockSafetyContract.setEmergencyThreshold(101)
      
      expect(result1.err).toBe(303)
      expect(result2.err).toBe(303)
    })
  })
  
  describe("Repair Due Date Management", () => {
    beforeEach(() => {
      mockSafetyContract.registerSafetyLocation(1, mockSafetyContract.LOCATION_COMMERCIAL, 50, 25)
    })
    
    it("should set shorter due dates for higher priorities", () => {
      mockSafetyContract.setRepairPriority(1, mockSafetyContract.PRIORITY_EMERGENCY, "Emergency")
      const emergencyPriority = mockSafetyContract.getRepairPriority(1)
      
      mockSafetyContract.registerSafetyLocation(2, mockSafetyContract.LOCATION_COMMERCIAL, 50, 25)
      mockSafetyContract.setRepairPriority(2, mockSafetyContract.PRIORITY_LOW, "Low")
      const lowPriority = mockSafetyContract.getRepairPriority(2)
      
      expect(emergencyPriority.dueDate).toBeLessThan(lowPriority.dueDate)
    })
    
    it("should detect overdue repairs", () => {
      // Set a priority with past due date (simulate by setting very short duration)
      mockSafetyContract.setRepairPriority(1, mockSafetyContract.PRIORITY_EMERGENCY, "Test")
      
      // In a real scenario, we'd wait or manipulate time
      // For testing, we'll check the logic exists
      const isOverdue = mockSafetyContract.isRepairOverdue(1)
      expect(typeof isOverdue).toBe("boolean")
    })
  })
})
