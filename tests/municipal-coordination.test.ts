import { describe, it, expect, beforeEach } from "vitest"

// Mock Municipal Coordination Contract
const mockMunicipalContract = {
  departments: new Map(),
  workOrders: new Map(),
  departmentAssignments: new Map(),
  responseTimes: new Map(),
  nextWorkOrderId: 1,
  nextDepartmentId: 1,
  
  // Constants
  STATUS_PENDING: 1,
  STATUS_ASSIGNED: 2,
  STATUS_IN_PROGRESS: 3,
  STATUS_COMPLETED: 4,
  STATUS_CANCELLED: 5,
  
  DEPT_ELECTRICAL: 1,
  DEPT_MAINTENANCE: 2,
  DEPT_EMERGENCY: 3,
  
  registerDepartment(name, departmentType, contactInfo) {
    if (departmentType < 1 || departmentType > 3) return { err: 403 }
    
    const departmentId = this.nextDepartmentId++
    
    this.departments.set(departmentId, {
      name,
      departmentType,
      contactInfo,
      active: true,
      workload: 0,
      responseTimeAvg: 0,
    })
    
    return { ok: departmentId }
  },
  
  createWorkOrder(lightId, priority, description, estimatedCost) {
    if (priority < 1 || priority > 4) return { err: 403 }
    
    const workOrderId = this.nextWorkOrderId++
    
    this.workOrders.set(workOrderId, {
      lightId,
      departmentId: 0,
      status: this.STATUS_PENDING,
      priority,
      createdDate: Date.now(),
      assignedDate: 0,
      completedDate: 0,
      description,
      estimatedCost,
    })
    
    this.responseTimes.set(workOrderId, {
      created: Date.now(),
      firstResponse: 0,
      completed: 0,
      totalHours: 0,
    })
    
    return { ok: workOrderId }
  },
  
  assignWorkOrder(workOrderId, departmentId, technician) {
    const workOrder = this.workOrders.get(workOrderId)
    if (!workOrder) return { err: 402 }
    
    const department = this.departments.get(departmentId)
    if (!department) return { err: 401 }
    
    if (workOrder.status !== this.STATUS_PENDING) return { err: 404 }
    if (!department.active) return { err: 401 }
    
    // Update work order
    workOrder.departmentId = departmentId
    workOrder.status = this.STATUS_ASSIGNED
    workOrder.assignedDate = Date.now()
    
    // Create assignment
    this.departmentAssignments.set(`${departmentId}-${workOrder.lightId}`, {
      workOrderId,
      assignedDate: Date.now(),
      technician,
    })
    
    // Update department workload
    department.workload += 1
    
    // Update response times
    const responseData = this.responseTimes.get(workOrderId)
    responseData.firstResponse = Date.now()
    
    return { ok: true }
  },
  
  updateWorkOrderStatus(workOrderId, newStatus) {
    const workOrder = this.workOrders.get(workOrderId)
    if (!workOrder) return { err: 402 }
    if (newStatus < 1 || newStatus > 5) return { err: 403 }
    
    workOrder.status = newStatus
    if (newStatus === this.STATUS_COMPLETED) {
      workOrder.completedDate = Date.now()
      
      // Update response times
      const responseData = this.responseTimes.get(workOrderId)
      responseData.completed = Date.now()
      responseData.totalHours = responseData.completed - responseData.created
      
      // Reduce department workload
      const department = this.departments.get(workOrder.departmentId)
      if (department && department.workload > 0) {
        department.workload -= 1
      }
    }
    
    return { ok: true }
  },
  
  updateDepartmentContact(departmentId, newContact) {
    const department = this.departments.get(departmentId)
    if (!department) return { err: 401 }
    
    department.contactInfo = newContact
    return { ok: true }
  },
  
  deactivateDepartment(departmentId) {
    const department = this.departments.get(departmentId)
    if (!department) return { err: 401 }
    
    department.active = false
    return { ok: true }
  },
  
  getDepartment(departmentId) {
    return this.departments.get(departmentId) || null
  },
  
  getWorkOrder(workOrderId) {
    return this.workOrders.get(workOrderId) || null
  },
  
  getDepartmentAssignment(departmentId, lightId) {
    return this.departmentAssignments.get(`${departmentId}-${lightId}`) || null
  },
  
  getResponseTimes(workOrderId) {
    return this.responseTimes.get(workOrderId) || null
  },
  
  getNextWorkOrderId() {
    return this.nextWorkOrderId
  },
  
  isDepartmentAvailable(departmentId) {
    const department = this.departments.get(departmentId)
    return department ? department.active && department.workload < 10 : false
  },
  
  getDepartmentWorkload(departmentId) {
    const department = this.departments.get(departmentId)
    return department ? department.workload : 0
  },
  
  calculateAvgResponseTime(departmentId) {
    const department = this.departments.get(departmentId)
    return department ? department.responseTimeAvg : 0
  },
  
  getWorkOrderStatus(workOrderId) {
    const workOrder = this.workOrders.get(workOrderId)
    return workOrder ? workOrder.status : 0
  },
}

