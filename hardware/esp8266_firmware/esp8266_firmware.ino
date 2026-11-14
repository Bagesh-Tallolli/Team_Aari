/*
 * ESP8266 Firmware - Complete System
 *
 * Current Pin Map:
 *  RC522 : SS=D2  SCK=D5  MOSI=D7  MISO=D6  RST=D0  VCC=3.3V  GND=GND
 *  HX711 : DT=D3  SCK=D4  VCC=3.3V  GND=GND
 *  Servo : Signal=D1  VCC=External 5V  GND=Common GND
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <HX711.h>
#include <Servo.h>

// ============================================
// NETWORK CONFIG
// ============================================

#define WIFI_SSID     "OPPO Reno10 5G"
#define WIFI_PASSWORD "12345678"

// ⚠️ Port is 5002 — the backend fell back from 5001.
// ⚠️ IP must be your PC's CURRENT IP on the hotspot.
#define BASE_URL     "http://10.44.90.54:5001"

// ============================================
// PIN DEFINITIONS (Current Hardware Wiring)
// ============================================

#define SS_PIN    D2      // GPIO4 (RC522 SS)
#define RST_PIN   D0      // GPIO16 (RC522 RST)

#define HX711_DT  D3      // GPIO0 (HX711 Data)
#define HX711_SCK D4      // GPIO2 (HX711 Clock)

#define SERVO_PIN D1      // GPIO5 (Servo Signal)

#define SERVO_CLOSED 0
#define SERVO_OPEN   90

#define CALIBRATION_FACTOR 113.5

// ============================================
// OBJECTS
// ============================================

MFRC522 rfid(SS_PIN, RST_PIN);
HX711 scale;
Servo servoMotor;
WiFiClient wifiClient;

// ============================================
// STATE
// ============================================

int    studentId      = 0;
String studentName    = "";
String foodItem       = "";
float  targetGrams    = 0.0;
float  calories       = 0.0;
float  gramsServed    = 0.0;
float  caloriesServed = 0.0;
String uidString      = "";

bool isServing       = false;
bool promptDisplayed = false;
bool scaleReady      = false;
bool gateOpened      = false;
bool cardProcessed   = false;

const unsigned long CARD_READ_DELAY = 2000;

// ============================================
// PROTOTYPES
// ============================================

void   connectToWiFi();
bool   pingBackend();
String requestScan(String uid);
bool   sendServedData(int id, String name, String food, float g, float cal, String status);
void   serveFood();
void   setServoPosition(int angle);
void   processCard();

// ============================================
// WIFI
// ============================================

void connectToWiFi() {
  Serial.println("--------------------------------");
  Serial.print("Connecting to ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("Connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi failed. Restarting...");
    ESP.restart();
  }
  Serial.println("--------------------------------");
}

// ============================================
// BACKEND HEALTH CHECK (runs once at boot)
// ============================================

bool pingBackend() {
  HTTPClient http;
  Serial.print("Pinging backend: ");
  Serial.println(BASE_URL);

  http.begin(wifiClient, String(BASE_URL) + "/api/hardware/scan");
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  // Send a dummy UID — backend should return 404-ish JSON for unknown card,
  // which still proves the server is reachable and responding.
  String payload = "{\"uid\":\"00 00 00 00\"}";
  int code = http.POST(payload);

  bool ok = false;
  if (code > 0) {
    String body = http.getString();
    Serial.print("  HTTP ");
    Serial.println(code);
    Serial.print("  Body: ");
    Serial.println(body.substring(0, 120));
    ok = (code == HTTP_CODE_OK || code == HTTP_CODE_NOT_FOUND ||
          code == HTTP_CODE_BAD_REQUEST);
  } else {
    Serial.print("  Connection failed: ");
    Serial.println(http.errorToString(code));
  }

  http.end();
  return ok;
}

// ============================================
// SERVO CONTROL
// ============================================

void setServoPosition(int angle) {
  if (angle < 0)   angle = 0;
  if (angle > 180) angle = 180;

  Serial.print("  Servo -> ");
  Serial.println(angle);

  if (!servoMotor.attached()) {
    servoMotor.attach(SERVO_PIN);
    delay(100);
  }

  servoMotor.write(angle);
  delay(1000);
  servoMotor.detach();
  delay(50);
}

// ============================================
// RFID SCAN REQUEST (with 2 retries)
// ============================================

String requestScan(String uid) {
  for (int attempt = 1; attempt <= 2; attempt++) {
    HTTPClient http;
    String response = "";

    Serial.print("POST ");
    Serial.print(BASE_URL);
    Serial.println("/api/hardware/scan");

    http.begin(wifiClient, String(BASE_URL) + "/api/hardware/scan");
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(8000);

    String payload = "{\"uid\":\"" + uid + "\"}";
    Serial.print("Payload: ");
    Serial.println(payload);

    int httpCode = http.POST(payload);

    if (httpCode > 0) {
      if (httpCode == HTTP_CODE_OK) {
        response = http.getString();
        Serial.println("Response OK");
        Serial.print("Body: ");
        Serial.println(response);
        http.end();
        return response;
      } else {
        Serial.print("HTTP ");
        Serial.print(httpCode);
        Serial.print(" body: ");
        Serial.println(http.getString());
        response = "{\"error\":\"HTTP " + String(httpCode) + "\"}";
      }
    } else {
      Serial.print("Connection failed: ");
      Serial.println(http.errorToString(httpCode));
      response = "{\"error\":\"Connection Failed\"}";
    }

    http.end();

    if (attempt < 2) {
      Serial.println("Retrying in 500 ms...");
      delay(500);
    } else {
      return response;
    }
  }
  return "{\"error\":\"Unknown\"}";
}

// ============================================
// SEND SERVED DATA
// ============================================

bool sendServedData(int id, String name, String food,
                    float g, float cal, String status) {
  HTTPClient http;
  bool success = false;

  http.begin(wifiClient, String(BASE_URL) + "/api/hardware/served");
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  StaticJsonDocument<256> doc;
  doc["studentId"]      = id;
  doc["name"]           = name;
  doc["foodItem"]       = food;
  doc["gramsServed"]    = g;
  doc["caloriesServed"] = cal;
  doc["status"]         = status;

  String payload;
  serializeJson(doc, payload);
  Serial.print("Sending: ");
  Serial.println(payload);

  int httpCode = http.POST(payload);

  if (httpCode == HTTP_CODE_OK) {
    String resp = http.getString();
    Serial.print("Served response: ");
    Serial.println(resp);
    StaticJsonDocument<128> rd;
    if (!deserializeJson(rd, resp) && rd["success"].as<bool>()) success = true;
  } else if (httpCode > 0) {
    Serial.print("Served HTTP ");
    Serial.println(httpCode);
    Serial.println(http.getString());
  } else {
    Serial.print("Served conn failed: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
  return success;
}

// ============================================
// SERVE FOOD
// ============================================

void serveFood() {
  if (gateOpened) return;

  Serial.println("Opening Gate...");
  setServoPosition(SERVO_OPEN);
  gateOpened = true;

  float w = 0;
  while (w < targetGrams) {
    w += 30;
    if (w > targetGrams) w = targetGrams;
    Serial.print("Weight: ");
    Serial.print(w, 0);
    Serial.print("g / ");
    Serial.print(targetGrams, 0);
    Serial.println("g");
    delay(300);
  }

  gramsServed    = targetGrams;
  caloriesServed = calories;
  Serial.println("Target Reached!");
  delay(500);

  Serial.println("Closing Gate...");
  setServoPosition(SERVO_CLOSED);
  gateOpened = false;

  bool ok = sendServedData(studentId, studentName, foodItem,
                           gramsServed, caloriesServed, "Served");
  Serial.println(ok ? "Posted OK" : "Post FAILED");

  isServing       = false;
  promptDisplayed = false;
  cardProcessed   = false;

  Serial.println("Waiting For Next RFID");
}

// ============================================
// PROCESS CARD
// ============================================

void processCard() {
  uidString = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    char b[4];
    sprintf(b, "%02X", rfid.uid.uidByte[i]);
    uidString += String(b);
    if (i < rfid.uid.size - 1) uidString += " ";
  }
  Serial.print("UID: ");
  Serial.println(uidString);

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  String response = requestScan(uidString);

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, response)) {
    Serial.println("Invalid JSON");
    promptDisplayed = false;
    cardProcessed   = false;
    return;
  }

  if (doc.containsKey("error")) {
    Serial.print("Backend Error: ");
    Serial.println(doc["error"].as<String>());
    promptDisplayed = false;
    cardProcessed   = false;
    return;
  }

  if (doc.containsKey("studentId") && doc.containsKey("name") &&
      doc.containsKey("targetGrams") && doc.containsKey("calories") &&
      doc.containsKey("foodItem")) {

    studentId   = doc["studentId"].as<int>();
    studentName = doc["name"].as<String>();
    targetGrams = doc["targetGrams"].as<float>();
    calories    = doc["calories"].as<float>();
    foodItem    = doc["foodItem"].as<String>();

    Serial.print("Student: "); Serial.println(studentName);
    Serial.print("Food: ");    Serial.println(foodItem);
    Serial.print("Target: ");  Serial.print(targetGrams, 0); Serial.println("g");

    isServing       = true;
    promptDisplayed = false;
    gateOpened      = false;
    cardProcessed   = true;
  } else {
    Serial.println("Invalid Data Format");
    promptDisplayed = false;
    cardProcessed   = false;
  }
}

// ============================================
// SETUP
// ============================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("==============================");
  Serial.println("System Initializing...");
  Serial.println("==============================");

  // ---- RC522 ----
  SPI.begin();
  delay(100);
  rfid.PCD_Init();
  delay(50);

  byte v = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.print("RFID version: 0x");
  Serial.println(v, HEX);
  if (v == 0x00 || v == 0xFF) {
    Serial.println("ERROR: RC522 not detected — check wiring");
  } else {
    Serial.println("RC522 OK");
  }

  // ---- HX711 ----
  scale.begin(HX711_DT, HX711_SCK);
  int tries = 0;
  Serial.print("Waiting for HX711");
  while (!scale.is_ready() && tries < 10) { delay(200); Serial.print("."); tries++; }
  Serial.println();
  if (scale.is_ready()) {
    scale.set_scale(CALIBRATION_FACTOR);
    scale.tare();
    Serial.println("HX711 OK");
    scaleReady = true;
  } else {
    Serial.println("HX711 not found — DEMO MODE");
    scaleReady = false;
  }

  // ---- Servo ----
  Serial.println("Initializing Servo...");
  servoMotor.attach(SERVO_PIN);
  delay(500);
  servoMotor.write(SERVO_CLOSED);
  delay(1500);
  servoMotor.detach();
  Serial.println("Servo parked at closed");

  // ---- WiFi ----
  connectToWiFi();

  // ---- Backend health check ----
  if (!pingBackend()) {
    Serial.println("⚠️  BACKEND UNREACHABLE.");
    Serial.println("   Check: port, PC IP, firewall, hotspot network.");
    Serial.println("   Will still try cards, but expect errors.");
  } else {
    Serial.println("✓ Backend reachable.");
  }

  isServing       = false;
  promptDisplayed = false;
  gateOpened      = false;
  cardProcessed   = false;

  Serial.println("========================================");
  Serial.println("Waiting For RFID");
  Serial.println("========================================");
}

// ============================================
// LOOP
// ============================================

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost. Reconnecting...");
    connectToWiFi();
  }

  if (isServing) {
    serveFood();
    delay(20);
    return;
  }

  if (!promptDisplayed && !cardProcessed) {
    Serial.println("========================================");
    Serial.println("Waiting For RFID");
    Serial.println("========================================");
    promptDisplayed = true;
  }

  if (!rfid.PICC_IsNewCardPresent()) { delay(50); return; }
  if (!rfid.PICC_ReadCardSerial())   { delay(50); return; }

  if (!cardProcessed) {
    Serial.println("CARD DETECTED");
    processCard();
    delay(CARD_READ_DELAY);
  }
}