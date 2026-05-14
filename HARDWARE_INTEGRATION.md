# HARDWARE INTEGRATION GUIDE

Complete guide for integrating ESP32 IoT device with the AI nutrition monitoring system.

---

## Hardware Architecture

```
┌──────────────────────────────────────┐
│          ESP32 MICROCONTROLLER       │
│  (WiFi + Bluetooth + GPIO Pins)      │
│                                      │
├──────────────────────────────────────┤
│                                      │
│  ┌──────────────────────────────┐   │
│  │ RFID Reader (RC522)          │   │
│  │ • Detects student cards      │   │
│  │ • Triggers scan flow         │   │
│  │ • ~2cm read distance         │   │
│  └──────────────────────────────┘   │
│           │                         │
│           │ SPI Bus                 │
│           ▼                         │
│     ┌──────────────┐               │
│     │ ESP32 RFID   │               │
│     │ Handler      │               │
│     └──────┬───────┘               │
│            │                       │
│            └───────┐               │
│                    │               │
│  ┌──────────────────────────────┐ │
│  │ Servo Motor Control          │ │
│  │ • Opens/closes gate          │ │
│  │ • Precise positioning        │ │
│  │ • PWM signal (GPIO pin)      │ │
│  └──────────────────────────────┘ │
│           │                       │
│           ▼                       │
│    Servo Motor (180°)             │
│    (Rice dispenser gate)          │
│                                  │
│  ┌──────────────────────────────┐ │
│  │ Load Cell Interface           │ │
│  │ • HX711 ADC Converter         │ │
│  │ • Measures weight             │ │
│  │ • 10kg load capacity          │ │
│  └──────────────────────────────┘ │
│           │                       │
│           ▼                       │
│    Load Cell (underneath)         │
│    (Measures served rice)         │
│                                  │
│  ┌──────────────────────────────┐ │
│  │ WiFi/Network Module          │ │
│  │ • Connects to router         │ │
│  │ • Sends scan data to backend │ │
│  │ • Receives commands          │ │
│  └──────────────────────────────┘ │
│           │                       │
│           └────────┐              │
│                    │              │
└────────────────────┼──────────────┘
                     │
                     │ WiFi/HTTP
                     ▼
        Backend API (Node.js/Express)
        Port 5001
```

---

## ESP32 Pinout Configuration

```
ESP32 Pin Configuration
=======================

RFID Reader (RC522):
  - SCK   → GPIO 18
  - MOSI  → GPIO 23
  - MISO  → GPIO 19
  - SS    → GPIO 5
  - RST   → GPIO 4

Load Cell (HX711):
  - DT    → GPIO 25
  - SCK   → GPIO 26

Servo Motor:
  - Signal → GPIO 12
  - GND   → GND
  - 5V    → 5V

WiFi/Network:
  - Built-in ESP32 WiFi (no extra pins needed)

Status LED (optional):
  - GPIO 13 → LED (indicates scan)
  - GPIO 14 → LED (indicates error)
```

---

## Complete Hardware Communication Flow

### 1. Initialization
```
ESP32 Startup
  ↓
Initialize Pins & Peripherals
  ├─ RFID Reader (SPI)
  ├─ Load Cell (GPIO)
  ├─ Servo Motor (PWM)
  └─ WiFi Connection
  ↓
Connect to WiFi Network
  ├─ SSID: "SchoolNetwork"
  ├─ Password: "***"
  ├─ IP: 192.168.x.x (DHCP)
  ├─ DNS: 8.8.8.8
  └─ API Server: http://backend:5001
  ↓
System Ready - Listening for RFID scans
```

### 2. RFID Detection
```
Student brings card near reader
  ↓
RC522 detects card within 2-3cm
  ↓
Extract RFID Card ID (20 bytes hex)
  Example: 0x48 0x21 0x73 0xA2... → "RFID-DIET-1778134898996"
  ↓
Debounce (100ms) - verify card is stable
  ↓
LED Blink (visual feedback)
```

### 3. Backend Request
```
Send HTTP POST Request:

POST http://192.168.1.100:5001/api/scan
Content-Type: application/json

{
  "rfid_card_id": "RFID-DIET-1778134898996"
}

Timeout: 100ms max
Connection: Keep-alive
```

