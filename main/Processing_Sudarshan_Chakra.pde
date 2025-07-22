import processing.serial.*;
// Regular expression library is needed for smart parsing
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.io.PrintWriter; //  NEW: Required for saving to file

Serial myPort; // The serial port object

// A list to store detected points (angle, distance) for a "persistence" effect
ArrayList<PVector> detectedPoints;

// Global variables to hold the current data from Arduino
int iAngle = 90;
int iDistance = 0;

// Maximum distance the radar should display (can be same as Arduino's threshold)
final int maxDistance = 50; // In cm

PrintWriter output; //  NEW: File writer object


void setup() {
  size(1200, 700); // Screen resolution
  smooth();
  
  // --- IMPORTANT ---
  // List all available serial ports in the console. 
  // You might need to change "COM3" to the port your Arduino is on.
  // On MacOS/Linux, it will look like "/dev/tty.usbmodem...".
  printArray(Serial.list());
  String portName = "COM3"; // <<< CHANGE THIS TO YOUR ARDUINO'S PORT
  myPort = new Serial(this, portName, 9600);
  
  // Tell Processing to buffer incoming data until it sees a newline character ('\n')
  // This matches Arduino's Serial.println()
  myPort.bufferUntil('\n');

  // Initialize the list that will store detected objects
  detectedPoints = new ArrayList<PVector>();

  //  NEW: Create (or overwrite) the radar data file
  output = createWriter("radar_data.txt"); 
}

void draw() {
  // Dark background with a fade effect. This makes the detected points fade out over time.
  noStroke();
  fill(0, 10); // Black with low opacity
  rect(0, 0, width, height); 
  
  // Set the color for the static radar display
  fill(98, 245, 31); // Green color
  
  // Call the functions to draw each part of the UI
  drawRadar(); 
  drawLine();
  drawObject();
  drawText();
}

// This function is called automatically whenever a full line of data is received from the serial port
void serialEvent(Serial myPort) {
  // Read the incoming data until the newline character
  String data = myPort.readStringUntil('\n');
  
  // If the data is not null, try to parse it
  if (data != null) {
    // This is a "Regular Expression" that looks for the exact pattern
    // sent by the Arduino: "Angle: [number], Distance: [number]"
    String[] m = match(data, "Angle: (\\d+), Distance: (\\d+)");

    // If 'm' is not null, it means the pattern was successfully found
    if (m != null) {
      // m[1] contains the first number (the angle)
      // m[2] contains the second number (the distance)
      iAngle = int(m[1]);
      iDistance = int(m[2]);
      
      // If an object is detected within range, add it to our list for drawing
      if (iDistance < maxDistance && iDistance > 0) {
        // Add a new PVector(angle, distance) to our list
        detectedPoints.add(new PVector(iAngle, iDistance));

        //  NEW: Write to radar_data.txt
        output.println(iAngle + "," + iDistance);
        output.flush();
      }
    }
    // If the line was ">>> Target Detected! <<<" or something else, 'm' will be null,
    // and the code will simply ignore it and wait for the next line.
  }
}

void drawRadar() {
  pushMatrix();
  translate(width/2, height - height*0.074); // Center the radar at the bottom
  noFill();
  strokeWeight(2);
  stroke(98,245,31);
  
  float radarDiameter = width - width * 0.0625;
  arc(0, 0, radarDiameter, radarDiameter, PI, TWO_PI);
  arc(0, 0, radarDiameter * 0.75, radarDiameter * 0.75, PI, TWO_PI);
  arc(0, 0, radarDiameter * 0.5, radarDiameter * 0.5, PI, TWO_PI);
  arc(0, 0, radarDiameter * 0.25, radarDiameter * 0.25, PI, TWO_PI);
  
  line(0, 0, -radarDiameter/2, 0);
  line(0, 0, radarDiameter/2, 0);
  line(0, 0, (-radarDiameter/2) * cos(radians(30)), (-radarDiameter/2) * sin(radians(30)));
  line(0, 0, (-radarDiameter/2) * cos(radians(60)), (-radarDiameter/2) * sin(radians(60)));
  line(0, 0, (-radarDiameter/2) * cos(radians(90)), (-radarDiameter/2) * sin(radians(90)));
  line(0, 0, (-radarDiameter/2) * cos(radians(120)), (-radarDiameter/2) * sin(radians(120)));
  line(0, 0, (-radarDiameter/2) * cos(radians(150)), (-radarDiameter/2) * sin(radians(150)));
  popMatrix();
}

void drawObject() {
  pushMatrix();
  translate(width/2, height - height*0.074); // Center the radar
  stroke(255, 10, 10, 200); // Red color for objects with some transparency
  fill(255, 10, 10, 150);   // Semi-transparent red fill
  
  // Loop through all the detected points in our list
  for (int i = detectedPoints.size() - 1; i >= 0; i--) {
      PVector p = detectedPoints.get(i);
      float angle = p.x;    // The angle is stored in x
      float distance = p.y; // The distance is stored in y
      
      // Map the cm distance to pixel distance on the screen
      float radarRadius = (width - width*0.0625) / 2.0;
      float pixsDistance = map(distance, 0, maxDistance, 0, radarRadius);
      
      // Calculate the (x, y) coordinates for the detected point
      // Note: We use -sin() for y because Processing's y-axis is inverted
      float x = pixsDistance * cos(radians(angle));
      float y = -pixsDistance * sin(radians(angle));
      
      // Draw a small ellipse at the object's location
      ellipse(x, y, 10, 10);
  }
  
  // To prevent the program from slowing down, remove the oldest points
  // if the list gets too long.
  while (detectedPoints.size() > 500) {
    detectedPoints.remove(0);
  }
  
  popMatrix();
}

void drawLine() {
  pushMatrix();
  translate(width/2, height - height*0.074); // Center the radar
  strokeWeight(4);
  stroke(30, 250, 60, 150); // Green, semi-transparent line
  
  float radarRadius = (width - width*0.0625) / 2.0;
  // Draw the sweeping line based on the current angle from the Arduino
  line(0, 0, radarRadius * cos(radians(iAngle)), -radarRadius * sin(radians(iAngle)));
  popMatrix();
}

void drawText() {
  pushMatrix();
  fill(98, 245, 31);
  textSize(25);
  textAlign(LEFT);
  
  // Display the current live stats at the bottom of the screen
  text("Angle: " + iAngle + "°", 20, height - 20);
  String distanceText = (iDistance < maxDistance && iDistance > 0) ? iDistance + " cm" : "Out of Range";
  text("Distance: " + distanceText, 250, height - 20);
  
  // Display static labels for distances
  textSize(20);
  textAlign(CENTER, BOTTOM);
  float radarRadius = (width - width*0.0625) / 2.0;
  text("10cm", width/2 + radarRadius*0.25, height - 70);
  text("20cm", width/2 + radarRadius*0.50, height - 70);
  text("30cm", width/2 + radarRadius*0.75, height - 70);
  
  // Display labels for angles (simplified for clarity)
  text("90°", width/2, height - radarRadius - 20);
  text("60°", width/2 - radarRadius*0.5, height - radarRadius*0.866f - 20);
  text("120°", width/2 + radarRadius*0.5, height - radarRadius*0.866f - 20);
  text("30°", width/2 - radarRadius*0.866f, height - radarRadius*0.5 - 20);
  text("150°", width/2 + radarRadius*0.866f, height - radarRadius*0.5 - 20);
  
  popMatrix();
}
