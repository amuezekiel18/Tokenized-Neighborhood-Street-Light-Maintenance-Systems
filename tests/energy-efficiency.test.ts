import { describe, it, expect, beforeEach } from "vitest"

// Mock Energy Efficiency Contract
const mockEnergyContract = {
  lightEnergyData: new Map(),
  energyReadings: new Map(),
  lightReadingCount: new Map(),
  monthlySavings: new Map(),
  totalEnergySaved: 0,
  ledUpgradeThreshold: 50,
  
  // Constants
  LIGHT_TYPE_TRADITIONAL: 1,
  LIGHT_TYPE_LED: 2,
  
  initializeLightMonitoring(lightId, lightType) {
    if (lightType !== this.LIGHT_TYPE_TRADITIONAL && lightType !== this.LIGHT_TYPE_LED) {
      return { err: 202 }
    }
    
    this.lightEnergyData.set(lightId, {
      lightType,
      monthlyConsumption: 0,
      lastReading: 0,
      totalConsumption: 0,
      ledUpgradeRecommended: false,
      upgradeDate: 0,
    })
    
    return { ok: true }
  },
  
  recordConsumption(lightId, consumption) {
    const energyData = this.lightEnergyData.get(lightId)
    if (!energyData) return { err: 201 }
    if (consumption <= 0) return { err: 202 }
    
    const currentCount = this.lightReadingCount.get(lightId) || { count: 0 }
    const readingId = currentCount.count + 1
    
    // Update energy data
    energyData.monthlyConsumption = consumption
    energyData.lastReading = Date.now()
    energyData.totalConsumption += consumption
    
    // Record reading
    this.energyReadings.set(`${lightId}-${readingId}`, {
      consumption,
      timestamp: Date.now(),
      reader: "test-user",
    })
    
    this.lightReadingCount.set(lightId, { count: readingId })
    
    // Check LED upgrade recommendation
    if (energyData.lightType === this.LIGHT_TYPE_TRADITIONAL && consumption >= this.ledUpgradeThreshold) {
      energyData.ledUpgradeRecommended = true
    }
    
    return { ok: readingId }
  },
  
  upgradeToLed(lightId) {
    const energyData = this.lightEnergyData.get(lightId)
    if (!energyData) return { err: 201 }
    if (energyData.lightType === this.LIGHT_TYPE_LED) return { err: 203 }
    
    energyData.lightType = this.LIGHT_TYPE_LED
    energyData.upgradeDate = Date.now()
    energyData.ledUpgradeRecommended = false
    
    // Calculate savings (30% reduction)
    const estimatedSavings = Math.floor((energyData.monthlyConsumption * 30) / 100)
    this.totalEnergySaved += estimatedSavings
    
    return { ok: true }
  },
  
  setUpgradeThreshold(newThreshold) {
    this.ledUpgradeThreshold = newThreshold
    return { ok: true }
  },
  
  recordMonthlySavings(month, year, savings) {
    if (month < 1 || month > 12) return { err: 202 }
    if (year <= 2020) return { err: 202 }
    
    this.monthlySavings.set(`${month}-${year}`, { totalSaved: savings })
    return { ok: true }
  },
  
  getLightEnergyData(lightId) {
    return this.lightEnergyData.get(lightId) || null
  },
  
  getEnergyReading(lightId, readingId) {
    return this.energyReadings.get(`${lightId}-${readingId}`) || null
  },
  
  isLedUpgradeRecommended(lightId) {
    const data = this.lightEnergyData.get(lightId)
    return data ? data.ledUpgradeRecommended : false
  },
  
  getTotalEnergySaved() {
    return this.totalEnergySaved
  },
  
  getUpgradeThreshold() {
    return this.ledUpgradeThreshold
  },
  
  calculateEfficiencyScore(lightId) {
    const data = this.lightEnergyData.get(lightId)
    if (!data) return 0
    
    const consumption = data.monthlyConsumption
    if (consumption === 0) return 100
    if (consumption <= 20) return 100
    if (consumption <= 40) return 80
    if (consumption <= 60) return 60
    return 40
  },
  
  getMonthlySavings(month, year) {
    return this.monthlySavings.get(`${month}-${year}`) || null
  },
  
  isLedLight(lightId) {
    const data = this.lightEnergyData.get(lightId)
    return data ? data.lightType === this.LIGHT_TYPE_LED : false
  },
}