### 4. Backend Processing
```
Backend receives scan request
  ↓
1. Find student by RFID in database
  ↓
2. Calculate serving size based on age
   Example: Age 12 → 150g rice
  ↓
3. Auto-log food to database
   INSERT INTO food_logs (student_id, food_item, served_grams, ...)
  ↓
4. Calculate weekly average calories
  ↓
5. Get AI health prediction
  ↓
6. Generate response
   (Lightweight in HARDWARE_MODE=true)
  ↓
Return response within 100ms
```

### 5. Hardware Response
```
Receive HTTP Response:

{
  "success": true,
  "student_id": 59,
  "name": "Student Name",
  "grams": 150,
  "message": "Dispense food"
}

Parse JSON response
  ↓
Extract: grams = 150
  ↓
Store response data (for verification)
```

### 6. Servo Motor Control
```
Open Servo Gate:
  ├─ PWM Frequency: 50Hz
  ├─ Pulse Width: 1000µs (0°)
  └─ Duration: 2 seconds (enough to open)

Rice Dispensed:
  └─ Gravity flow into measuring container
```

### 7. Load Cell Measurement
```
Initialize HX711 ADC:
  ├─ Calibration factor: 3500 (adjust per hardware)
  └─ Tare (zero) before measurement

During rice dispensing:
  ├─ Read weight continuously (every 100ms)
  ├─ Target weight: grams received from backend
  ├─ Current: 0g → 50g → 100g → 150g (target reached)
  └─ Tolerance: ±5g

Close Servo Gate:
  ├─ PWM Pulse Width: 2000µs (180°)
  └─ Duration: 1 second (close completely)

Verification:
  ├─ Final weight should be ≈ target ± 5%
  ├─ If OK: Log success
  └─ If NOT OK: Log error, alert backend
```

### 8. Feedback to Backend
```
Send verification POST:

POST http://192.168.1.100:5001/api/scan/confirm
{
  "rfid_card_id": "RFID-DIET-1778134898996",
  "dispensed_grams": 147,
  "target_grams": 150,
  "accuracy": "98%",
  "timestamp": "2026-05-07T12:45:30Z"
}

Backend updates:
  ├─ Adjust food_log if needed
  ├─ Update serving accuracy metrics
  └─ Log hardware performance data
```

### 9. Completion
```
Light LED (green) - Success
Display on LCD: "Food Served: 150g Rice"
Reset system - Ready for next scan
```

---

## Arduino/ESP32 Code Template

### Main Sketch

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Servo.h>
#include "HX711.h"

// WiFi Configuration
const char* ssid = "SchoolNetwork";
const char* password = "YourWiFiPassword";
const char* serverUrl = "http://192.168.1.100:5001/api/scan";

// Pin Configuration
#define RFID_SS_PIN 5
#define RFID_RST_PIN 4
#define SERVO_PIN 12
#define LOAD_CELL_DOUT 25
#define LOAD_CELL_CLK 26
#define STATUS_LED_SUCCESS 13
#define STATUS_LED_ERROR 14

// Initialize components
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
Servo servoMotor;
HX711 scale;

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(STATUS_LED_SUCCESS, OUTPUT);
  pinMode(STATUS_LED_ERROR, OUTPUT);
  
  // Initialize RFID
  SPI.begin();
  rfid.PCD_Init();
  Serial.println("RFID reader initialized");
  
  // Initialize Servo
  servoMotor.attach(SERVO_PIN);
  servoMotor.write(180); // Closed position
  Serial.println("Servo initialized");
  
  // Initialize Load Cell
  scale.begin(LOAD_CELL_DOUT, LOAD_CELL_CLK);
  scale.set_scale(3500.0); // Calibration factor
  scale.tare(); // Zero the scale
  Serial.println("Load cell initialized");
  
  // Connect WiFi
  connectToWiFi();
  
  Serial.println("System ready - waiting for RFID scan");
}

void loop() {
  // Check for RFID card
  if (rfid.PICC_IsNewCardPresent()) {
    if (rfid.PICC_ReadCardSerial()) {
      String rfidCode = getRfidCode();
      Serial.println("RFID detected: " + rfidCode);
      
      // Send to backend
      String response = sendScanRequest(rfidCode);
      
      if (response != "") {
        // Process response and dispense
        processResponse(response);
      } else {
        triggerError();
      }
      
      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
    }
  }
}

String getRfidCode() {
  String code = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    code += String(rfid.uid.uidByte[i], HEX);
  }
  code.toUpperCase();
  return "RFID-" + code;
}

