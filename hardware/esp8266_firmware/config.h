#ifndef CONFIG_H
#define CONFIG_H

/**
 * ============================================================================
 * PM POSHAN Mid-Day Meal Automated Food Dispenser
 * Hardware Configuration & Calibration Settings
 * Target Microcontroller: ESP8266 (NodeMCU / WeMos D1 Mini)
 * ============================================================================
 */

// ============================================
// 1. NETWORK & BACKEND CONFIGURATION
// ============================================
#define WIFI_SSID         "OPPO Reno10 5G"
#define WIFI_PASSWORD     "12345678"
#define BASE_URL          "http://10.253.205.54:5001"
#define HTTP_TIMEOUT_MS   8000
#define WIFI_MAX_ATTEMPTS 30

// ============================================
// 2. PIN DEFINITIONS (ESP8266)
// ============================================
// RC522 RFID Reader — Hardware SPI Bus
#define SS_PIN    D8      // GPIO15 (SPI Slave Select / SDA)
#define RST_PIN   D3      // GPIO0  (Reset)
// Hardware SPI standard pins:
// SCK  = D5 (GPIO14)
// MOSI = D7 (GPIO13)
// MISO = D6 (GPIO12)

// HX711 Load Cell Amplifier
#define HX711_DT  D0      // GPIO16 (Digital Data Out)
#define HX711_SCK D4      // GPIO2  (Serial Clock Input)

// SG90 / MG995 Dispenser Servo Motor
#define SERVO_PIN    D1   // GPIO5  (PWM Signal)
#define SERVO_CLOSED 0    // Dispenser gate fully closed (0 degrees)
#define SERVO_OPEN   180  // Dispenser gate fully open (180 degrees)

// ============================================
// 3. HX711 CALIBRATION SETTINGS
// ============================================
/**
 * Load Cell Calibration Factor:
 * Represents raw ADC counts per physical gram.
 * 
 * CALIBRATION INSTRUCTIONS:
 * 1. Ensure the food tray is empty and scale is tared.
 * 2. Place a certified reference weight (e.g. 100.0g) on the load cell.
 * 3. Read raw units: float raw = scale.get_units(10);
 * 4. Calculate: CALIBRATION_FACTOR = raw / 100.0;
 * 5. Update this define value accordingly.
 */
#define CALIBRATION_FACTOR 113.5f

// Sample counts for noise filtering
#define TARE_STABILITY_SAMPLES   5   // Samples averaged during tare initialization
#define FLOW_READING_SAMPLES     2   // Fast samples averaged during continuous dispensing
#define FINAL_READING_SAMPLES    5   // High-accuracy samples averaged after gate closes

// ============================================
// 4. CLOSED-LOOP DISPENSING SAFETY PARAMETERS
// ============================================
// Flow cutoff lead margin (grams):
// Closes servo slightly before target to compensate for grains in flight and gate travel time.
#define FLOW_CUTOFF_MARGIN_GRAMS 5.0f

// Safety limits & timeouts
#define MAX_DISPENSE_TIMEOUT_MS  15000  // Maximum 15 seconds allowed for single dispensing cycle
#define STALL_CHECK_INTERVAL_MS   4000  // Interval to detect hopper blockage or empty hopper
#define STALL_MIN_INCREASE_GRAMS   3.0f // Minimum grams increase required within interval
#define MAX_ALLOWED_GRAMS        350.0f // Hard safety cap to prevent tray overflow
#define MIN_ACCEPTABLE_GRAMS      10.0f // Minimum weight to treat as a valid portion

// Delays & Intervals
#define STABILIZATION_DELAY_MS   600    // Settling delay after gate closure before final read
#define CARD_READ_COOLDOWN_MS   2500    // Delay after card processed before next scan

#endif // CONFIG_H

