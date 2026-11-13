/*
 * ESP8266 Firmware - Complete System (Updated Pin Setup)
 * Pin map matching the new wiring:
 *
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
// PIN DEFINITIONS (NEW WIRING)
// ============================================

#define WIFI_SSID     "Admin-Office"
#define WIFI_PASSWORD "Drait@1982"
#define BASE_URL      "http://192.168.144.78:5001"

// RC522 — Software SPI (New Pins)
#define SS_PIN    D2      // GPIO4
#define RST_PIN   D0      // GPIO16

// HX711 — ordinary digital pins (New Pins)
#define HX711_DT  D3      // GPIO0
#define HX711_SCK D4      // GPIO2

// Servo — signal pin (New Pin)
#define SERVO_PIN D1      // GPIO5

#define SERVO_CLOSED 0
#define SERVO_OPEN   90   // Changed to 90 based on your test code

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
// SERVO CONTROL
// ============================================
// NOTE: D1 = GPIO5 is a standard PWM pin, safe for Servo.
// We detach after every move to prevent jitter and save power.
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
  delay(1000);              // give the servo time to physically move
  servoMotor.detach();      // stop PWM -> no jitter
  delay(50);
}

// ============================================
// RFID SCAN REQUEST
// ============================================

String requestScan(String uid) {
  HTTPClient http;
  String response = "";

  http.begin(wifiClient, String(BASE_URL) + "/api/hardware/scan");
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"uid\":\"" + uid + "\"}";
  Serial.print("Payload: ");
  Serial.println(payload);

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_OK) {
      response = http.getString();
      Serial.println("Response OK");
    } else {
      response = "{\"error\":\"HTTP " + String(httpCode) + "\"}";
    }
  } else {
    response = "{\"error\":\"Connection Failed\"}";
  }

  http.end();
  return response;
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
    StaticJsonDocument<128> rd;
    if (!deserializeJson(rd, resp) && rd["success"].as<bool>()) success = true;
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

  // Simulated weight ramp (demo mode)
  float w = 0;
  while (w < targetGrams) {
    w += 30;
    if (w > targetGrams) w = targetGrams;
    Serial.print("Weight: ");
    Serial.print(w, 0);
    Serial.print("g / ");
    Serial.print(targetGrams, 0);
    Serial.println("g");
    delay(50);
  }

  gramsServed    = targetGrams;
  caloriesServed = calories;
  Serial.println("Target Reached!");
  delay(50);

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
    Serial.println("ERROR: RC522 not detected — check wiring on D2/D0");
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

  // ---- Servo: park at CLOSED, then detach ----
  Serial.println("Initializing Servo...");
  servoMotor.attach(SERVO_PIN);
  delay(500);
  servoMotor.write(SERVO_CLOSED);
  delay(1500);
  servoMotor.detach();
  Serial.println("Servo parked at closed");

  // ---- WiFi ----
  connectToWiFi();

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