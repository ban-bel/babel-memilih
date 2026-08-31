const fs = require('fs');
let lines = fs.readFileSync('src/pages/admin/DashboardKakan.jsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<table className="w-full text-left text-sm">')) {
    // Only wrap the first one!
    let prev = lines[i-1] || '';
    if (!prev.includes('{mode !== MODE_PENILAIAN.MODE_2 && (')) {
      lines[i] = '            {mode !== MODE_PENILAIAN.MODE_2 && (\n' + lines[i];
      // Find matching </table>
      let openTags = 0;
      for (let j = i; j < lines.length; j++) {
        if (lines[j].includes('<table')) openTags++;
        if (lines[j].includes('</table>')) openTags--;
        if (openTags === 0) {
          lines[j] = lines[j] + '\n            )}';
          break;
        }
      }
      break; // Only do this for the FIRST table!
    }
  }
}
fs.writeFileSync('src/pages/admin/DashboardKakan.jsx', lines.join('\n'), 'utf8');
