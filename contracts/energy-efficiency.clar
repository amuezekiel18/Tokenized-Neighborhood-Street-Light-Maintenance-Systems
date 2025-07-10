;; Energy Efficiency Contract
;; Monitors power consumption and LED upgrade opportunities

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u200))
(define-constant ERR_LIGHT_NOT_FOUND (err u201))
(define-constant ERR_INVALID_CONSUMPTION (err u202))
(define-constant ERR_ALREADY_LED (err u203))

;; Data Variables
(define-data-var total-energy-saved uint u0)
(define-data-var led-upgrade-threshold uint u50) ;; kWh threshold for LED upgrade recommendation

;; Light type constants
(define-constant LIGHT_TYPE_TRADITIONAL u1)
(define-constant LIGHT_TYPE_LED u2)

;; Data Maps
(define-map light-energy-data
  { light-id: uint }
  {
    light-type: uint,
    monthly-consumption: uint, ;; in kWh
    last-reading: uint,
    total-consumption: uint,
    led-upgrade-recommended: bool,
    upgrade-date: uint
  }
)

(define-map energy-readings
  { light-id: uint, reading-id: uint }
  {
    consumption: uint,
    timestamp: uint,
    reader: principal
  }
)

(define-map light-reading-count
  { light-id: uint }
  { count: uint }
)

(define-map monthly-savings
  { month: uint, year: uint }
  { total-saved: uint }
)

;; Public Functions

;; Initialize energy monitoring for a light
(define-public (initialize-light-monitoring (light-id uint) (light-type uint))
  (begin
    (asserts! (or (is-eq light-type LIGHT_TYPE_TRADITIONAL) (is-eq light-type LIGHT_TYPE_LED)) ERR_INVALID_CONSUMPTION)

    (map-set light-energy-data
      { light-id: light-id }
      {
        light-type: light-type,
        monthly-consumption: u0,
        last-reading: u0,
        total-consumption: u0,
        led-upgrade-recommended: false,
        upgrade-date: u0
      }
    )
    (ok true)
  )
)

;; Record energy consumption reading
(define-public (record-consumption (light-id uint) (consumption uint))
  (let (
    (energy-data (unwrap! (map-get? light-energy-data { light-id: light-id }) ERR_LIGHT_NOT_FOUND))
    (current-count (default-to { count: u0 } (map-get? light-reading-count { light-id: light-id })))
    (reading-id (+ (get count current-count) u1))
  )
    (asserts! (> consumption u0) ERR_INVALID_CONSUMPTION)

    ;; Update energy data
    (map-set light-energy-data
      { light-id: light-id }
      (merge energy-data {
        monthly-consumption: consumption,
        last-reading: block-height,
        total-consumption: (+ (get total-consumption energy-data) consumption)
      })
    )

    ;; Record the reading
    (map-set energy-readings
      { light-id: light-id, reading-id: reading-id }
      {
        consumption: consumption,
        timestamp: block-height,
        reader: tx-sender
      }
    )

    ;; Update reading count
    (map-set light-reading-count
      { light-id: light-id }
      { count: reading-id }
    )

    ;; Check if LED upgrade should be recommended
    (if (and
          (is-eq (get light-type energy-data) LIGHT_TYPE_TRADITIONAL)
          (>= consumption (var-get led-upgrade-threshold)))
      (map-set light-energy-data
        { light-id: light-id }
        (merge (unwrap-panic (map-get? light-energy-data { light-id: light-id })) {
          led-upgrade-recommended: true
        })
      )
      true
    )

    (ok reading-id)
  )
)

;; Upgrade light to LED
(define-public (upgrade-to-led (light-id uint))
  (let ((energy-data (unwrap! (map-get? light-energy-data { light-id: light-id }) ERR_LIGHT_NOT_FOUND)))
    (asserts! (is-eq (get light-type energy-data) LIGHT_TYPE_TRADITIONAL) ERR_ALREADY_LED)

    (map-set light-energy-data
      { light-id: light-id }
      (merge energy-data {
        light-type: LIGHT_TYPE_LED,
        upgrade-date: block-height,
        led-upgrade-recommended: false
      })
    )

    ;; Calculate estimated savings (traditional lights use ~30% more energy)
    (let ((estimated-savings (/ (* (get monthly-consumption energy-data) u30) u100)))
      (var-set total-energy-saved (+ (var-get total-energy-saved) estimated-savings))
    )

    (ok true)
  )
)

;; Set LED upgrade threshold
(define-public (set-upgrade-threshold (new-threshold uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (var-set led-upgrade-threshold new-threshold)
    (ok true)
  )
)

;; Record monthly energy savings
(define-public (record-monthly-savings (month uint) (year uint) (savings uint))
  (begin
    (asserts! (and (>= month u1) (<= month u12)) ERR_INVALID_CONSUMPTION)
    (asserts! (> year u2020) ERR_INVALID_CONSUMPTION)

    (map-set monthly-savings
      { month: month, year: year }
      { total-saved: savings }
    )
    (ok true)
  )
)

;; Read-only Functions

;; Get light energy data
(define-read-only (get-light-energy-data (light-id uint))
  (map-get? light-energy-data { light-id: light-id })
)

;; Get energy reading
(define-read-only (get-energy-reading (light-id uint) (reading-id uint))
  (map-get? energy-readings { light-id: light-id, reading-id: reading-id })
)

;; Check if LED upgrade is recommended
(define-read-only (is-led-upgrade-recommended (light-id uint))
  (match (map-get? light-energy-data { light-id: light-id })
    energy-data (get led-upgrade-recommended energy-data)
    false
  )
)

;; Get total energy saved
(define-read-only (get-total-energy-saved)
  (var-get total-energy-saved)
)

;; Get LED upgrade threshold
(define-read-only (get-upgrade-threshold)
  (var-get led-upgrade-threshold)
)

;; Calculate efficiency score (lower consumption = higher score)
(define-read-only (calculate-efficiency-score (light-id uint))
  (match (map-get? light-energy-data { light-id: light-id })
    energy-data
      (let ((consumption (get monthly-consumption energy-data)))
        (if (is-eq consumption u0)
          u100
          (if (<= consumption u20)
            u100
            (if (<= consumption u40)
              u80
              (if (<= consumption u60)
                u60
                u40
              )
            )
          )
        )
      )
    u0
  )
)

;; Get monthly savings
(define-read-only (get-monthly-savings (month uint) (year uint))
  (map-get? monthly-savings { month: month, year: year })
)

;; Check if light is LED
(define-read-only (is-led-light (light-id uint))
  (match (map-get? light-energy-data { light-id: light-id })
    energy-data (is-eq (get light-type energy-data) LIGHT_TYPE_LED)
    false
  )
)
