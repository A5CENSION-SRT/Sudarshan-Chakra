import { useState, useEffect, useRef } from "react";
import {
  Target,
  Crosshair,
  Clock,
  Activity,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import { Vector3 } from "three";
import { radarAPI } from "../services/api";
import RadarComponents from "./RadarComponents";
import "./Dashboard.css";

// Radar Grid Component (Half circle for 0-180 degrees)
const RadarGrid = () => {
  const lines = [];

  // Create concentric semicircles (0-180 degrees) - scaled for 30cm max range
  for (let i = 1; i <= 5; i++) {
    const radius = i * 6; // 30cm / 5 rings = 6cm per ring
    const points = [];
    for (let j = 0; j <= 32; j++) {
      // Half the points for semicircle
      const angle = (j / 32) * Math.PI; // 0 to π radians (0 to 180 degrees)
      points.push(
        new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
      );
    }
    lines.push(
      <Line
        key={`circle-${i}`}
        points={points}
        color="#00ff41"
        lineWidth={1}
        opacity={0.3}
      />
    );
  }

  // Create radial lines (every 30 degrees from 0 to 180) - scaled for 30cm
  for (let i = 0; i <= 6; i++) {
    const angle = (i / 6) * Math.PI; // 0 to π radians
    const points = [
      new Vector3(0, 0, 0),
      new Vector3(Math.cos(angle) * 30, 0, Math.sin(angle) * 30),
    ];
    lines.push(
      <Line
        key={`radial-${i}`}
        points={points}
        color="#00ff41"
        lineWidth={1}
        opacity={0.2}
      />
    );
  }

  // Add ring markers at the diameter of each concentric circle (at 0° position - right edge)
  for (let i = 1; i <= 5; i++) {
    const radius = i * 6; // 30cm / 5 rings = 6cm per ring
    const distance = i * 6; // Actual distance in cm
    lines.push(
      <Text
        key={`ring-marker-${i}`}
        position={[radius, 2, 0]}
        fontSize={2}
        color="#00ff41"
        anchorX="center"
        anchorY="middle"
      >
        {`${distance}cm`}
      </Text>
    );
  }

  return <group>{lines}</group>;
};

// Topographic Terrain
const Terrain = () => {
  const meshRef = useRef();

  useEffect(() => {
    if (meshRef.current) {
      const geometry = meshRef.current.geometry;
      const vertices = geometry.attributes.position.array;

      // Create height variations for topographic effect
      for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        const distance = Math.sqrt(x * x + z * z);
        const height = Math.sin(distance * 0.1) * 5 + Math.cos(x * 0.05) * 3;
        vertices[i + 1] = height;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
    }
  }, []);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]}>
      <planeGeometry args={[70, 70, 20, 20]} />
      <meshStandardMaterial
        color="#001100"
        wireframe={true}
        opacity={0.3}
        transparent={true}
      />
    </mesh>
  );
};

// Statistical Marker Component for 3D radar
const StatisticalMarker = ({ distance, label, color, opacity = 0.6 }) => {
  if (distance === Infinity || distance === 0) return null;

  // Create a circular line at the specified distance
  const points = [];
  const radius = distance / 2; // Scale down for visualization

  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI; // 0 to π radians (0 to 180 degrees)
    points.push(
      new Vector3(Math.cos(angle) * radius, 1, Math.sin(angle) * radius)
    );
  }

  return (
    <group>
      <Line points={points} color={color} lineWidth={2} opacity={opacity} />
      <Text
        position={[0, 3, radius]}
        fontSize={3}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {`${label}: ${distance.toFixed(1)}cm`}
      </Text>
    </group>
  );
};

