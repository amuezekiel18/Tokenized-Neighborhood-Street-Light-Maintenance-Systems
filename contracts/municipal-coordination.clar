;; Municipal Coordination Contract
;; Manages communication with city maintenance departments

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u400))
(define-constant ERR_DEPARTMENT_NOT_FOUND (err u401))
(define-constant ERR_WORK_ORDER_NOT_FOUND (err u402))
(define-constant ERR_INVALID_STATUS (err u403))
(define-constant ERR_ALREADY_ASSIGNED (err u404))

;; Data Variables
(define-data-var next-work-order-id uint u1)
(define-data-var next-department-id uint u1)

;; Work order status constants
(define-constant STATUS_PENDING u1)
(define-constant STATUS_ASSIGNED u2)
(define-constant STATUS_IN_PROGRESS u3)
(define-constant STATUS_COMPLETED u4)
(define-constant STATUS_CANCELLED u5)

;; Department types
(define-constant DEPT_ELECTRICAL u1)
(define-constant DEPT_MAINTENANCE u2)
(define-constant DEPT_EMERGENCY u3)

;; Data Maps
(define-map departments
  { department-id: uint }
  {
    name: (string-ascii 100),
    department-type: uint,
    contact-info: (string-ascii 200),
    active: bool,
    workload: uint,
    response-time-avg: uint
  }
)

(define-map work-orders
  { work-order-id: uint }
  {
    light-id: uint,
    department-id: uint,
    status: uint,
    priority: uint,
    created-date: uint,
    assigned-date: uint,
    completed-date: uint,
    description: (string-ascii 300),
    estimated-cost: uint
  }
)

(define-map department-assignments
  { department-id: uint, light-id: uint }
  {
    work-order-id: uint,
    assigned-date: uint,
    technician: (string-ascii 100)
  }
)

(define-map response-times
  { work-order-id: uint }
  {
    created: uint,
    first-response: uint,
    completed: uint,
    total-hours: uint
  }
)

;; Public Functions

;; Register a municipal department
(define-public (register-department (name (string-ascii 100)) (department-type uint) (contact-info (string-ascii 200)))
  (let ((department-id (var-get next-department-id)))
    (asserts! (and (>= department-type u1) (<= department-type u3)) ERR_INVALID_STATUS)

    (map-set departments
      { department-id: department-id }
      {
        name: name,
        department-type: department-type,
        contact-info: contact-info,
        active: true,
        workload: u0,
        response-time-avg: u0
      }
    )
    (var-set next-department-id (+ department-id u1))
    (ok department-id)
  )
)

;; Create a work order
(define-public (create-work-order (light-id uint) (priority uint) (description (string-ascii 300)) (estimated-cost uint))
  (let ((work-order-id (var-get next-work-order-id)))
    (asserts! (and (>= priority u1) (<= priority u4)) ERR_INVALID_STATUS)

    (map-set work-orders
      { work-order-id: work-order-id }
      {
        light-id: light-id,
        department-id: u0, ;; Not assigned yet
        status: STATUS_PENDING,
        priority: priority,
        created-date: block-height,
        assigned-date: u0,
        completed-date: u0,
        description: description,
        estimated-cost: estimated-cost
      }
    )

    ;; Record creation time
    (map-set response-times
      { work-order-id: work-order-id }
      {
        created: block-height,
        first-response: u0,
        completed: u0,
        total-hours: u0
      }
    )

    (var-set next-work-order-id (+ work-order-id u1))
    (ok work-order-id)
  )
)

;; Assign work order to department
(define-public (assign-work-order (work-order-id uint) (department-id uint) (technician (string-ascii 100)))
  (let (
    (work-order (unwrap! (map-get? work-orders { work-order-id: work-order-id }) ERR_WORK_ORDER_NOT_FOUND))
    (department (unwrap! (map-get? departments { department-id: department-id }) ERR_DEPARTMENT_NOT_FOUND))
  )
    (asserts! (is-eq (get status work-order) STATUS_PENDING) ERR_ALREADY_ASSIGNED)
    (asserts! (get active department) ERR_DEPARTMENT_NOT_FOUND)

    ;; Update work order status
    (map-set work-orders
      { work-order-id: work-order-id }
      (merge work-order {
        department-id: department-id,
        status: STATUS_ASSIGNED,
        assigned-date: block-height
      })
    )

    ;; Create department assignment
    (map-set department-assignments
      { department-id: department-id, light-id: (get light-id work-order) }
      {
        work-order-id: work-order-id,
        assigned-date: block-height,
        technician: technician
      }
    )

    ;; Update department workload
    (map-set departments
      { department-id: department-id }
      (merge department {
        workload: (+ (get workload department) u1)
      })
    )

    ;; Record first response time
    (let ((response-data (unwrap-panic (map-get? response-times { work-order-id: work-order-id }))))
      (map-set response-times
        { work-order-id: work-order-id }
        (merge response-data {
          first-response: block-height
        })
      )
    )

    (ok true)
  )
)

