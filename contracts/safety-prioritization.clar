;; Safety Prioritization Contract
;; Determines urgent lighting repair locations

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u300))
(define-constant ERR_LOCATION_NOT_FOUND (err u301))
(define-constant ERR_INVALID_PRIORITY (err u302))
(define-constant ERR_INVALID_SCORE (err u303))

;; Data Variables
(define-data-var emergency-threshold uint u80) ;; Safety score threshold for emergency repairs

;; Priority levels
(define-constant PRIORITY_LOW u1)
(define-constant PRIORITY_MEDIUM u2)
(define-constant PRIORITY_HIGH u3)
(define-constant PRIORITY_EMERGENCY u4)

;; Location types
(define-constant LOCATION_RESIDENTIAL u1)
(define-constant LOCATION_COMMERCIAL u2)
(define-constant LOCATION_SCHOOL_ZONE u3)
(define-constant LOCATION_HOSPITAL_ZONE u4)
(define-constant LOCATION_INTERSECTION u5)

;; Data Maps
(define-map safety-locations
  { light-id: uint }
  {
    location-type: uint,
    safety-score: uint, ;; 0-100, higher = more critical
    crime-incidents: uint,
    traffic-volume: uint,
    pedestrian-activity: uint,
    last-updated: uint
  }
)

(define-map repair-priorities
  { light-id: uint }
  {
    priority-level: uint,
    assigned-date: uint,
    due-date: uint,
    emergency-flag: bool,
    priority-reason: (string-ascii 200)
  }
)

(define-map safety-incidents
  { light-id: uint, incident-id: uint }
  {
    incident-type: (string-ascii 100),
    severity: uint,
    timestamp: uint,
    reporter: principal
  }
)

(define-map location-incident-count
  { light-id: uint }
  { count: uint }
)

;; Public Functions

;; Register safety location data for a light
(define-public (register-safety-location (light-id uint) (location-type uint) (traffic-volume uint) (pedestrian-activity uint))
  (begin
    (asserts! (and (>= location-type u1) (<= location-type u5)) ERR_INVALID_PRIORITY)

    (let ((initial-safety-score (calculate-initial-safety-score location-type traffic-volume pedestrian-activity)))
      (map-set safety-locations
        { light-id: light-id }
        {
          location-type: location-type,
          safety-score: initial-safety-score,
          crime-incidents: u0,
          traffic-volume: traffic-volume,
          pedestrian-activity: pedestrian-activity,
          last-updated: block-height
        }
      )
      (ok initial-safety-score)
    )
  )
)

;; Update safety score based on incidents
(define-public (update-safety-score (light-id uint) (new-crime-incidents uint))
  (let ((location-data (unwrap! (map-get? safety-locations { light-id: light-id }) ERR_LOCATION_NOT_FOUND)))
    (let ((updated-score (calculate-updated-safety-score location-data new-crime-incidents)))
      (map-set safety-locations
        { light-id: light-id }
        (merge location-data {
          safety-score: updated-score,
          crime-incidents: new-crime-incidents,
          last-updated: block-height
        })
      )

      ;; Update repair priority if needed
      (try! (update-repair-priority light-id updated-score))
      (ok updated-score)
    )
  )
)

;; Set repair priority for a light
(define-public (set-repair-priority (light-id uint) (priority-level uint) (reason (string-ascii 200)))
  (let ((location-data (unwrap! (map-get? safety-locations { light-id: light-id }) ERR_LOCATION_NOT_FOUND)))
    (asserts! (and (>= priority-level u1) (<= priority-level u4)) ERR_INVALID_PRIORITY)

    (let (
      (due-date (+ block-height (get-priority-due-blocks priority-level)))
      (is-emergency (>= (get safety-score location-data) (var-get emergency-threshold)))
    )
      (map-set repair-priorities
        { light-id: light-id }
        {
          priority-level: priority-level,
          assigned-date: block-height,
          due-date: due-date,
          emergency-flag: is-emergency,
          priority-reason: reason
        }
      )
      (ok true)
    )
  )
)