describe("Energy Efficiency Contract", () => {
  beforeEach(() => {
    // Reset contract state
    mockEnergyContract.lightEnergyData.clear()
    mockEnergyContract.energyReadings.clear()
    mockEnergyContract.lightReadingCount.clear()
    mockEnergyContract.monthlySavings.clear()
    mockEnergyContract.totalEnergySaved = 0
    mockEnergyContract.ledUpgradeThreshold = 50
  })
  
  describe("Light Monitoring Initialization", () => {
    it("should initialize traditional light monitoring", () => {
      const result = mockEnergyContract.initializeLightMonitoring(1, mockEnergyContract.LIGHT_TYPE_TRADITIONAL)
      
      expect(result.ok).toBe(true)
      
      const energyData = mockEnergyContract.getLightEnergyData(1)
      expect(energyData.lightType).toBe(mockEnergyContract.LIGHT_TYPE_TRADITIONAL)
      expect(energyData.monthlyConsumption).toBe(0)
      expect(energyData.ledUpgradeRecommended).toBe(false)
    })
    
    it("should initialize LED light monitoring", () => {
      const result = mockEnergyContract.initializeLightMonitoring(1, mockEnergyContract.LIGHT_TYPE_LED)
      
      expect(result.ok).toBe(true)
      
      const energyData = mockEnergyContract.getLightEnergyData(1)
      expect(energyData.lightType).toBe(mockEnergyContract.LIGHT_TYPE_LED)
    })
    
    it("should reject invalid light type", () => {
      const result = mockEnergyContract.initializeLightMonitoring(1, 999)
      expect(result.err).toBe(202) // ERR_INVALID_CONSUMPTION
    })
  })
  
  describe("Energy Consumption Recording", () => {
    beforeEach(() => {
      mockEnergyContract.initializeLightMonitoring(1, mockEnergyContract.LIGHT_TYPE_TRADITIONAL)
    })
    
    it("should record consumption successfully", () => {
      const result = mockEnergyContract.recordConsumption(1, 45)
      
      expect(result.ok).toBe(1)
      
      const energyData = mockEnergyContract.getLightEnergyData(1)
      expect(energyData.monthlyConsumption).toBe(45)
      expect(energyData.totalConsumption).toBe(45)
      
      const reading = mockEnergyContract.getEnergyReading(1, 1)
      expect(reading.consumption).toBe(45)
    })
    
    it("should reject zero or negative consumption", () => {
      const result1 = mockEnergyContract.recordConsumption(1, 0)
      const result2 = mockEnergyContract.recordConsumption(1, -10)
      
      expect(result1.err).toBe(202)
      expect(result2.err).toBe(202)
    })
    
    it("should recommend LED upgrade for high consumption", () => {
      mockEnergyContract.recordConsumption(1, 60) // Above threshold of 50
      
      const energyData = mockEnergyContract.getLightEnergyData(1)
      expect(energyData.ledUpgradeRecommended).toBe(true)
      expect(mockEnergyContract.isLedUpgradeRecommended(1)).toBe(true)
    })
    
    it("should not recommend LED upgrade for low consumption", () => {
      mockEnergyContract.recordConsumption(1, 30) // Below threshold
      
      expect(mockEnergyContract.isLedUpgradeRecommended(1)).toBe(false)
    })
    
    it("should handle non-existent light", () => {
      const result = mockEnergyContract.recordConsumption(999, 50)
      expect(result.err).toBe(201) // ERR_LIGHT_NOT_FOUND
    })
  })
  
  describe("LED Upgrades", () => {
    beforeEach(() => {
      mockEnergyContract.initializeLightMonitoring(1, mockEnergyContract.LIGHT_TYPE_TRADITIONAL)
      mockEnergyContract.recordConsumption(1, 60)
    })
    
    it("should upgrade traditional light to LED", () => {
      const result = mockEnergyContract.upgradeToLed(1)
      
      expect(result.ok).toBe(true)
      
      const energyData = mockEnergyContract.getLightEnergyData(1)
      expect(energyData.lightType).toBe(mockEnergyContract.LIGHT_TYPE_LED)
      expect(energyData.ledUpgradeRecommended).toBe(false)
      expect(energyData.upgradeDate).toBeGreaterThan(0)
      expect(mockEnergyContract.isLedLight(1)).toBe(true)
    })
    
    it("should calculate energy savings after upgrade", () => {
      const initialSavings = mockEnergyContract.getTotalEnergySaved()
      mockEnergyContract.upgradeToLed(1)
      
      const newSavings = mockEnergyContract.getTotalEnergySaved()
      expect(newSavings).toBeGreaterThan(initialSavings)
      expect(newSavings).toBe(18) // 30% of 60 kWh
    })
    
    it("should not upgrade already LED light", () => {
      mockEnergyContract.upgradeToLed(1) // First upgrade
      const result = mockEnergyContract.upgradeToLed(1) // Second attempt
      
      expect(result.err).toBe(203) // ERR_ALREADY_LED
    })
  })
  
  describe("Efficiency Calculations", () => {
    beforeEach(() => {
      mockEnergyContract.initializeLightMonitoring(1, mockEnergyContract.LIGHT_TYPE_TRADITIONAL)
    })
    
    it("should calculate high efficiency score for low consumption", () => {
      mockEnergyContract.recordConsumption(1, 15)
      const score = mockEnergyContract.calculateEfficiencyScore(1)
      expect(score).toBe(100)
    })
    
    it("should calculate medium efficiency score for moderate consumption", () => {
      mockEnergyContract.recordConsumption(1, 35)
      const score = mockEnergyContract.calculateEfficiencyScore(1)
      expect(score).toBe(80)
    })
    
    it("should calculate low efficiency score for high consumption", () => {
      mockEnergyContract.recordConsumption(1, 70)
      const score = mockEnergyContract.calculateEfficiencyScore(1)
      expect(score).toBe(40)
    })
    
    it("should return perfect score for zero consumption", () => {
      const score = mockEnergyContract.calculateEfficiencyScore(1)
      expect(score).toBe(100)
    })
  })
  
  describe("Monthly Savings Tracking", () => {
    it("should record monthly savings successfully", () => {
      const result = mockEnergyContract.recordMonthlySavings(6, 2024, 150)
      
      expect(result.ok).toBe(true)
      
      const savings = mockEnergyContract.getMonthlySavings(6, 2024)
      expect(savings.totalSaved).toBe(150)
    })
    
    it("should reject invalid month", () => {
      const result1 = mockEnergyContract.recordMonthlySavings(0, 2024, 100)
      const result2 = mockEnergyContract.recordMonthlySavings(13, 2024, 100)
      
      expect(result1.err).toBe(202)
      expect(result2.err).toBe(202)
    })
    
    it("should reject invalid year", () => {
      const result = mockEnergyContract.recordMonthlySavings(6, 2020, 100)
      expect(result.err).toBe(202)
    })
  })
  
  describe("Threshold Management", () => {
    it("should update LED upgrade threshold", () => {
      const result = mockEnergyContract.setUpgradeThreshold(75)
      
      expect(result.ok).toBe(true)
      expect(mockEnergyContract.getUpgradeThreshold()).toBe(75)
    })
    
    it("should use new threshold for recommendations", () => {
      mockEnergyContract.setUpgradeThreshold(80)
      mockEnergyContract.initializeLightMonitoring(1, mockEnergyContract.LIGHT_TYPE_TRADITIONAL)
      
      mockEnergyContract.recordConsumption(1, 70) // Below new threshold
      expect(mockEnergyContract.isLedUpgradeRecommended(1)).toBe(false)
      
      mockEnergyContract.recordConsumption(1, 85) // Above new threshold
      expect(mockEnergyContract.isLedUpgradeRecommended(1)).toBe(true)
    })
  })
})