;; Update work order status
(define-public (update-work-order-status (work-order-id uint) (new-status uint))
  (let ((work-order (unwrap! (map-get? work-orders { work-order-id: work-order-id }) ERR_WORK_ORDER_NOT_FOUND)))
    (asserts! (and (>= new-status u1) (<= new-status u5)) ERR_INVALID_STATUS)

    (map-set work-orders
      { work-order-id: work-order-id }
      (merge work-order {
        status: new-status,
        completed-date: (if (is-eq new-status STATUS_COMPLETED) block-height (get completed-date work-order))
      })
    )

    ;; If completed, update response times and department workload
    (if (is-eq new-status STATUS_COMPLETED)
      (begin
        ;; Update response times
        (let ((response-data (unwrap-panic (map-get? response-times { work-order-id: work-order-id }))))
          (map-set response-times
            { work-order-id: work-order-id }
            (merge response-data {
              completed: block-height,
              total-hours: (- block-height (get created response-data))
            })
          )
        )

        ;; Reduce department workload
        (let ((department (unwrap-panic (map-get? departments { department-id: (get department-id work-order) }))))
          (map-set departments
            { department-id: (get department-id work-order) }
            (merge department {
              workload: (if (> (get workload department) u0) (- (get workload department) u1) u0)
            })
          )
        )
      )
      true
    )

    (ok true)
  )
)

;; Update department contact information
(define-public (update-department-contact (department-id uint) (new-contact (string-ascii 200)))
  (let ((department (unwrap! (map-get? departments { department-id: department-id }) ERR_DEPARTMENT_NOT_FOUND)))
    (map-set departments
      { department-id: department-id }
      (merge department {
        contact-info: new-contact
      })
    )
    (ok true)
  )
)

;; Deactivate department
(define-public (deactivate-department (department-id uint))
  (let ((department (unwrap! (map-get? departments { department-id: department-id }) ERR_DEPARTMENT_NOT_FOUND)))
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)

    (map-set departments
      { department-id: department-id }
      (merge department {
        active: false
      })
    )
    (ok true)
  )
)

;; Read-only Functions

;; Get department information
(define-read-only (get-department (department-id uint))
  (map-get? departments { department-id: department-id })
)

;; Get work order information
(define-read-only (get-work-order (work-order-id uint))
  (map-get? work-orders { work-order-id: work-order-id })
)

;; Get department assignment
(define-read-only (get-department-assignment (department-id uint) (light-id uint))
  (map-get? department-assignments { department-id: department-id, light-id: light-id })
)

;; Get response times
(define-read-only (get-response-times (work-order-id uint))
  (map-get? response-times { work-order-id: work-order-id })
)

;; Get next work order ID
(define-read-only (get-next-work-order-id)
  (var-get next-work-order-id)
)

;; Check if department is available (low workload)
(define-read-only (is-department-available (department-id uint))
  (match (map-get? departments { department-id: department-id })
    department (and (get active department) (< (get workload department) u10))
    false
  )
)

;; Get department workload
(define-read-only (get-department-workload (department-id uint))
  (match (map-get? departments { department-id: department-id })
    department (get workload department)
    u0
  )
)

;; Calculate average response time for department
(define-read-only (calculate-avg-response-time (department-id uint))
  (match (map-get? departments { department-id: department-id })
    department (get response-time-avg department)
    u0
  )
)

;; Check work order status
(define-read-only (get-work-order-status (work-order-id uint))
  (match (map-get? work-orders { work-order-id: work-order-id })
    work-order (get status work-order)
    u0
  )
)