;; Report safety incident
(define-public (report-safety-incident (light-id uint) (incident-type (string-ascii 100)) (severity uint))
  (let (
    (current-count (default-to { count: u0 } (map-get? location-incident-count { light-id: light-id })))
    (incident-id (+ (get count current-count) u1))
  )
    (asserts! (and (>= severity u1) (<= severity u10)) ERR_INVALID_SCORE)

    ;; Record the incident
    (map-set safety-incidents
      { light-id: light-id, incident-id: incident-id }
      {
        incident-type: incident-type,
        severity: severity,
        timestamp: block-height,
        reporter: tx-sender
      }
    )

    ;; Update incident count
    (map-set location-incident-count
      { light-id: light-id }
      { count: incident-id }
    )

    ;; Update safety score if high severity incident
    (if (>= severity u7)
      (let ((location-data (unwrap! (map-get? safety-locations { light-id: light-id }) ERR_LOCATION_NOT_FOUND)))
        (try! (update-safety-score light-id (+ (get crime-incidents location-data) u1)))
        (ok incident-id)
      )
      (ok incident-id)
    )
  )
)

;; Set emergency threshold
(define-public (set-emergency-threshold (new-threshold uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (and (>= new-threshold u0) (<= new-threshold u100)) ERR_INVALID_SCORE)
    (var-set emergency-threshold new-threshold)
    (ok true)
  )
)

;; Private Functions

;; Calculate initial safety score
(define-private (calculate-initial-safety-score (location-type uint) (traffic-volume uint) (pedestrian-activity uint))
  (let (
    (base-score (if (is-eq location-type LOCATION_SCHOOL_ZONE) u90
                 (if (is-eq location-type LOCATION_HOSPITAL_ZONE) u85
                 (if (is-eq location-type LOCATION_INTERSECTION) u75
                 (if (is-eq location-type LOCATION_COMMERCIAL) u60
                 u50)))))
    (traffic-bonus (/ traffic-volume u10))
    (pedestrian-bonus (/ pedestrian-activity u5))
  )
    (let ((total-score (+ base-score traffic-bonus pedestrian-bonus)))
      (if (> total-score u100) u100 total-score)
    )
  )
)

;; Calculate updated safety score with crime incidents
(define-private (calculate-updated-safety-score (location-data (tuple (location-type uint) (safety-score uint) (crime-incidents uint) (traffic-volume uint) (pedestrian-activity uint) (last-updated uint))) (new-incidents uint))
  (let (
    (base-score (get safety-score location-data))
    (incident-penalty (* new-incidents u5))
  )
    (let ((updated-score (+ base-score incident-penalty)))
      (if (> updated-score u100) u100 updated-score)
    )
  )
)

;; Update repair priority based on safety score
(define-private (update-repair-priority (light-id uint) (safety-score uint))
  (let (
    (priority (if (>= safety-score u90) PRIORITY_EMERGENCY
              (if (>= safety-score u70) PRIORITY_HIGH
              (if (>= safety-score u50) PRIORITY_MEDIUM
              PRIORITY_LOW))))
    (reason (if (>= safety-score u90) "Emergency - Critical safety location"
            (if (>= safety-score u70) "High priority - Safety concern"
            (if (>= safety-score u50) "Medium priority - Moderate safety impact"
            "Low priority - Standard maintenance"))))
  )
    (set-repair-priority light-id priority reason)
  )
)

;; Get due date blocks based on priority
(define-private (get-priority-due-blocks (priority-level uint))
  (if (is-eq priority-level PRIORITY_EMERGENCY) u144      ;; ~1 day
  (if (is-eq priority-level PRIORITY_HIGH) u1008         ;; ~1 week
  (if (is-eq priority-level PRIORITY_MEDIUM) u4032       ;; ~1 month
  u14400)))                                               ;; ~100 days
)

;; Read-only Functions

;; Get safety location data
(define-read-only (get-safety-location (light-id uint))
  (map-get? safety-locations { light-id: light-id })
)

;; Get repair priority
(define-read-only (get-repair-priority (light-id uint))
  (map-get? repair-priorities { light-id: light-id })
)

;; Get safety incident
(define-read-only (get-safety-incident (light-id uint) (incident-id uint))
  (map-get? safety-incidents { light-id: light-id, incident-id: incident-id })
)

;; Check if location is emergency priority
(define-read-only (is-emergency-priority (light-id uint))
  (match (map-get? safety-locations { light-id: light-id })
    location-data (>= (get safety-score location-data) (var-get emergency-threshold))
    false
  )
)

;; Get emergency threshold
(define-read-only (get-emergency-threshold)
  (var-get emergency-threshold)
)

;; Get priority level for a light
(define-read-only (get-priority-level (light-id uint))
  (match (map-get? repair-priorities { light-id: light-id })
    priority-data (get priority-level priority-data)
    u0
  )
)

;; Check if repair is overdue
(define-read-only (is-repair-overdue (light-id uint))
  (match (map-get? repair-priorities { light-id: light-id })
    priority-data (> block-height (get due-date priority-data))
    false
  )
)