String sendScanRequest(String rfidCode) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    String payload = "{\"rfid_card_id\":\"" + rfidCode + "\"}";
    int httpCode = http.POST(payload);
    
    if (httpCode == 200) {
      String response = http.getString();
      http.end();
      return response;
    }
    http.end();
  }
  return "";
}

void processResponse(String response) {
  // Parse JSON response
  // Extract: grams, student_id, name
  
  int gramsTarget = 150; // Parse from response
  
  Serial.println("Dispensing: " + String(gramsTarget) + "g");
  
  // Open servo gate
  servoMotor.write(0); // Open
  delay(1000);
  
  // Measure with load cell
  int currentWeight = 0;
  long startTime = millis();
  
  while (currentWeight < gramsTarget && millis() - startTime < 5000) {
    scale.power_up();
    currentWeight = scale.get_units(10);
    Serial.println("Current weight: " + String(currentWeight) + "g");
    delay(100);
  }
  
  // Close servo gate
  servoMotor.write(180); // Close
  delay(500);
  
  // Verify
  int finalWeight = scale.get_units(10);
  
  if (abs(finalWeight - gramsTarget) < 10) {
    triggerSuccess();
    Serial.println("SUCCESS: " + String(finalWeight) + "g dispensed");
  } else {
    triggerError();
    Serial.println("ERROR: Weight mismatch (" + String(finalWeight) + "g vs " + String(gramsTarget) + "g)");
  }
  
  // Send confirmation to backend
  sendConfirmation(rfidCode, finalWeight, gramsTarget);
}

void triggerSuccess() {
  digitalWrite(STATUS_LED_SUCCESS, HIGH);
  delay(500);
  digitalWrite(STATUS_LED_SUCCESS, LOW);
}

void triggerError() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(STATUS_LED_ERROR, HIGH);
    delay(200);
    digitalWrite(STATUS_LED_ERROR, LOW);
    delay(200);
  }
}

void connectToWiFi() {
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    Serial.println("IP address: " + WiFi.localIP().toString());
  } else {
    Serial.println("\nFailed to connect to WiFi");
  }
}

void sendConfirmation(String rfidCode, int actual, int target) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl + "/confirm");
    http.addHeader("Content-Type", "application/json");
    
    String payload = "{\"rfid_card_id\":\"" + rfidCode + "\",\"dispensed_grams\":" + String(actual) + ",\"target_grams\":" + String(target) + "}";
    http.POST(payload);
    http.end();
  }
}
```

---

## Hardware Setup Instructions

### 1. RFID Reader Setup
```
1. Connect RC522 to ESP32 via SPI:
   - SCK  → GPIO 18
   - MOSI → GPIO 23
   - MISO → GPIO 19
   - SS   → GPIO 5
   - RST  → GPIO 4
   - GND  → GND
   - 3.3V → 3.3V (with 100nF capacitor to GND)

2. Load Arduino library:
   - Sketch → Include Library → Manage Libraries
   - Search: "MFRC522"
   - Install: MFRC522 by GithubCommunity

3. Test with example:
   - File → Examples → MFRC522 → DumpInfo
   - Select board: ESP32
   - Set COM port
   - Upload and check Serial Monitor
```

### 2. Load Cell Setup
```
1. Wire HX711 to ESP32:
   - DT  → GPIO 25
   - SCK → GPIO 26
   - GND → GND
   - 5V  → 5V

2. Connect to load cell:
   - Red/Black → to positive/negative of load cell
   - Green → to positive (may need parallel)
   - White → to negative (may need parallel)

3. Load library:
   - Install: HX711 by Bogdan Necula

4. Calibration:
   - Place 1kg weight on cell
   - Run calibration sketch
   - Note the calibration factor
   - Update in code: scale.set_scale(CALIBRATION_FACTOR)
```

### 3. Servo Motor Setup
```
1. Connect Servo to ESP32:
   - Signal → GPIO 12 (PWM)
   - GND   → GND
   - 5V    → 5V (may need external power supply)

2. Test positions:
   - 0° (open):   servo.write(0);
   - 90° (mid):   servo.write(90);
   - 180° (close):servo.write(180);

3. Adjust timing as needed for your mechanical setup
```

### 4. WiFi Configuration
```
1. Update in code:
   const char* ssid = "YourNetworkName";
   const char* password = "YourPassword";

