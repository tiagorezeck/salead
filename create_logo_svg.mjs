import fs from 'fs';

const svgContent = `<svg viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="bag-clip">
      <path d="M 70 200 C 130 155, 470 155, 530 200 C 600 240, 605 380, 595 560 C 585 700, 530 770, 420 788 C 300 800, 180 800, 100 760 C 20 710, -5 540, 12 380 C 25 270, 45 220, 70 200 Z" />
    </clipPath>
  </defs>

  <!-- Top Handles (Orange) -->
  <path d="M 180 180 C 180 20, 420 20, 420 180" fill="none" stroke="#EB4A00" stroke-width="36" stroke-linecap="round" />
  <path d="M 215 180 C 215 70, 385 70, 385 180" fill="none" stroke="#EB4A00" stroke-width="22" stroke-linecap="round" />

  <!-- Bag Body clipped to outer bag contour -->
  <g clip-path="url(#bag-clip)">
    <!-- Base Orange Body -->
    <rect width="600" height="800" fill="#EB4A00" />

    <!-- Dark Charcoal Upper Left Region -->
    <path d="M 0 0 L 260 390 L 0 650 Z" fill="#2B2E33" />

    <!-- Dark Charcoal Lower Center Region -->
    <path d="M 100 800 L 570 800 L 350 490 Z" fill="#2B2E33" />

    <!-- White Arrow -->
    <path d="M 20 670 L 100 755 L 350 490 L 450 310 L 160 310 L 260 410 Z" fill="#FFFFFF" />

    <!-- White Rivets/Eyelets -->
    <circle cx="180" cy="235" r="19" fill="#FFFFFF" />
    <circle cx="425" cy="235" r="19" fill="#FFFFFF" />
  </g>
</svg>`;

fs.writeFileSync('./public/salead_icon.svg', svgContent);
console.log('SVG updated successfully');
