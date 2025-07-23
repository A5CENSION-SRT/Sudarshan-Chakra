import { useState, useEffect } from "react";
import { radarAPI } from "../services/api";
import "./RadarComponents.css";

const RadarComponents = () => {
  const [radarData, setRadarData] = useState({
    angle: 0,
    distance: 0,
    timestamp: Date.now() / 1000,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // Fetch data from MongoDB
  const fetchRadarData = async () => {
    try {
      const data = await radarAPI.getLatest();
      setRadarData({
        angle: data.angle,
        distance: data.distance,
        timestamp: data.timestamp,
      });
      setIsConnected(true);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch radar data:", err);
      setError("Failed to connect to radar system");
      setIsConnected(false);

      // Use fallback simulated data
      setRadarData((prev) => ({
        angle: Math.random() * 180,
        distance: Math.random() * 100 + 10,
        timestamp: Date.now() / 1000,
      }));
    }
  };

  useEffect(() => {
    fetchRadarData();
    const interval = setInterval(fetchRadarData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="radar-components">
      <div className="component-section microcontroller">
        <h3>MICROCONTROLLER</h3>
        <div className="component-items">
          <div className="component-item">
            <span className="component-label">ARDUINO UNO R3</span>
            <span className="component-value">₹350</span>
          </div>
          <div className="component-item description">
            <span className="component-description">
              • Acts as the central controller for all input/output operations
            </span>
          </div>
          <div className="component-item description">
            <span className="component-description">
              • Manages sensor data processing and servo motor control
            </span>
          </div>
        </div>
      </div>

      <div className="component-section ultrasonic-sensor">
        <h3>DISTANCE SENSOR</h3>
        <div className="component-items">
          <div className="component-item">
            <span className="component-label">HC-SR04 ULTRASONIC SENSOR</span>
            <span className="component-value">₹60</span>
          </div>
          <div className="component-item description">
            <span className="component-description">
              • Used for object detection and distance measurement (radar
              simulation)
            </span>
          </div>
          <div className="component-item description">
            <span className="component-description">
              • Operating range: 2cm to 400cm with ±3mm accuracy
            </span>
          </div>
        </div>
      </div>

      <div className="component-section servo-motors">
        <h3>ACTUATORS & TARGETING</h3>
        <div className="component-items">
          <div className="component-item">
            <span className="component-label">
              SG90 SERVO MOTORS (x2)
            </span>
            <span className="component-value">₹152</span>
          </div>
          <div className="component-item">
            <span className="component-label">
              650NM LASER MODULE
            </span>
            <span className="component-value">₹15</span>
          </div>
          <div className="component-item description">
            <span className="component-description">
              • Two servos: one for radar sweep, one for laser pointing
            </span>
          </div>
          <div className="component-item description">
            <span className="component-description">
              • 650nm red laser module for target indication
            </span>
          </div>
          <div className="component-item description">
            <span className="component-description">
              • 180° rotation range with precise position control
            </span>
          </div>
        </div>
      </div>

      <div className="component-section individual-costs">
        <h3>INDIVIDUAL COMPONENT COSTS</h3>
        <div className="component-items">
          <div className="component-item">
            <span className="component-label">SERVO MOTOR (EACH)</span>
            <span className="component-value">₹76</span>
          </div>
          <div className="component-item">
            <span className="component-label">ARDUINO UNO R3</span>
            <span className="component-value">₹350</span>
          </div>
          <div className="component-item">
            <span className="component-label">LASER MODULE</span>
            <span className="component-value">₹15</span>
          </div>
          <div className="component-item">
            <span className="component-label">HC-SR04 ULTRASONIC</span>
            <span className="component-value">₹60</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadarComponents;
