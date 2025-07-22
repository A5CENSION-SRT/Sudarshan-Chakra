import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import { Vector3 } from "three";
import { radarAPI } from "../services/api";
import "./RadarMap.css";

// Radar Grid Component (Half circle for 0-180 degrees)
const RadarGrid = () => {
  const lines = [];

  // Create concentric semicircles (0-180 degrees) - reduced to 45cm max range
  for (let i = 1; i <= 5; i++) {
    const radius = i * 9; // Changed from 20 to 9 (45cm / 5 rings = 9cm per ring)
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

  // Create radial lines (every 30 degrees from 0 to 180)
  for (let i = 0; i <= 6; i++) {
    const angle = (i / 6) * Math.PI; // 0 to π radians
    const points = [
      new Vector3(0, 0, 0),
      new Vector3(Math.cos(angle) * 45, 0, Math.sin(angle) * 45),
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
      <planeGeometry args={[100, 100, 25, 25]} />
      <meshStandardMaterial
        color="#001100"
        wireframe={true}
        opacity={0.3}
        transparent={true}
      />
    </mesh>
  );
};

// Target Marker
const TargetMarker = ({ angle, distance, isActive }) => {
  // Convert angle to radians and calculate position (flipped orientation)
  const angleRad = ((180 - angle) * Math.PI) / 180; // Flip the angle
  const x = Math.cos(angleRad) * distance; // Use actual distance without scaling
  const z = Math.sin(angleRad) * distance;

  return (
    <group position={[x, 2, z]}>
      <mesh>
        <cylinderGeometry args={[2, 0, 8]} />
        <meshStandardMaterial
          color={isActive ? "#ff0000" : "#ff8800"}
          emissive={isActive ? "#ff0000" : "#ff8800"}
          emissiveIntensity={0.5}
        />
      </mesh>
      <Text
        position={[0, 10, 0]}
        fontSize={4}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {`${distance.toFixed(1)}cm`}
      </Text>
    </group>
  );
};

const RadarMap = () => {
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

      // Use zero values when no data is available
      setRadarData((prev) => ({
        angle: 0,
        distance: 0,
        timestamp: Date.now() / 1000,
      }));
    }
  };

  // Fetch radar data every 10 seconds
  useEffect(() => {
    fetchRadarData();
    const interval = setInterval(fetchRadarData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="radar-map">
      <div className="radar-header">
        <h1>3D TACTICAL RADAR DISPLAY</h1>
        <div className="radar-info">
          <div className="info-item">
            <span className="info-label">TARGET BEARING:</span>
            <span className="info-value">{radarData.angle.toFixed(1)}°</span>
          </div>
          <div className="info-item">
            <span className="info-label">RANGE:</span>
            <span className="info-value">
              {radarData.distance.toFixed(1)} cm
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">STATUS:</span>
            <span
              className={`info-value ${
                isConnected ? "connected" : "disconnected"
              }`}
            >
              {isConnected ? "LIVE" : "SIM"}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="radar-error">{error} - Showing zero values</div>
      )}

      <div className="radar-canvas">
        <Canvas camera={{ position: [25, 40, 25], fov: 60 }}>
          <ambientLight intensity={0.2} />
          <pointLight position={[10, 10, 10]} intensity={0.5} color="#00ff41" />

          {/* Terrain */}
          <Terrain />

          {/* Radar Grid */}
          <RadarGrid />

          {/* Main Target Marker */}
          <TargetMarker
            angle={radarData.angle}
            distance={radarData.distance}
            isActive={true}
          />

          {/* Additional static targets for demonstration - updated for 45cm range */}
          <TargetMarker angle={60} distance={25} isActive={false} />
          <TargetMarker angle={120} distance={35} isActive={false} />

          {/* Center marker */}
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[1, 1, 2]} />
            <meshStandardMaterial
              color="#00ff41"
              emissive="#00ff41"
              emissiveIntensity={0.3}
            />
          </mesh>

          {/* Angle markers (flipped orientation) - updated for 45cm range */}
          <Text position={[-45, 5, 0]} fontSize={6} color="#00ff41">
            0°
          </Text>
          <Text position={[0, 5, 45]} fontSize={6} color="#00ff41">
            90°
          </Text>
          <Text position={[45, 5, 0]} fontSize={6} color="#00ff41">
            180°
          </Text>

          <OrbitControls enableZoom={true} enablePan={true} />
        </Canvas>
      </div>

      <div className="radar-controls">
        <div className="control-panel">
          <h3>RADAR CONTROLS</h3>
          <div className="control-grid">
            <div className="control-item">
              <span className="control-label">SCAN MODE:</span>
              <span className="control-value active">CONTINUOUS</span>
            </div>
            <div className="control-item">
              <span className="control-label">RANGE:</span>
              <span className="control-value">0-45 CM</span>
            </div>
            <div className="control-item">
              <span className="control-label">FREQUENCY:</span>
              <span className="control-value">X-BAND</span>
            </div>
            <div className="control-item">
              <span className="control-label">UPDATE RATE:</span>
              <span className="control-value">10 SEC</span>
            </div>
            <div className="control-item">
              <span className="control-label">PRECISION:</span>
              <span className="control-value">±1 CM</span>
            </div>
            <div className="control-item">
              <span className="control-label">CONNECTION:</span>
              <span
                className={`control-value ${
                  isConnected ? "active" : "inactive"
                }`}
              >
                {isConnected ? "MONGODB" : "OFFLINE"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadarMap;