2. Find backend server IP:
   - Run on backend machine: ipconfig
   - Use local IP (e.g., 192.168.1.100)
   - Update: const char* serverUrl = "http://192.168.1.100:5001/api/scan";

3. Test connection:
   - Monitor Serial output for connection status
   - Should see "WiFi connected" and IP address
```

---

## Testing Hardware Integration

### Step 1: Test Each Component Individually
```
1. RFID Reader
   - Run MFRC522 example
   - Present card
   - Verify card ID is detected

2. Load Cell
   - Run HX711 calibration
   - Verify weight readings
   - Check calibration factor accuracy

3. Servo
   - Run servo sweep test
   - Verify smooth movement
   - Check open/close positions

4. WiFi
   - Monitor Serial for connection
   - Verify IP address assignment
```

### Step 2: Test Backend Integration
```
1. Ensure backend is running on port 5001
   cd backend
   npm start

2. Check HARDWARE_MODE in .env:
   HARDWARE_MODE=true

3. Monitor backend logs for incoming requests
   Should see: "🔍 RFID scan initiated: RFID-..."

4. Verify response format:
   {"success":true,"student_id":59,"name":"...","grams":150,"message":"Dispense food"}
```

### Step 3: Full System Test
```
1. Start backend API
   npm start

2. Upload ESP32 code

3. Monitor Serial output:
   - "System ready - waiting for RFID scan"

4. Present RFID card:
   - Should see response from backend
   - Servo should open and close
   - Load cell should measure weight
   - LED should indicate success/error

5. Check backend logs:
   - POST /api/scan request logged
   - Food entry created in database
   - Verification recorded
```

---

## Performance Metrics

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| RFID Detection | <100ms | Minimize debounce time |
| Backend Response | <100ms | HARDWARE_MODE=true, lightweight response |
| Servo Operation | <2s | Optimize servo speed/acceleration |
| Load Cell Accuracy | ±5% | Proper calibration, stable surface |
| Total Cycle Time | <5s | Optimize all steps |
| WiFi Reconnect | <3s | Keep WiFi enabled, save credentials |

---

## Troubleshooting

### RFID Not Detected
- Check SPI connections (SCK, MOSI, MISO)
- Verify SS pin configuration
- Check antenna alignment (1-3cm distance)
- Ensure card is compatible (13.56 MHz)

### Load Cell Reading Wrong
- Recalibrate with known weight
- Check wire connections (polarity)
- Ensure cell is on level surface
- Check HX711 power supply (clean 5V)

### Servo Not Moving
- Verify PWM pin configuration
- Check servo power supply (external if needed)
- Test servo with servo driver board
- Verify 50Hz frequency, 1000-2000µs pulse width

### WiFi Connection Fails
- Check SSID and password
- Verify router is broadcasting
- Check if ESP32 is in range
- Ensure backend server is accessible

### Backend Response Timeout
- Check network connectivity
- Verify backend is running (port 5001)
- Check firewall settings
- Monitor backend logs for errors

---

## Deployment Checklist

- [ ] All hardware connections verified
- [ ] Calibration factors recorded
- [ ] WiFi credentials configured
- [ ] Backend server IP configured
- [ ] HARDWARE_MODE=true in .env
- [ ] Serial monitoring shows "System ready"
- [ ] RFID scanning triggers response
- [ ] Servo operates smoothly
- [ ] Load cell measurements accurate
- [ ] Full cycle completes in <5s
- [ ] Backend logs show incoming scans
- [ ] Food entries auto-logged to database
- [ ] No timeout errors
- [ ] LED feedback working
- [ ] System ready for field deployment

---

## Final Integration Notes

1. **Real-world Testing:**
   - Test with actual RFID cards (not just one)
   - Test multiple scans in succession
   - Test with real rice (weight variations)
   - Test in target environment (noise, WiFi, lighting)

2. **Safety:**
   - Servo motor can cause pinching injuries - add guards
   - Load cell must be securely mounted
   - Ensure power supply can handle all devices
   - Use isolation transformer if needed

3. **Maintenance:**
   - Clean RFID antenna weekly
   - Calibrate load cell monthly
   - Check servo for wear
   - Monitor WiFi signal strength

4. **Scaling:**
   - Can add multiple dispensers (one ESP32 per dispenser)
   - Can add multiple load cells for accuracy
   - Can implement mesh WiFi for reliability
   - Can add local logging (SD card) as backup