// Target Marker
const TargetMarker = ({
  angle,
  distance,
  isActive,
  opacity = 1.0,
  color = "#00ff41",
}) => {
  // Convert angle to radians and calculate position (flipped orientation)
  const angleRad = ((180 - angle) * Math.PI) / 180; // Flip the angle
  const x = Math.cos(angleRad) * distance; // Use actual distance without scaling
  const z = Math.sin(angleRad) * distance;

  return (
    <group position={[x, 2, z]}>
      <mesh>
        <cylinderGeometry args={[0.7, 0, 3]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActive ? 0.5 : 0.2}
          transparent={true}
          opacity={opacity}
        />
      </mesh>

      {/* Pulsing effect for active targets */}
      {isActive && (
        <mesh>
          <sphereGeometry args={[1.4, 16, 16]} />
          <meshStandardMaterial
            color={color}
            transparent={true}
            opacity={0.3 * opacity}
            wireframe={true}
          />
        </mesh>
      )}

      <Text
        position={[0, 8, 0]}
        fontSize={0.8}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {`${distance.toFixed(1)}cm`}
      </Text>
    </group>
  );
};

const Dashboard = () => {
  const [radarData, setRadarData] = useState({
    angle: 0,
    distance: 0,
    timestamp: Date.now() / 1000,
  });
  const [recentData, setRecentData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionStartTime] = useState(Date.now());
  const [lastRadarValue, setLastRadarValue] = useState(null); // Track last value to detect changes
  const [pingStats, setPingStats] = useState({
    sessionPings: 0,
    dailyPings: 0,
    previousRanges: [], // Only show last 5 changed values
    previousBearings: [], // Only show last 5 changed bearing values
    averageRange: 0,
    minRange: Infinity,
    maxRange: 0,
    allTimeAverage: 0,
    allTimeMin: Infinity,
    allTimeMax: 0,
  });

  // Update ping statistics with MongoDB data - only count new values
  const updatePingStats = (newDistance, newAngle, allMongoData = []) => {
    // Check if this is a new value (different from last recorded value)
    const isNewValue =
      lastRadarValue === null ||
      Math.abs(newDistance - lastRadarValue.distance) > 0.1 || // Allow small tolerance for distance
      Math.abs(newAngle - lastRadarValue.angle) > 1.0 || // Allow small tolerance for angle
      Math.abs(Date.now() / 1000 - lastRadarValue.timestamp) > 30; // Or if more than 30 seconds passed

    if (!isNewValue) {
      return; // Don't count recurring values
    }

    // Update last radar value
    setLastRadarValue({
      distance: newDistance,
      angle: newAngle,
      timestamp: Date.now() / 1000,
    });

    setPingStats((prev) => {
      const newPreviousRanges = [...prev.previousRanges, newDistance].slice(-5); // Keep only last 5 changed values
      const newPreviousBearings = [...prev.previousBearings, newAngle].slice(
        -5
      ); // Keep only last 5 changed bearing values
      const averageRange =
        newPreviousRanges.reduce((sum, range) => sum + range, 0) /
        newPreviousRanges.length;

      // Calculate all-time statistics from MongoDB
      let allTimeAverage = 0;
      let allTimeMin = Infinity;
      let allTimeMax = 0;

      if (allMongoData.length > 0) {
        const allDistances = allMongoData.map((d) => d.distance);
        allTimeAverage =
          allDistances.reduce((sum, d) => sum + d, 0) / allDistances.length;
        allTimeMin = Math.min(...allDistances);
        allTimeMax = Math.max(...allDistances);
      }

      return {
        sessionPings: prev.sessionPings + 1, // Only increment for new values
        dailyPings: prev.dailyPings + 1,
        previousRanges: newPreviousRanges, // Only last 5 changed values
        previousBearings: newPreviousBearings, // Only last 5 changed bearing values
        averageRange: averageRange,
        minRange: Math.min(prev.minRange, newDistance),
        maxRange: Math.max(prev.maxRange, newDistance),
        allTimeAverage,
        allTimeMin,
        allTimeMax,
      };
    });
  };

  // Fetch all data for statistics
  const fetchAllData = async () => {
    try {
      const response = await radarAPI.getAll(1, 500); // Get more data for statistics
      if (response.data) {
        setAllData(response.data);
        return response.data;
      }
    } catch (err) {
      console.error("Failed to fetch all radar data:", err);
    }
    return [];
  };

  // Fetch latest data from MongoDB
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

      // Fetch all data and update statistics
      const allMongoData = await fetchAllData();
      updatePingStats(data.distance, data.angle, allMongoData);
    } catch (err) {
      console.error("Failed to fetch radar data:", err);
      setError("Failed to connect to radar system");
      setIsConnected(false);

      // Use zero values when no data is available
      setRadarData((prev) => ({
        angle: 0,
        distance: 0,
        timestamp: Date.now() / 1000,
      }));
      // Don't update ping stats for zero values
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch recent data for 3D visualization
  const fetchRecentData = async () => {
    try {
      const data = await radarAPI.getRecent();
      setRecentData(data || []);
    } catch (err) {
      console.error("Failed to fetch recent radar data:", err);
      // Use empty array when no data is available
      setRecentData([]);
    }
  };

  // Check backend health
  const checkHealth = async () => {
    try {
      await radarAPI.health();
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setIsConnected(false);
      setError("Backend server unavailable");
    }
  };

  // Initialize data and set up periodic updates
  useEffect(() => {
    // Initial data fetch
    fetchRadarData();
    fetchRecentData();

    // Check health initially
    checkHealth();

    // Set up periodic updates every 10 seconds
    const dataInterval = setInterval(() => {
      fetchRadarData();
      fetchRecentData();
    }, 10000);

    // Health check every 30 seconds
    const healthInterval = setInterval(checkHealth, 30000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(healthInterval);
    };
  }, []);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getThreatLevel = (distance) => {
    if (distance < 30) return { level: "CRITICAL", color: "#ff0000" };
    if (distance < 60) return { level: "HIGH", color: "#ff8800" };
    return { level: "MODERATE", color: "#00ff41" };
  };

  // Handle clicking on previous range readings
  const handleRangeClick = (selectedRange) => {
    setRadarData((prev) => ({
      ...prev,
      distance: selectedRange,
    }));
  };

  // Handle clicking on previous bearing readings
  const handleBearingClick = (selectedBearing) => {
    setRadarData((prev) => ({
      ...prev,
      angle: selectedBearing,
    }));
  };

  const threat = getThreatLevel(parseFloat(radarData.distance));

  if (isLoading) {
    return (
      <div className="dashboard">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <h2>INITIALIZING RADAR SYSTEM...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">TACTICAL RADAR CONTROL CENTER</h1>
        <div className="system-status-header">
          <div className="connection-status">
            {isConnected ? (
              <>
                <Wifi className="status-icon online" /> 
                <span className="status-text">CONNECTED</span>
              </>
            ) : (
              <>
                <WifiOff className="status-icon offline" /> 
                <span className="status-text">DISCONNECTED</span>
              </>
            )}
          </div>
          <div className="threat-level" style={{ borderColor: threat.color }}>
            <span style={{ color: threat.color }}>
              THREAT: {threat.level}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error} - Using simulated data</span>
        </div>
      )}

      <div className="radar-cards">
        <div className="radar-card angle-card">
          <div className="card-header">
            <Crosshair className="card-icon" />
            <h3>TARGET BEARING</h3>
          </div>
          <div className="card-body">
            <div className="main-value">{radarData.angle.toFixed(1)}°</div>
            <div className="card-subtitle">Azimuth Angle (0-180°)</div>
            <div className="bearing-radar-container">
              <div className="bearing-radar">
                <div className="radar-background">
                  <div className="radar-grid">
                    {/* Create angle markers */}
                    {[0, 30, 60, 90, 120, 150, 180].map((angle) => (
                      <div
                        key={angle}
                        className="angle-marker"
                        style={{
                          transform: `rotate(${angle}deg)`,
                          left: "50%",
                          top: "50%",
                          transformOrigin: "0 0",
                        }}
                      >
                        <span
                          className="angle-label"
                          style={{ transform: `rotate(${-angle}deg)` }}
                        >
                          {angle}°
                        </span>
                      </div>
                    ))}
                  </div>
                  <div
                    className="radar-sweep-line"
                    style={{ transform: `rotate(${180 - radarData.angle}deg)` }}
                  ></div>
                  <div
                    className="target-dot"
                    style={{
                      transform: `rotate(${
                        180 - radarData.angle
                      }deg) translateX(60px)`,
                      transformOrigin: "0 0",
                    }}
                  ></div>
                  <div className="radar-center"></div>
                </div>
              </div>
              <div className="bearing-display">
                <div className="bearing-segments">
                  {[0, 30, 60, 90, 120, 150, 180].map((segmentAngle) => (
                    <div
                      key={segmentAngle}
                      className={`bearing-segment ${
                        Math.abs(radarData.angle - segmentAngle) < 15
                          ? "active"
                          : ""
                      }`}
                      style={{
                        background:
                          Math.abs(radarData.angle - segmentAngle) < 15
                            ? "#00ff41"
                            : "rgba(0, 255, 65, 0.2)",
                      }}
                    >
                      {segmentAngle}°
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Previous bearings chart */}
            {pingStats.previousBearings.length > 0 && (
              <div className="previous-bearings">
                <div className="bearings-label">Last 5 Changed Bearings:</div>
                <div className="bearings-chart">
                  {pingStats.previousBearings.map((bearing, index) => (
                    <div
                      key={index}
                      className={`bearing-bar ${
                        bearing === radarData.angle ? "selected" : ""
                      }`}
                      style={{
                        height: `${(bearing / 180) * 25}px`,
                        backgroundColor:
                          bearing === radarData.angle
                            ? "#00ff41"
                            : index === pingStats.previousBearings.length - 1
                            ? "#00ff41"
                            : "rgba(0, 255, 65, 0.5)",
                        cursor: "pointer",
                      }}
                      title={`${bearing.toFixed(1)}° - Click to display`}
                      onClick={() => handleBearingClick(bearing)}
                    >
                      <span className="bearing-value">
                        {bearing.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="card-footer">
            <Activity className="footer-icon" />
            <span>TRACKING ACTIVE</span>
          </div>
        </div>

        <div className="radar-card distance-card">
          <div className="card-header">
            <Target className="card-icon" />
            <h3>TARGET RANGE</h3>
          </div>
          <div className="card-body">
            <div className="main-value">{radarData.distance.toFixed(1)}</div>
            <div className="card-subtitle">Centimeters</div>
            <div className="distance-bar">
              <div
                className="distance-fill"
                style={{
                  width: `${Math.min(parseFloat(radarData.distance), 100)}%`,
                  backgroundColor: threat.color,
                }}
              ></div>
              <div className="distance-scale">
                <span className="scale-value">0 cm</span>
                <span className="scale-value">50 cm</span>
                <span className="scale-value">100 cm</span>
              </div>
            </div>

            {/* Previous pings statistics */}
            <div className="ping-statistics">
              <div className="stat-row">
                <span className="stat-label">AVG:</span>
                <span className="stat-value">
                  {pingStats.allTimeAverage > 0
                    ? pingStats.allTimeAverage.toFixed(1)
                    : "0.0"}{" "}
                  cm
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">MIN:</span>
                <span className="stat-value">
                  {pingStats.allTimeMin === Infinity
                    ? "0.0"
                    : pingStats.allTimeMin.toFixed(1)}{" "}
                  cm
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">MAX:</span>
                <span className="stat-value">
                  {pingStats.allTimeMax > 0
                    ? pingStats.allTimeMax.toFixed(1)
                    : "0.0"}{" "}
                  cm
                </span>
              </div>
            </div>

            {/* Previous ranges chart */}
            {pingStats.previousRanges.length > 0 && (
              <div className="previous-ranges">
                <div className="ranges-label">Last 5 Changed Values:</div>
                <div className="ranges-chart">
                  {pingStats.previousRanges.map((range, index) => (
                    <div
                      key={index}
                      className={`range-bar ${
                        range === radarData.distance ? "selected" : ""
                      }`}
                      style={{
                        height: `${(range / 100) * 40}px`,
                        backgroundColor:
                          range === radarData.distance
                            ? "#00ff41"
                            : index === pingStats.previousRanges.length - 1
                            ? "#00ff41"
                            : "rgba(0, 255, 65, 0.5)",
                        cursor: "pointer",
                      }}
                      title={`${range.toFixed(1)} cm - Click to display`}
                      onClick={() => handleRangeClick(range)}
                    >
                      <span className="range-value">{range.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="card-footer">
            <Activity className="footer-icon" />
            <span>RANGE CONFIRMED</span>
          </div>
        </div>

        <div className="radar-card timestamp-card">
          <div className="card-header">
            <Clock className="card-icon" />
            <h3>LAST PING</h3>
          </div>
          <div className="card-body">
            <div className="main-value timestamp-value">
              {formatTimestamp(radarData.timestamp)}
            </div>
            <div className="card-subtitle">System Time (Updates every 10s)</div>

            {/* Ping count statistics */}
            <div className="ping-counts">
              <div className="count-row">
                <span className="count-label">Session Pings:</span>
                <span className="count-value">{pingStats.sessionPings}</span>
              </div>
              <div className="count-row">
                <span className="count-label">Daily Pings:</span>
                <span className="count-value">{pingStats.dailyPings}</span>
              </div>
              <div className="count-row">
                <span className="count-label">Session Time:</span>
                <span className="count-value">
                  {Math.floor((Date.now() - sessionStartTime) / 60000)}m{" "}
                  {Math.floor(((Date.now() - sessionStartTime) % 60000) / 1000)}
                  s
                </span>
              </div>
            </div>

            <div className="pulse-indicator">
              <div
                className={`pulse-dot ${
                  isConnected ? "connected" : "disconnected"
                }`}
              ></div>
            </div>
          </div>
          <div className="card-footer">
            <Activity className="footer-icon" />
            <span>{isConnected ? "REAL-TIME" : "SIMULATED"}</span>
          </div>
        </div>
      </div>

      <div className="tactical-3d-display">
        <h2 className="display-title">3D TACTICAL RADAR DISPLAY</h2>
        <div className="radar-canvas-dashboard">
          <Canvas camera={{ position: [30, 35, 30], fov: 50 }}>
            <ambientLight intensity={0.3} />
            <pointLight
              position={[15, 15, 15]}
              intensity={0.7}
              color="#00ff41"
            />

            {/* Terrain */}
            <Terrain />

            {/* Radar Grid */}
            <RadarGrid />

            {/* Recent Target Markers from MongoDB (last 5 points) */}
            {recentData.map((data, index) => {
              const isNewest = index === recentData.length - 1;
              return (
                <TargetMarker
                  key={`recent-${index}`}
                  angle={data.angle}
                  distance={data.distance}
                  isActive={isNewest}
                  opacity={
                    isNewest ? 1.0 : 0.6 - (recentData.length - index - 1) * 0.1
                  }
                  color={isNewest ? "#ff0080" : "#00ff41"}
                />
              );
            })}

            {/* Main Target Marker (current/latest) */}
            <TargetMarker
              angle={radarData.angle}
              distance={radarData.distance}
              isActive={true}
              color="#ff0000"
            />

            {/* Center marker */}
            <mesh position={[0, 1, 0]}>
              <cylinderGeometry args={[1, 1, 2]} />
              <meshStandardMaterial
                color="#00ff41"
                emissive="#00ff41"
                emissiveIntensity={0.3}
              />
            </mesh>

            {/* Angle markers (flipped orientation) - scaled for 30cm range */}
            <Text position={[-30, 5, 0]} fontSize={4} color="#00ff41">
              0°
            </Text>
            <Text position={[0, 5, 30]} fontSize={4} color="#00ff41">
              90°
            </Text>
            <Text position={[30, 5, 0]} fontSize={4} color="#00ff41">
              180°
            </Text>

            <OrbitControls enableZoom={true} enablePan={true} />
          </Canvas>
        </div>
      </div>

      <div className="radar-components-section">
        <h2 className="components-title">RADAR SYSTEM COMPONENTS</h2>
        <RadarComponents />
      </div>
    </div>
  );
};

export default Dashboard;