describe("Municipal Coordination Contract", () => {
  beforeEach(() => {
    // Reset contract state
    mockMunicipalContract.departments.clear()
    mockMunicipalContract.workOrders.clear()
    mockMunicipalContract.departmentAssignments.clear()
    mockMunicipalContract.responseTimes.clear()
    mockMunicipalContract.nextWorkOrderId = 1
    mockMunicipalContract.nextDepartmentId = 1
  })
  
  describe("Department Registration", () => {
    it("should register electrical department successfully", () => {
      const result = mockMunicipalContract.registerDepartment(
          "City Electrical Dept",
          mockMunicipalContract.DEPT_ELECTRICAL,
          "electrical@city.gov",
      )
      
      expect(result.ok).toBe(1)
      
      const department = mockMunicipalContract.getDepartment(1)
      expect(department.name).toBe("City Electrical Dept")
      expect(department.departmentType).toBe(mockMunicipalContract.DEPT_ELECTRICAL)
      expect(department.active).toBe(true)
      expect(department.workload).toBe(0)
    })
    
    it("should register maintenance department successfully", () => {
      const result = mockMunicipalContract.registerDepartment(
          "Public Works",
          mockMunicipalContract.DEPT_MAINTENANCE,
          "maintenance@city.gov",
      )
      
      expect(result.ok).toBe(1)
      
      const department = mockMunicipalContract.getDepartment(1)
      expect(department.departmentType).toBe(mockMunicipalContract.DEPT_MAINTENANCE)
    })
    
    it("should reject invalid department type", () => {
      const result = mockMunicipalContract.registerDepartment("Invalid Dept", 999, "invalid@city.gov")
      
      expect(result.err).toBe(403) // ERR_INVALID_STATUS
    })
    
    it("should increment department ID for each registration", () => {
      const result1 = mockMunicipalContract.registerDepartment("Dept 1", 1, "contact1")
      const result2 = mockMunicipalContract.registerDepartment("Dept 2", 2, "contact2")
      
      expect(result1.ok).toBe(1)
      expect(result2.ok).toBe(2)
    })
  })
  
  describe("Work Order Creation", () => {
    it("should create work order successfully", () => {
      const result = mockMunicipalContract.createWorkOrder(
          1, // lightId
          3, // priority (high)
          "Street light completely out",
          150, // estimated cost
      )
      
      expect(result.ok).toBe(1)
      
      const workOrder = mockMunicipalContract.getWorkOrder(1)
      expect(workOrder.lightId).toBe(1)
      expect(workOrder.priority).toBe(3)
      expect(workOrder.status).toBe(mockMunicipalContract.STATUS_PENDING)
      expect(workOrder.description).toBe("Street light completely out")
      expect(workOrder.estimatedCost).toBe(150)
    })
    
    it("should reject invalid priority levels", () => {
      const result1 = mockMunicipalContract.createWorkOrder(1, 0, "Test", 100)
      const result2 = mockMunicipalContract.createWorkOrder(1, 5, "Test", 100)
      
      expect(result1.err).toBe(403)
      expect(result2.err).toBe(403)
    })
    
    it("should create response time tracking", () => {
      const result = mockMunicipalContract.createWorkOrder(1, 2, "Test repair", 100)
      
      expect(result.ok).toBe(1)
      
      const responseTimes = mockMunicipalContract.getResponseTimes(1)
      expect(responseTimes.created).toBeGreaterThan(0)
      expect(responseTimes.firstResponse).toBe(0)
      expect(responseTimes.completed).toBe(0)
    })
    
    it("should increment work order ID", () => {
      const result1 = mockMunicipalContract.createWorkOrder(1, 2, "Order 1", 100)
      const result2 = mockMunicipalContract.createWorkOrder(2, 3, "Order 2", 200)
      
      expect(result1.ok).toBe(1)
      expect(result2.ok).toBe(2)
    })
  })
  
  describe("Work Order Assignment", () => {
    beforeEach(() => {
      mockMunicipalContract.registerDepartment("Electrical", 1, "electrical@city.gov")
      mockMunicipalContract.createWorkOrder(1, 3, "Repair needed", 150)
    })
    
    it("should assign work order to department successfully", () => {
      const result = mockMunicipalContract.assignWorkOrder(1, 1, "John Smith")
      
      expect(result.ok).toBe(true)
      
      const workOrder = mockMunicipalContract.getWorkOrder(1)
      expect(workOrder.departmentId).toBe(1)
      expect(workOrder.status).toBe(mockMunicipalContract.STATUS_ASSIGNED)
      expect(workOrder.assignedDate).toBeGreaterThan(0)
      
      const assignment = mockMunicipalContract.getDepartmentAssignment(1, 1)
      expect(assignment.technician).toBe("John Smith")
      expect(assignment.workOrderId).toBe(1)
    })
    
    it("should update department workload", () => {
      expect(mockMunicipalContract.getDepartmentWorkload(1)).toBe(0)
      
      mockMunicipalContract.assignWorkOrder(1, 1, "Technician")
      
      expect(mockMunicipalContract.getDepartmentWorkload(1)).toBe(1)
    })
    
    it("should update response times", () => {
      mockMunicipalContract.assignWorkOrder(1, 1, "Technician")
      
      const responseTimes = mockMunicipalContract.getResponseTimes(1)
      expect(responseTimes.firstResponse).toBeGreaterThan(0)
    })
    
    it("should reject assignment to non-existent department", () => {
      const result = mockMunicipalContract.assignWorkOrder(1, 999, "Technician")
      expect(result.err).toBe(401) // ERR_DEPARTMENT_NOT_FOUND
    })
    
    it("should reject assignment to non-existent work order", () => {
      const result = mockMunicipalContract.assignWorkOrder(999, 1, "Technician")
      expect(result.err).toBe(402) // ERR_WORK_ORDER_NOT_FOUND
    })
    
    it("should reject assignment to already assigned work order", () => {
      mockMunicipalContract.assignWorkOrder(1, 1, "First Tech")
      const result = mockMunicipalContract.assignWorkOrder(1, 1, "Second Tech")
      
      expect(result.err).toBe(404) // ERR_ALREADY_ASSIGNED
    })
    
    it("should reject assignment to inactive department", () => {
      mockMunicipalContract.deactivateDepartment(1)
      const result = mockMunicipalContract.assignWorkOrder(1, 1, "Technician")
      
      expect(result.err).toBe(401)
    })
  })
  
  describe("Work Order Status Updates", () => {
    beforeEach(() => {
      mockMunicipalContract.registerDepartment("Electrical", 1, "electrical@city.gov")
      mockMunicipalContract.createWorkOrder(1, 3, "Repair needed", 150)
      mockMunicipalContract.assignWorkOrder(1, 1, "Technician")
    })
    
    it("should update work order status successfully", () => {
      const result = mockMunicipalContract.updateWorkOrderStatus(1, mockMunicipalContract.STATUS_IN_PROGRESS)
      
      expect(result.ok).toBe(true)
      
      const workOrder = mockMunicipalContract.getWorkOrder(1)
      expect(workOrder.status).toBe(mockMunicipalContract.STATUS_IN_PROGRESS)
    })
    
    
    it("should reject invalid status values", () => {
      const result1 = mockMunicipalContract.updateWorkOrderStatus(1, 0)
      const result2 = mockMunicipalContract.updateWorkOrderStatus(1, 6)
      
      expect(result1.err).toBe(403)
      expect(result2.err).toBe(403)
    })
    
    it("should reject updates to non-existent work orders", () => {
      const result = mockMunicipalContract.updateWorkOrderStatus(999, mockMunicipalContract.STATUS_COMPLETED)
      expect(result.err).toBe(402)
    })
  })
  
  describe("Department Management", () => {
    beforeEach(() => {
      mockMunicipalContract.registerDepartment("Test Dept", 1, "original@city.gov")
    })
    
    it("should update department contact information", () => {
      const result = mockMunicipalContract.updateDepartmentContact(1, "updated@city.gov")
      
      expect(result.ok).toBe(true)
      
      const department = mockMunicipalContract.getDepartment(1)
      expect(department.contactInfo).toBe("updated@city.gov")
    })
    
    it("should deactivate department", () => {
      const result = mockMunicipalContract.deactivateDepartment(1)
      
      expect(result.ok).toBe(true)
      
      const department = mockMunicipalContract.getDepartment(1)
      expect(department.active).toBe(false)
    })
    
    it("should check department availability", () => {
      expect(mockMunicipalContract.isDepartmentAvailable(1)).toBe(true)
      
      // Add workload to make it unavailable
      for (let i = 0; i < 10; i++) {
        mockMunicipalContract.createWorkOrder(i + 1, 2, `Order ${i}`, 100)
        mockMunicipalContract.assignWorkOrder(i + 1, 1, "Tech")
      }
      
      expect(mockMunicipalContract.isDepartmentAvailable(1)).toBe(false)
    })
    
    it("should handle non-existent department operations", () => {
      const result1 = mockMunicipalContract.updateDepartmentContact(999, "test@city.gov")
      const result2 = mockMunicipalContract.deactivateDepartment(999)
      
      expect(result1.err).toBe(401)
      expect(result2.err).toBe(401)
    })
  })
  
  describe("Response Time Tracking", () => {
    beforeEach(() => {
      mockMunicipalContract.registerDepartment("Test Dept", 1, "test@city.gov")
    })
    
    it("should handle response times for non-existent work orders", () => {
      const responseTimes = mockMunicipalContract.getResponseTimes(999)
      expect(responseTimes).toBeNull()
    })
  })
  
  describe("Status Queries", () => {
    beforeEach(() => {
      mockMunicipalContract.createWorkOrder(1, 2, "Test order", 100)
    })
    
    it("should return correct work order status", () => {
      expect(mockMunicipalContract.getWorkOrderStatus(1)).toBe(mockMunicipalContract.STATUS_PENDING)
      
      mockMunicipalContract.registerDepartment("Test", 1, "test@city.gov")
      mockMunicipalContract.assignWorkOrder(1, 1, "Tech")
      
      expect(mockMunicipalContract.getWorkOrderStatus(1)).toBe(mockMunicipalContract.STATUS_ASSIGNED)
    })
    
    it("should return 0 for non-existent work order status", () => {
      expect(mockMunicipalContract.getWorkOrderStatus(999)).toBe(0)
    })
    
    it("should return correct next work order ID", () => {
      expect(mockMunicipalContract.getNextWorkOrderId()).toBe(2) // After creating one order
    })
  })
})
