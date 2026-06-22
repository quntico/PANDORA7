const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'alpha', 'simulators', 'WM500Simulator.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace REPORT_STYLES font size
content = content.replace(
  "th: { padding: '8px 12px', fontSize: 9,",
  "th: { padding: '8px 12px', fontSize: 10.5,"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("REPORT_STYLES font size updated successfully.");
